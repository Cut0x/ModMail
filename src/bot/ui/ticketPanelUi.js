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
const { t } = require('../../i18n');

const buildTicketConfigModal = ({ panelId, channelId }) => {
  const titleInput = new TextInputBuilder()
    .setCustomId(TICKET_CONFIG_INPUT_IDS.title)
    .setLabel(t('ticketPanelAdmin.titleLabel'))
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder(t('ticketPanelAdmin.titlePlaceholder'));

  const descriptionInput = new TextInputBuilder()
    .setCustomId(TICKET_CONFIG_INPUT_IDS.description)
    .setLabel(t('ticketPanelAdmin.descriptionLabel'))
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1800)
    .setPlaceholder(t('ticketPanelAdmin.descriptionPlaceholder'));

  const buttonTextInput = new TextInputBuilder()
    .setCustomId(TICKET_CONFIG_INPUT_IDS.buttonText)
    .setLabel(t('ticketPanelAdmin.buttonTextLabel'))
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(80)
    .setPlaceholder(t('ticketPanelAdmin.buttonTextPlaceholder'));

  const dmMessageInput = new TextInputBuilder()
    .setCustomId(TICKET_CONFIG_INPUT_IDS.dmMessage)
    .setLabel(t('ticketPanelAdmin.dmMessageLabel'))
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1800)
    .setPlaceholder(t('ticketPanelAdmin.dmMessagePlaceholder'));

  const dmClosedMessageInput = new TextInputBuilder()
    .setCustomId(TICKET_CONFIG_INPUT_IDS.dmClosedMessage)
    .setLabel(t('ticketPanelAdmin.dmClosedMessageLabel'))
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1800)
    .setPlaceholder(t('ticketPanelAdmin.dmClosedMessagePlaceholder'));

  return new ModalBuilder()
    .setCustomId(`${TICKET_CONFIG_MODAL_PREFIX}:${panelId}:${channelId}`)
    .setTitle(t('ticketPanelAdmin.modalTitle'))
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
    .setLabel(t('ticketOpen.reasonLabel'))
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000)
    .setPlaceholder(t('ticketOpen.reasonPlaceholder'));

  return new ModalBuilder()
    .setCustomId(`${TICKET_REASON_MODAL_PREFIX}:${panelId}`)
    .setTitle(t('ticketOpen.reasonModalTitle'))
    .addComponents(new ActionRowBuilder().addComponents(reasonInput));
};

module.exports = { buildTicketConfigModal, buildTicketPanelMessage, buildTicketReasonModal };
