const { MessageFlags } = require('discord.js');
const {
  CLOSE_MODAL_PREFIX,
  CLOSE_REASON_INPUT_ID,
  TICKET_CONFIG_MODAL_PREFIX,
  TICKET_REASON_MODAL_PREFIX,
} = require('../constants');
const { isModmailThread, isStaffMember } = require('../helpers');
const { handleTicketConfigModalSubmit } = require('../commands/ticketConfigCommand');
const { handleTicketReasonModalSubmit } = require('../commands/ticketOpenFlow');
const { closeTicket } = require('../tickets/closeTicket');

// Returns true once the interaction has been fully handled (including "silently ignored").
const routeModalInteraction = async (interaction) => {
  if (interaction.customId.startsWith(`${TICKET_CONFIG_MODAL_PREFIX}:`)) {
    await handleTicketConfigModalSubmit(interaction);
    return true;
  }

  if (interaction.customId.startsWith(`${TICKET_REASON_MODAL_PREFIX}:`)) {
    await handleTicketReasonModalSubmit(interaction);
    return true;
  }

  if (!interaction.customId.startsWith(`${CLOSE_MODAL_PREFIX}:`)) return false;

  if (!interaction.channel || !isModmailThread(interaction.channel)) return true;

  if (!isStaffMember(interaction.member)) {
    await interaction
      .reply({ content: 'You are not allowed to use this action.', flags: MessageFlags.Ephemeral })
      .catch(() => null);
    return true;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const [, , userId, expectedThreadId] = interaction.customId.split(':');
  if (interaction.channel.id !== expectedThreadId) {
    await interaction.editReply({ content: 'This close action does not match the current thread.' });
    return true;
  }

  const reasonInput = interaction.fields.getTextInputValue(CLOSE_REASON_INPUT_ID)?.trim();
  const reason = reasonInput && reasonInput.length > 0 ? reasonInput : 'No reason provided.';

  const closed = await closeTicket({ thread: interaction.channel, closedBy: interaction.user.id, reason });

  await interaction.editReply({
    content: closed ? `Ticket closed for user ${userId}.` : 'Unable to close ticket.',
  });
  return true;
};

module.exports = { routeModalInteraction };
