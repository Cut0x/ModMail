const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { CONFIRM_PREFIX } = require('../constants');
const { t } = require('../../i18n');

const buildConfirmMessage = (userId) => {
  const yesButton = new ButtonBuilder()
    .setCustomId(`${CONFIRM_PREFIX}:yes:${userId}`)
    .setLabel(t('confirm.yes'))
    .setStyle(ButtonStyle.Success);

  const noButton = new ButtonBuilder()
    .setCustomId(`${CONFIRM_PREFIX}:no:${userId}`)
    .setLabel(t('confirm.no'))
    .setStyle(ButtonStyle.Danger);

  return {
    content: t('confirm.prompt'),
    components: [new ActionRowBuilder().addComponents(yesButton, noButton)],
  };
};

module.exports = { buildConfirmMessage };
