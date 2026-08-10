const { MessageFlags } = require('discord.js');
const { client } = require('../client');
const { db } = require('../db');
const { CONFIRM_PREFIX, TICKET_OPEN_BUTTON_PREFIX } = require('../constants');
const { isModmailThread, isStaffMember } = require('../helpers');
const { handleConfirmationButton } = require('../handlers/confirmationButton');
const { handleTicketOpenButton } = require('../commands/ticketOpenFlow');
const { sendStaffControlPanel } = require('../tickets/threadManager');
const { buildCloseReasonModal } = require('../ui/closeModal');

// Returns true once the interaction has been fully handled (including "silently ignored").
const routeButtonInteraction = async (interaction) => {
  if (interaction.customId.startsWith(`${CONFIRM_PREFIX}:`)) {
    await handleConfirmationButton(interaction);
    return true;
  }

  if (interaction.customId.startsWith(`${TICKET_OPEN_BUTTON_PREFIX}:`)) {
    await handleTicketOpenButton(interaction);
    return true;
  }

  if (!interaction.customId.startsWith('modmail:')) return false;

  if (!interaction.channel || !isModmailThread(interaction.channel)) return true;

  if (!isStaffMember(interaction.member)) {
    await interaction
      .reply({ content: 'You are not allowed to use this action.', flags: MessageFlags.Ephemeral })
      .catch(() => null);
    return true;
  }

  const [, action, userId] = interaction.customId.split(':');

  if (action === 'close') {
    await interaction.showModal(buildCloseReasonModal({ userId, threadId: interaction.channel.id }));
    return true;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (action === 'block') {
    await db.blockUser({ userId, blockedBy: interaction.user.id });
    const user = await client.users.fetch(userId).catch(() => null);
    if (user) await sendStaffControlPanel({ thread: interaction.channel, user });
    await interaction.editReply({ content: `User ${userId} has been blocked.` });
    return true;
  }

  if (action === 'unblock') {
    await db.unblockUser(userId);
    const user = await client.users.fetch(userId).catch(() => null);
    if (user) await sendStaffControlPanel({ thread: interaction.channel, user });
    await interaction.editReply({ content: `User ${userId} has been unblocked.` });
    return true;
  }

  return true;
};

module.exports = { routeButtonInteraction };
