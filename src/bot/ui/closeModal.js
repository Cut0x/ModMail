const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { CLOSE_MODAL_PREFIX, CLOSE_REASON_INPUT_ID } = require('../constants');

const buildCloseReasonModal = ({ userId, threadId }) => {
  const reasonInput = new TextInputBuilder()
    .setCustomId(CLOSE_REASON_INPUT_ID)
    .setLabel('Close reason')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000)
    .setPlaceholder('Reason shown to the user');

  return new ModalBuilder()
    .setCustomId(`${CLOSE_MODAL_PREFIX}:${userId}:${threadId}`)
    .setTitle('Close ModMail Ticket')
    .addComponents(new ActionRowBuilder().addComponents(reasonInput));
};

module.exports = { buildCloseReasonModal };
