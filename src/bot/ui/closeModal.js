const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { CLOSE_MODAL_PREFIX, CLOSE_REASON_INPUT_ID } = require('../constants');
const { t } = require('../../i18n');

const buildCloseReasonModal = ({ userId, threadId }) => {
  const reasonInput = new TextInputBuilder()
    .setCustomId(CLOSE_REASON_INPUT_ID)
    .setLabel(t('closeModal.label'))
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000)
    .setPlaceholder(t('closeModal.placeholder'));

  return new ModalBuilder()
    .setCustomId(`${CLOSE_MODAL_PREFIX}:${userId}:${threadId}`)
    .setTitle(t('closeModal.title'))
    .addComponents(new ActionRowBuilder().addComponents(reasonInput));
};

module.exports = { buildCloseReasonModal };
