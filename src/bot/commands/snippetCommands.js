const { MessageFlags } = require('discord.js');
const { client } = require('../client');
const { db } = require('../db');
const { isModmailThread, isStaffMember, reactToMessage } = require('../helpers');
const { SNIPPET_CONTENT_INPUT_ID } = require('../constants');
const { buildSnippetModal } = require('../ui/snippetModal');

const SNIPPET_NAME_PATTERN = /^[a-z0-9_-]+$/i;

const handleSnippetCommand = async (interaction) => {
  if (!interaction.inGuild()) return;

  if (!isStaffMember(interaction.member)) {
    await interaction.reply({
      content: 'You are not allowed to use this command.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'add') {
    const name = interaction.options.getString('name', true).trim();

    if (!SNIPPET_NAME_PATTERN.test(name)) {
      await interaction.reply({
        content: 'Saved reply names can only contain letters, numbers, dashes and underscores.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const existing = db.getCannedResponse(name);
    await interaction.showModal(buildSnippetModal({ name, defaultContent: existing?.content }));
    return;
  }

  if (subcommand === 'remove') {
    const name = interaction.options.getString('name', true);
    const removed = db.deleteCannedResponse(name);

    await interaction.reply({
      content: removed ? `Saved reply "${removed.name}" has been deleted.` : `No saved reply named "${name}".`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (subcommand === 'list') {
    const snippets = db.listCannedResponses();
    const content = snippets.length
      ? snippets.map((snippet) => `• **${snippet.name}**`).join('\n')
      : 'No saved replies yet. Use /snippet add to create one.';

    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    return;
  }

  if (subcommand === 'send') {
    if (!interaction.channel || !isModmailThread(interaction.channel)) {
      await interaction.reply({
        content: 'This command can only be used inside a ModMail thread.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const ticket = db.getTicketByThreadId(interaction.channel.id);
    if (!ticket) {
      await interaction.reply({ content: 'No user linked to this thread.', flags: MessageFlags.Ephemeral });
      return;
    }

    const name = interaction.options.getString('name', true);
    const snippet = db.getCannedResponse(name);
    if (!snippet) {
      await interaction.reply({ content: `No saved reply named "${name}".`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (ticket.memberLeft) {
      await interaction.reply({
        content: 'This user has left the server; the message cannot be delivered.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetUser = await client.users.fetch(ticket.userId).catch(() => null);
    if (!targetUser) {
      await interaction.reply({
        content: 'Cannot DM the target user (not found).',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const staffName = interaction.member?.displayName ?? interaction.user.username;
    const content = `**${staffName}:** ${snippet.content}`;

    await interaction.reply({ content, allowedMentions: { parse: [] } });
    const sentInThread = await interaction.fetchReply();

    const sentMessage = await targetUser
      .send({ content, allowedMentions: { parse: [] } })
      .catch((error) => {
        console.error('Failed to relay saved reply to user DM:', error);
        return null;
      });

    await reactToMessage(sentInThread, Boolean(sentMessage));

    if (sentMessage) {
      await db.addRelayedMessage({
        sourceMessageId: sentInThread.id,
        sourceChannelId: sentInThread.channelId,
        relayedMessageId: sentMessage.id,
        relayedChannelId: sentMessage.channel.id,
        direction: 'thread_to_dm',
      });
      await db.touchTicketForUser(ticket.userId);
    }
  }
};

const handleSnippetAutocomplete = async (interaction) => {
  if (!isStaffMember(interaction.member)) {
    await interaction.respond([]).catch(() => null);
    return;
  }

  const focused = interaction.options.getFocused().trim().toLowerCase();
  const choices = db
    .listCannedResponses()
    .filter((snippet) => snippet.name.includes(focused))
    .slice(0, 25)
    .map((snippet) => ({ name: snippet.name, value: snippet.name }));

  await interaction.respond(choices).catch(() => null);
};

const handleSnippetModalSubmit = async (interaction, name) => {
  if (!isStaffMember(interaction.member)) {
    await interaction.reply({
      content: 'You are not allowed to use this action.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const content = interaction.fields.getTextInputValue(SNIPPET_CONTENT_INPUT_ID)?.trim();
  if (!content) {
    await interaction.reply({ content: 'Saved reply content cannot be empty.', flags: MessageFlags.Ephemeral });
    return;
  }

  const snippet = await db.upsertCannedResponse({ name, content, createdBy: interaction.user.id });

  await interaction.reply({
    content: `Saved reply "${snippet.name}" has been saved.`,
    flags: MessageFlags.Ephemeral,
  });
};

module.exports = { handleSnippetCommand, handleSnippetAutocomplete, handleSnippetModalSubmit };
