const { MessageFlags } = require('discord.js');
const { client } = require('../client');
const { db } = require('../db');
const { STAFF_COMMAND_NAMES } = require('../constants');
const { isModmailThread, isStaffMember } = require('../helpers');
const { closeTicket } = require('../tickets/closeTicket');
const { sendStaffControlPanel } = require('../tickets/threadManager');

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

module.exports = { handleStaffSlashCommand };
