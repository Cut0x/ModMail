const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const {
  TICKET_CONFIG_INPUT_IDS,
  TICKET_CONFIG_MODAL_PREFIX,
  TICKET_OPEN_BUTTON_PREFIX,
  TICKET_REASON_INPUT_ID,
  TICKET_REASON_MODAL_PREFIX,
} = require('../constants');

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

module.exports = { buildTicketConfigModal, buildTicketPanelMessage, buildTicketReasonModal };
