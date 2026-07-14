const {
  ActionRowBuilder,
  ActivityType,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  ContainerBuilder,
  Events,
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
const { randomUUID } = require('node:crypto');

const { config } = require('./config');
const { createDb } = require('./db');

const db = createDb(config.dbFilePath, {
  legacyJsonFilePath: config.legacyJsonFilePath,
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageTyping,
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
const CONFIG_TICKET_COMMAND_NAME = 'config-ticket';
const TICKET_CONFIG_MODAL_PREFIX = 'modmail:ticketconfig';
const TICKET_OPEN_BUTTON_PREFIX = 'modmail:ticketopen';
const TICKET_REASON_MODAL_PREFIX = 'modmail:ticketreason';
const TICKET_CONFIG_INPUT_IDS = {
  title: 'ticket_title',
  description: 'ticket_description',
  buttonText: 'ticket_button_text',
  dmMessage: 'ticket_dm_message',
  dmClosedMessage: 'ticket_dm_closed_message',
};
const TICKET_REASON_INPUT_ID = 'ticket_reason';
const CONFIRM_PREFIX = 'modmail:confirm';
const SPAM_THRESHOLD = 3;

// userId -> { confirmMessage: Message, originalContent: string, originalFiles: Array, spamCount: number }
const pendingConfirmations = new Map();

const safeText = (value) => (value && value.trim().length > 0 ? value : '(no text)');

const reactToMessage = async (message, success) => {
  const emoji = success ? config.reactionSuccessEmoji : config.reactionFailureEmoji;
  if (!emoji) return;
  await message.react(emoji).catch(() => null);
};

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

const isAdministrator = (member) => {
  if (!member) return false;

  if (member.permissions?.has) {
    return member.permissions.has(PermissionsBitField.Flags.Administrator);
  }

  if (typeof member.permissions === 'string') {
    return new PermissionsBitField(BigInt(member.permissions)).has(
      PermissionsBitField.Flags.Administrator,
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

const buildConfirmMessage = (userId) => {
  const yesButton = new ButtonBuilder()
    .setCustomId(`${CONFIRM_PREFIX}:yes:${userId}`)
    .setLabel('Yes')
    .setStyle(ButtonStyle.Success);

  const noButton = new ButtonBuilder()
    .setCustomId(`${CONFIRM_PREFIX}:no:${userId}`)
    .setLabel('No')
    .setStyle(ButtonStyle.Danger);

  return {
    content: 'Do you want to create a ticket with the staff team?',
    components: [new ActionRowBuilder().addComponents(yesButton, noButton)],
  };
};

const sendSpamIgnoreLog = async (user) => {
  if (!config.logsIgnoredMpUserChannelId) return;
  const channel = await client.channels.fetch(config.logsIgnoredMpUserChannelId).catch(() => null);
  if (!channel) return;
  await channel
    .send({
      content: `User **${user.tag}** (\`${user.id}\`) has been auto-ignored: sent ${SPAM_THRESHOLD + 1} DMs without responding to the ticket confirmation.`,
      allowedMentions: { parse: [] },
    })
    .catch(() => null);
};

const handleConfirmationButton = async (interaction) => {
  const parts = interaction.customId.split(':');
  const action = parts[2];
  const userId = parts[3];

  if (interaction.user.id !== userId) {
    await interaction
      .reply({ content: 'This confirmation does not belong to you.', flags: MessageFlags.Ephemeral })
      .catch(() => null);
    return;
  }

  const pending = pendingConfirmations.get(userId);

  if (!pending) {
    await interaction.update({ content: 'This confirmation is no longer valid.', components: [] }).catch(() => null);
    return;
  }

  if (action === 'no') {
    pendingConfirmations.delete(userId);
    await interaction.update({ content: 'Ticket creation cancelled.', components: [] }).catch(() => null);
    return;
  }

  if (action === 'yes') {
    if (db.isBlocked(userId) || db.isSpamIgnored(userId)) {
      pendingConfirmations.delete(userId);
      await interaction
        .update({ content: 'You cannot create a ticket at this time.', components: [] })
        .catch(() => null);
      return;
    }

    pendingConfirmations.delete(userId);
    await interaction.deferUpdate().catch(() => null);

    const user = interaction.user;
    const thread = await ensureThreadForUser(user);
    await db.touchTicketForUser(user.id);

    const ticket = db.getTicketByUserId(user.id);
    if (ticket && !ticket.welcomed) {
      await db.markTicketWelcomed(user.id);
    }

    await thread.send({
      content: `**From ${user.tag}** (${user.id})\n${safeText(pending.originalContent)}`,
      files: pending.originalFiles,
      allowedMentions: { parse: [] },
    });

    await interaction
      .editReply({ content: 'Your message has been sent to the staff team. We will reply here soon.', components: [] })
      .catch(() => null);
  }
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

const buildTicketConfigModal = ({ panelId, channelId }) => {
  const titleInput = new TextInputBuilder()
    .setCustomId(TICKET_CONFIG_INPUT_IDS.title)
    .setLabel('Panel title')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder('Open a support ticket');

  const descriptionInput = new TextInputBuilder()
    .setCustomId(TICKET_CONFIG_INPUT_IDS.description)
    .setLabel('Panel description')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1800)
    .setPlaceholder('Click the button below to contact support.');

  const buttonTextInput = new TextInputBuilder()
    .setCustomId(TICKET_CONFIG_INPUT_IDS.buttonText)
    .setLabel('Button text')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(80)
    .setPlaceholder('Open ticket');

  const dmMessageInput = new TextInputBuilder()
    .setCustomId(TICKET_CONFIG_INPUT_IDS.dmMessage)
    .setLabel('DM message after ticket opens')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1800)
    .setPlaceholder('Your ticket is open. To talk with support, send your messages here.');

  const dmClosedMessageInput = new TextInputBuilder()
    .setCustomId(TICKET_CONFIG_INPUT_IDS.dmClosedMessage)
    .setLabel('Message when DMs are closed')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1800)
    .setPlaceholder('Vos messages privés sont fermés.');

  return new ModalBuilder()
    .setCustomId(`${TICKET_CONFIG_MODAL_PREFIX}:${panelId}:${channelId}`)
    .setTitle('Configure ticket panel')
    .addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descriptionInput),
      new ActionRowBuilder().addComponents(buttonTextInput),
      new ActionRowBuilder().addComponents(dmMessageInput),
      new ActionRowBuilder().addComponents(dmClosedMessageInput),
    );
};

const buildTicketPanelMessage = ({ panelId, title, description, buttonText }) => {
  const openButton = new ButtonBuilder()
    .setCustomId(`${TICKET_OPEN_BUTTON_PREFIX}:${panelId}`)
    .setLabel(buttonText)
    .setStyle(ButtonStyle.Success);

  return {
    content: `## ${title}\n${description}`,
    components: [new ActionRowBuilder().addComponents(openButton)],
    allowedMentions: { parse: [] },
  };
};

const buildTicketReasonModal = (panelId) => {
  const reasonInput = new TextInputBuilder()
    .setCustomId(TICKET_REASON_INPUT_ID)
    .setLabel('Ticket reason')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000)
    .setPlaceholder('Explain why you are opening this ticket.');

  return new ModalBuilder()
    .setCustomId(`${TICKET_REASON_MODAL_PREFIX}:${panelId}`)
    .setTitle('Open a support ticket')
    .addComponents(new ActionRowBuilder().addComponents(reasonInput));
};

const buildSlashCommands = () => [
  new SlashCommandBuilder()
    .setName(CONFIG_TICKET_COMMAND_NAME)
    .setDescription('Configure and send a ticket opening panel')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('Channel where the ticket panel will be sent')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    ),
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
  const { author } = message;

  if (db.isSpamIgnored(author.id)) return;

  if (db.isBlocked(author.id)) {
    await author
      .send('You are currently blocked from this ModMail. Contact staff another way if needed.')
      .catch(() => null);
    return;
  }

  // If a ticket is already open, forward the message directly without confirmation.
  if (db.getTicketByUserId(author.id)) {
    const thread = await ensureThreadForUser(author);
    await db.touchTicketForUser(author.id);

    const relayed = await thread
      .send({
        content: `**From ${author.tag}** (${author.id})\n${safeText(message.content)}`,
        files: attachmentFiles(message),
        allowedMentions: { parse: [] },
      })
      .then(() => true)
      .catch((error) => {
        console.error('Failed to relay DM message to thread:', error);
        return false;
      });

    await reactToMessage(message, relayed);

    if (relayed && !db.getTicketByUserId(author.id)?.welcomed) {
      await author
        .send('Your message has been sent to the staff team. We will reply here soon.')
        .catch(() => null);

      const ticket = db.getTicketByUserId(author.id);
      if (ticket) {
        await db.markTicketWelcomed(author.id);
      }
    }

    return;
  }

  // No open ticket: go through the confirmation flow.
  const pending = pendingConfirmations.get(author.id);

  if (pending) {
    pending.spamCount++;

    if (pending.spamCount >= SPAM_THRESHOLD) {
      pendingConfirmations.delete(author.id);
      await db.addSpamIgnoredUser(author.id);
      await sendSpamIgnoreLog(author);
      await pending.confirmMessage
        .edit({ content: 'You have been ignored for sending too many messages without responding.', components: [] })
        .catch(() => null);
    }

    return;
  }

  const confirmMessage = await author.send(buildConfirmMessage(author.id)).catch(() => null);
  if (!confirmMessage) return;

  pendingConfirmations.set(author.id, {
    confirmMessage,
    originalContent: message.content,
    originalFiles: attachmentFiles(message),
    spamCount: 0,
  });
};

const handleStaffThreadMessage = async (message) => {
  if (!isModmailThread(message.channel)) return;
  if (!isStaffMember(message.member)) return;

  const userId = db.getUserIdByThreadId(message.channel.id);
  if (!userId) return;

  const targetUser = await client.users.fetch(userId).catch(() => null);
  if (!targetUser) {
    await message.reply('Cannot DM the target user (not found).');
    await reactToMessage(message, false);
    return;
  }

  const staffName = message.member?.displayName ?? message.author.username;
  const files = attachmentFiles(message);
  const hasText = message.content && message.content.trim().length > 0;
  const content = hasText
    ? `**${staffName}:** ${message.content.trim()}`
    : `**${staffName} sent an attachment.**`;

  const sent = await targetUser
    .send({ content, files, allowedMentions: { parse: [] } })
    .then(() => true)
    .catch((error) => {
      console.error('Failed to relay staff message to user DM:', error);
      return false;
    });

  await reactToMessage(message, sent);

  if (sent) {
    await db.touchTicketForUser(userId);
  }
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

const handleTicketConfigCommand = async (interaction) => {
  if (!interaction.inGuild()) return;

  if (!isAdministrator(interaction.member)) {
    await interaction.reply({
      content: 'You need the Administrator permission to use this command.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const targetChannel = interaction.options.getChannel('channel', true);

  if (
    targetChannel.guildId !== interaction.guildId ||
    !targetChannel.isTextBased?.() ||
    typeof targetChannel.send !== 'function'
  ) {
    await interaction.reply({
      content: 'I could not use that channel as a ticket panel channel.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.showModal(buildTicketConfigModal({
    panelId: randomUUID(),
    channelId: targetChannel.id,
  }));
};

const handleTicketConfigModalSubmit = async (interaction) => {
  if (!interaction.inGuild()) return;

  if (!isAdministrator(interaction.member)) {
    await interaction.reply({
      content: 'You need the Administrator permission to use this action.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  const [, , panelId, channelId] = interaction.customId.split(':');
  const title = interaction.fields.getTextInputValue(TICKET_CONFIG_INPUT_IDS.title).trim();
  const description = interaction.fields.getTextInputValue(TICKET_CONFIG_INPUT_IDS.description).trim();
  const buttonText = interaction.fields.getTextInputValue(TICKET_CONFIG_INPUT_IDS.buttonText).trim();
  const dmMessage = interaction.fields.getTextInputValue(TICKET_CONFIG_INPUT_IDS.dmMessage).trim();
  const dmClosedMessage = interaction.fields.getTextInputValue(TICKET_CONFIG_INPUT_IDS.dmClosedMessage).trim();

  const targetChannel = await client.channels.fetch(channelId).catch(() => null);

  if (
    !targetChannel ||
    targetChannel.guildId !== interaction.guildId ||
    !targetChannel.isTextBased?.() ||
    typeof targetChannel.send !== 'function'
  ) {
    await interaction.editReply({
      content: 'I could not find a text channel from this server with that value.',
    });
    return;
  }

  let panelMessage;
  try {
    panelMessage = await targetChannel.send(
      buildTicketPanelMessage({
        panelId,
        title,
        description,
        buttonText,
      }),
    );
  } catch {
    await interaction.editReply({
      content: `I could not send the ticket panel in <#${targetChannel.id}>. Check my permissions in that channel.`,
    });
    return;
  }

  await db.upsertTicketPanel({
    panelId,
    channelId: targetChannel.id,
    messageId: panelMessage.id,
    title,
    description,
    buttonText,
    dmMessage,
    dmClosedMessage,
  });

  await interaction.editReply({
    content: `Ticket panel sent in <#${targetChannel.id}>.`,
  });
};

const handleTicketOpenButton = async (interaction) => {
  const [, , panelId] = interaction.customId.split(':');
  const panel = db.getTicketPanel(panelId);

  if (!panel) {
    await interaction.reply({
      content: 'This ticket panel is no longer configured.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (db.isBlocked(interaction.user.id) || db.isSpamIgnored(interaction.user.id)) {
    await interaction.reply({
      content: 'You cannot create a ticket at this time.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.showModal(buildTicketReasonModal(panelId));
};

const handleTicketReasonModalSubmit = async (interaction) => {
  if (!interaction.inGuild()) return;

  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  const [, , panelId] = interaction.customId.split(':');
  const panel = db.getTicketPanel(panelId);

  if (!panel) {
    await interaction.editReply({
      content: 'This ticket panel is no longer configured.',
    });
    return;
  }

  if (db.isBlocked(interaction.user.id) || db.isSpamIgnored(interaction.user.id)) {
    await interaction.editReply({
      content: 'You cannot create a ticket at this time.',
    });
    return;
  }

  const reason = interaction.fields.getTextInputValue(TICKET_REASON_INPUT_ID).trim();
  const thread = await ensureThreadForUser(interaction.user);
  await db.touchTicketForUser(interaction.user.id);

  const ticket = db.getTicketByUserId(interaction.user.id);
  if (ticket) {
    await db.markTicketWelcomed(interaction.user.id);
  }

  await thread.send({
    content: `**Ticket opened from panel**\nUser: <@${interaction.user.id}> (\`${interaction.user.id}\`)\nReason: ${safeText(reason)}`,
    allowedMentions: { parse: [] },
  });

  const dmSent = await interaction.user
    .send({
      content: panel.dmMessage,
      allowedMentions: { parse: [] },
    })
    .then(() => true)
    .catch(() => false);

  await interaction.editReply({
    content: dmSent
      ? 'Your ticket has been opened. Check your DMs to talk with support.'
      : panel.dmClosedMessage,
  });
};

client.once(Events.ClientReady, async () => {
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
  console.log(`SQLite DB: ${db.dbPath}`);
  console.log('Slash commands registered: /config-ticket, /close, /block, /unblock, /help');
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

client.on(Events.TypingStart, async (typing) => {
  try {
    if (typing.user.bot) return;

    if (!typing.inGuild()) {
      const ticket = db.getTicketByUserId(typing.user.id);
      if (!ticket) return;

      const thread = await client.channels.fetch(ticket.threadId).catch(() => null);
      if (!thread || !isModmailThread(thread)) return;

      await thread.sendTyping().catch(() => null);
      return;
    }

    if (!isModmailThread(typing.channel) || !isStaffMember(typing.member)) return;

    const userId = db.getUserIdByThreadId(typing.channel.id);
    if (!userId) return;

    const targetUser = await client.users.fetch(userId).catch(() => null);
    if (!targetUser) return;

    const dmChannel = await targetUser.createDM().catch(() => null);
    if (!dmChannel) return;

    await dmChannel.sendTyping().catch(() => null);
  } catch (error) {
    console.error('typingStart handler error:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === CONFIG_TICKET_COMMAND_NAME) {
        await handleTicketConfigCommand(interaction);
        return;
      }

      await handleStaffSlashCommand(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith(`${CONFIRM_PREFIX}:`)) {
      await handleConfirmationButton(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith(`${TICKET_OPEN_BUTTON_PREFIX}:`)) {
      await handleTicketOpenButton(interaction);
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

    if (interaction.isModalSubmit() && interaction.customId.startsWith(`${TICKET_CONFIG_MODAL_PREFIX}:`)) {
      await handleTicketConfigModalSubmit(interaction);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith(`${TICKET_REASON_MODAL_PREFIX}:`)) {
      await handleTicketReasonModalSubmit(interaction);
      return;
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
