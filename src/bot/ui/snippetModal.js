const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { SNIPPET_MODAL_PREFIX, SNIPPET_CONTENT_INPUT_ID } = require('../constants');

const buildSnippetModal = ({ name, defaultContent = '' }) => {
  const contentInput = new TextInputBuilder()
    .setCustomId(SNIPPET_CONTENT_INPUT_ID)
    .setLabel('Content')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(2000);

  if (defaultContent) {
    contentInput.setValue(defaultContent);
  }

  return new ModalBuilder()
    .setCustomId(`${SNIPPET_MODAL_PREFIX}:${encodeURIComponent(name)}`)
    .setTitle(`Saved reply: ${name}`.slice(0, 45))
    .addComponents(new ActionRowBuilder().addComponents(contentInput));
};

module.exports = { buildSnippetModal };
