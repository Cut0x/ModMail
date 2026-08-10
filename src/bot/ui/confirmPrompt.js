const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { CONFIRM_PREFIX } = require('../constants');

const buildConfirmMessage = (userId) => {
  const yesButton = new ButtonBuilder()
    .setCustomId(`${CONFIRM_PREFIX}:yes:${userId}`)
    .setLabel('Yes')
    .setStyle(ButtonStyle.Success);

  const noButton = new ButtonBuilder()
    .setCustomId(`${CONFIRM_PREFIX}:no:${userId}`)
    .setLabel('No')
    .setStyle(ButtonStyle.Danger);

  return {
    content: 'Do you want to create a ticket with the staff team?',
    components: [new ActionRowBuilder().addComponents(yesButton, noButton)],
  };
};

module.exports = { buildConfirmMessage };
