const {
  ActionRowBuilder,
  ActivityType,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  ContainerBuilder,
  GatewayIntentBits,
  MessageFlags,
  ModalBuilder,
  Partials,
  PermissionsBitField,
  SectionBuilder,
  SeparatorBuilder,
  SlashCommandBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

const { config } = require('./config');
const { createDb } = require('./db');

const db = createDb(config.dbFilePath);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User],
  allowedMentions: {
    parse: [],
    repliedUser: false,
  },
});

const AUTO_ARCHIVE_VALUES = new Set([60, 1440, 4320, 10080]);
const CLOSE_MODAL_PREFIX = 'modmail:closemodal';
const CLOSE_REASON_INPUT_ID = 'close_reason';
const STAFF_COMMAND_NAMES = new Set(['close', 'block', 'unblock', 'help']);

const safeText = (value) => (value && value.trim().length > 0 ? value : '(no text)');

const attachmentFiles = (message) => {
  if (!message.attachments?.size) return [];

  return [...message.attachments.values()].map((attachment) => ({
    attachment: attachment.url,
    name: attachment.name ?? `file-${attachment.id}`,
  }));
};

const isStaffMember = (member) => {
  if (!member) return false;

  if (config.staffRoleId) {
    if (member.roles?.cache?.has) {
      return member.roles.cache.has(config.staffRoleId);
    }

    if (Array.isArray(member.roles)) {
      return member.roles.includes(config.staffRoleId);
    }
  }

  if (member.permissions?.has) {
    return member.permissions.has(PermissionsBitField.Flags.ManageMessages);
  }

  if (typeof member.permissions === 'string') {
    return new PermissionsBitField(BigInt(member.permissions)).has(
      PermissionsBitField.Flags.ManageMessages,
    );
  }

  return false;
};

const isModmailThread = (channel) => {
  return channel?.isThread?.() && channel.parentId === config.threadsChannelId;
};

const buildThreadName = (user) => {
  const base = `modmail-${user.username}`
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/--+/g, '-')
    .slice(0, 70);

  return `${base || 'modmail-user'}-${user.id.slice(-6)}`;
};

const buildControlPanelMessage = ({ user, blocked }) => {
  const closeButton = new ButtonBuilder()
    .setCustomId(`modmail:close:${user.id}`)
    .setLabel('Close ticket')
    .setStyle(ButtonStyle.Danger);

  const blockButton = new ButtonBuilder()
    .setCustomId(`modmail:block:${user.id}`)
    .setLabel(blocked ? 'User blocked' : 'Block user')
    .setStyle(blocked ? ButtonStyle.Secondary : ButtonStyle.Danger)
    .setDisabled(blocked);

  const unblockButton = new ButtonBuilder()
    .setCustomId(`modmail:unblock:${user.id}`)
    .setLabel(blocked ? 'Unblock user' : 'User not blocked')
    .setStyle(ButtonStyle.Success)
    .setDisabled(!blocked);

  const container = new ContainerBuilder()
    .setAccentColor(0x5865f2)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ModMail Ticket\nUser: <@${user.id}>\nID: \`${user.id}\``),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Close this ticket.'))
        .setButtonAccessory(closeButton),
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Block incoming DMs from this user.'))
        .setButtonAccessory(blockButton),
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Allow incoming DMs again.'))
        .setButtonAccessory(unblockButton),
    );

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  };
};

const getModmailParentChannel = async () => {
  const channel = await client.channels.fetch(config.threadsChannelId);

  if (!channel || channel.type !== ChannelType.GuildText) {
    throw new Error('MODMAIL_THREADS_CHANNEL_ID must target a guild text channel.');
  }

  return channel;
};

const sendStaffControlPanel = async ({ thread, user }) => {
  const blocked = db.isBlocked(user.id);
  await thread.send(buildControlPanelMessage({ user, blocked }));
};

const sendTicketAnnouncement = async ({ parentChannel, user }) => {
  const mentionPrefix = config.staffRoleId ? `<@&${config.staffRoleId}> ` : '';

  return parentChannel.send({
    content: `${mentionPrefix}New ModMail ticket from **${user.tag}** (\`${user.id}\`).`,
    allowedMentions: config.staffRoleId ? { roles: [config.staffRoleId] } : { parse: [] },
  });
};

const buildCloseReasonModal = ({ userId, threadId }) => {
  const reasonInput = new TextInputBuilder()
    .setCustomId(CLOSE_REASON_INPUT_ID)
    .setLabel('Close reason')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000)
    .setPlaceholder('Reason shown to the user');

  const modal = new ModalBuilder()
    .setCustomId(`${CLOSE_MODAL_PREFIX}:${userId}:${threadId}`)
    .setTitle('Close ModMail Ticket')
    .addComponents(new ActionRowBuilder().addComponents(reasonInput));

  return modal;
};

const buildSlashCommands = () => [
  new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close the current ModMail ticket')
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Reason shown to the user')
        .setRequired(false)
        .setMaxLength(1000),
    ),
  new SlashCommandBuilder()
    .setName('block')
    .setDescription('Block the ticket user from sending ModMail')
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Optional block reason')
        .setRequired(false)
        .setMaxLength(1000),
    ),
  new SlashCommandBuilder()
    .setName('unblock')
    .setDescription('Unblock the ticket user for ModMail'),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available ModMail slash commands'),
].map((command) => command.toJSON());

const registerSlashCommands = async (guild) => {
  await guild.commands.set(buildSlashCommands());
};

const ensureThreadForUser = async (user) => {
  const ticket = db.getTicketByUserId(user.id);

  if (ticket) {
    try {
      const thread = await client.channels.fetch(ticket.threadId);
      if (thread?.isThread?.()) {
        return thread;
      }
    } catch {
      // Missing thread: create a new one below.
    }
  }

  const parentChannel = await getModmailParentChannel();
  const requestedAutoArchive = AUTO_ARCHIVE_VALUES.has(config.threadAutoArchiveMinutes)
    ? config.threadAutoArchiveMinutes
    : 1440;

  const announcementMessage = await sendTicketAnnouncement({ parentChannel, user });

  let thread;
  try {
    thread = await parentChannel.threads.create({
      name: buildThreadName(user),
      startMessage: announcementMessage.id,
      autoArchiveDuration: requestedAutoArchive,
      reason: `ModMail ticket opened for ${user.tag} (${user.id})`,
    });
  } catch (error) {
    console.error('Public thread creation failed, fallback to private thread:', error);

    thread = await parentChannel.threads.create({
      name: buildThreadName(user),
      type: ChannelType.PrivateThread,
      invitable: false,
      autoArchiveDuration: requestedAutoArchive,
      reason: `ModMail ticket opened for ${user.tag} (${user.id})`,
    });
  }

  await db.upsertTicket({
    userId: user.id,
    threadId: thread.id,
    guildId: config.guildId,
  });

  await sendStaffControlPanel({ thread, user });

  return thread;
};

const closeTicket = async ({ thread, closedBy, reason = 'No reason provided.' }) => {
  if (!isModmailThread(thread)) return false;

  const userId = db.getUserIdByThreadId(thread.id);
  if (!userId) {
    await thread.send('No active ticket mapping found for this thread.').catch(() => null);
    return false;
  }

  const user = await client.users.fetch(userId).catch(() => null);

  if (user) {
    await user
      .send(`Your ModMail ticket has been closed.\nReason: ${reason}`)
      .catch(() => null);
  }

  await db.closeTicketByThreadId({
    threadId: thread.id,
    closedBy,
  });

  await thread.send(`Ticket closed by <@${closedBy}>.\nReason: ${reason}`).catch(() => null);

  await thread.setArchived(true, `Closed by ${closedBy}`).catch(() => null);
  await thread.setLocked(true, `Closed by ${closedBy}`).catch(() => null);

  return true;
};

const handleDmMessage = async (message) => {
  if (db.isBlocked(message.author.id)) {
    await message.author
      .send('You are currently blocked from this ModMail. Contact staff another way if needed.')
      .catch(() => null);
    return;
  }

  const thread = await ensureThreadForUser(message.author);
  await db.touchTicketForUser(message.author.id);

  const files = attachmentFiles(message);
  const content = safeText(message.content);

  await thread.send({
    content: `**From ${message.author.tag}** (${message.author.id})\n${content}`,
    files,
    allowedMentions: { parse: [] },
  });

  if (!db.getTicketByUserId(message.author.id)?.welcomed) {
    await message.author
      .send('Your message has been sent to the staff team. We will reply here soon.')
      .catch(() => null);

    const ticket = db.getTicketByUserId(message.author.id);
    if (ticket) {
      ticket.welcomed = true;
      await db.upsertTicket({
        userId: message.author.id,
        threadId: ticket.threadId,
        guildId: ticket.guildId,
      });
    }
  }
};

const handleStaffThreadMessage = async (message) => {
  if (!isModmailThread(message.channel)) return;
  if (!isStaffMember(message.member)) return;

  const userId = db.getUserIdByThreadId(message.channel.id);
  if (!userId) return;

  const targetUser = await client.users.fetch(userId).catch(() => null);
  if (!targetUser) {
    await message.reply('Cannot DM the target user (not found).');
    return;
  }

  const files = attachmentFiles(message);
  const hasText = message.content && message.content.trim().length > 0;
  const content = hasText ? `**Staff:** ${message.content.trim()}` : '**Staff sent an attachment.**';

  await targetUser.send({
    content,
    files,
    allowedMentions: { parse: [] },
  });

  await db.touchTicketForUser(userId);
};

const handleStaffSlashCommand = async (interaction) => {
  if (!interaction.inGuild()) return;
  if (!STAFF_COMMAND_NAMES.has(interaction.commandName)) return;

  if (!interaction.channel || !isModmailThread(interaction.channel)) {
    await interaction.reply({
      content: 'This command can only be used inside a ModMail thread.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!isStaffMember(interaction.member)) {
    await interaction.reply({
      content: 'You are not allowed to use this command.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (interaction.commandName === 'help') {
    await interaction.reply({
      content: ['/close [reason]', '/block [reason]', '/unblock', '/help'].join('\n'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const userId = db.getUserIdByThreadId(interaction.channel.id);
  if (!userId) {
    await interaction.reply({
      content: 'No user linked to this thread.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (interaction.commandName === 'close') {
    const reason = interaction.options.getString('reason')?.trim() || 'Closed by staff command.';

    const closed = await closeTicket({
      thread: interaction.channel,
      closedBy: interaction.user.id,
      reason,
    });

    await interaction.reply({
      content: closed ? `Ticket closed for user ${userId}.` : 'Unable to close ticket.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  if (interaction.commandName === 'block') {
    await db.blockUser({
      userId,
      blockedBy: interaction.user.id,
      reason: interaction.options.getString('reason')?.trim() || null,
    });

    const user = await client.users.fetch(userId).catch(() => null);
    if (user) {
      await sendStaffControlPanel({ thread: interaction.channel, user });
    }

    await interaction.editReply({
      content: `User ${userId} has been blocked.`,
    });
    return;
  }

  if (interaction.commandName === 'unblock') {
    await db.unblockUser(userId);

    const user = await client.users.fetch(userId).catch(() => null);
    if (user) {
      await sendStaffControlPanel({ thread: interaction.channel, user });
    }

    await interaction.editReply({
      content: `User ${userId} has been unblocked.`,
    });
  }
};

client.once('ready', async () => {
  await db.load();

  const guild = await client.guilds.fetch(config.guildId).catch(() => null);
  if (!guild) {
    throw new Error('MODMAIL_GUILD_ID is invalid or bot is not in that guild.');
  }

  await getModmailParentChannel();
  await registerSlashCommands(guild);
  if (config.botActivityPlaying && client.user) {
    client.user.setActivity(config.botActivityPlaying, {
      type: ActivityType.Playing,
    });
  }

  console.log(`Logged in as ${client.user.tag}`);
  console.log(`ModMail guild: ${guild.name} (${guild.id})`);
  console.log(`JSON DB: ${db.dbPath}`);
  console.log('Slash commands registered: /close, /block, /unblock, /help');
  if (config.botActivityPlaying) {
    console.log(`Bot activity: Playing ${config.botActivityPlaying}`);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  try {
    if (!message.guild && message.channel.type === ChannelType.DM) {
      await handleDmMessage(message);
      return;
    }

    if (message.guild && isModmailThread(message.channel)) {
      await handleStaffThreadMessage(message);
      return;
    }
  } catch (error) {
    console.error('messageCreate handler error:', error);
    if (message.channel?.isDMBased?.()) {
      await message.author
        .send('An internal error occurred while handling your message. Please try again later.')
        .catch(() => null);
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await handleStaffSlashCommand(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('modmail:')) {
      if (!interaction.channel || !isModmailThread(interaction.channel)) return;

      if (!isStaffMember(interaction.member)) {
        await interaction
          .reply({
            content: 'You are not allowed to use this action.',
            flags: MessageFlags.Ephemeral,
          })
          .catch(() => null);
        return;
      }

      const [, action, userId] = interaction.customId.split(':');

      if (action === 'close') {
        const modal = buildCloseReasonModal({
          userId,
          threadId: interaction.channel.id,
        });
        await interaction.showModal(modal);
        return;
      }

      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });

      if (action === 'block') {
        await db.blockUser({
          userId,
          blockedBy: interaction.user.id,
        });

        const user = await client.users.fetch(userId).catch(() => null);
        if (user) {
          await sendStaffControlPanel({ thread: interaction.channel, user });
        }

        await interaction.editReply({
          content: `User ${userId} has been blocked.`,
        });
        return;
      }

      if (action === 'unblock') {
        await db.unblockUser(userId);

        const user = await client.users.fetch(userId).catch(() => null);
        if (user) {
          await sendStaffControlPanel({ thread: interaction.channel, user });
        }

        await interaction.editReply({
          content: `User ${userId} has been unblocked.`,
        });
        return;
      }
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith(`${CLOSE_MODAL_PREFIX}:`)) {
      if (!interaction.channel || !isModmailThread(interaction.channel)) return;

      if (!isStaffMember(interaction.member)) {
        await interaction
          .reply({
            content: 'You are not allowed to use this action.',
            flags: MessageFlags.Ephemeral,
          })
          .catch(() => null);
        return;
      }

      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });

      const [, , userId, expectedThreadId] = interaction.customId.split(':');
      if (interaction.channel.id !== expectedThreadId) {
        await interaction.editReply({
          content: 'This close action does not match the current thread.',
        });
        return;
      }

      const reasonInput = interaction.fields.getTextInputValue(CLOSE_REASON_INPUT_ID)?.trim();
      const reason = reasonInput && reasonInput.length > 0 ? reasonInput : 'No reason provided.';

      const closed = await closeTicket({
        thread: interaction.channel,
        closedBy: interaction.user.id,
        reason,
      });

      await interaction.editReply({
        content: closed ? `Ticket closed for user ${userId}.` : 'Unable to close ticket.',
      });
      return;
    }
  } catch (error) {
    console.error('interactionCreate handler error:', error);
    if (interaction.deferred || interaction.replied) {
      await interaction
        .followUp({
          content: 'An error occurred while processing this action.',
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => null);
      return;
    }

    await interaction
      .reply({
        content: 'An error occurred while processing this action.',
        flags: MessageFlags.Ephemeral,
      })
      .catch(() => null);
  }
});

client.on('error', (error) => {
  console.error('Discord client error:', error);
});

client.login(config.token);
