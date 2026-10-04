const { MessageFlags } = require('discord.js');
const {
  CLOSE_MODAL_PREFIX,
  CLOSE_REASON_INPUT_ID,
  SNIPPET_MODAL_PREFIX,
  TICKET_CONFIG_MODAL_PREFIX,
  TICKET_REASON_MODAL_PREFIX,
} = require('../constants');
const { isModmailThread, isStaffMember } = require('../helpers');
const { t } = require('../../i18n');
const { handleTicketConfigModalSubmit } = require('../commands/ticketConfigCommand');
const { handleTicketReasonModalSubmit } = require('../commands/ticketOpenFlow');
const { handleSnippetModalSubmit } = require('../commands/snippetCommands');
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

  if (interaction.customId.startsWith(`${SNIPPET_MODAL_PREFIX}:`)) {
    const encodedName = interaction.customId.slice(`${SNIPPET_MODAL_PREFIX}:`.length);
    await handleSnippetModalSubmit(interaction, decodeURIComponent(encodedName));
    return true;
  }

  if (!interaction.customId.startsWith(`${CLOSE_MODAL_PREFIX}:`)) return false;

  if (!interaction.channel || !isModmailThread(interaction.channel)) return true;

  if (!isStaffMember(interaction.member)) {
    await interaction
      .reply({ content: t('common.notAllowedAction'), flags: MessageFlags.Ephemeral })
      .catch(() => null);
    return true;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const [, , userId, expectedThreadId] = interaction.customId.split(':');
  if (interaction.channel.id !== expectedThreadId) {
    await interaction.editReply({ content: t('ticket.closeActionMismatch') });
    return true;
  }

  const reasonInput = interaction.fields.getTextInputValue(CLOSE_REASON_INPUT_ID)?.trim();
  const reason = reasonInput && reasonInput.length > 0 ? reasonInput : t('common.noReasonProvided');

  const closed = await closeTicket({ thread: interaction.channel, closedBy: interaction.user.id, reason });

  await interaction.editReply({
    content: closed ? t('ticket.closedFor', { userId }) : t('ticket.closeFailed'),
  });
  return true;
};

module.exports = { routeModalInteraction };
