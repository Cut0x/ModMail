const { MessageFlags } = require('discord.js');
const { db } = require('../db');
const { safeText } = require('../helpers');
const { ensureThreadForUser } = require('../tickets/threadManager');
const { buildTicketReasonModal } = require('../ui/ticketPanelUi');
const { TICKET_REASON_INPUT_ID } = require('../constants');

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

module.exports = { handleTicketOpenButton, handleTicketReasonModalSubmit };
