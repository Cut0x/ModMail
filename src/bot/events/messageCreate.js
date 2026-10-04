const { ChannelType } = require('discord.js');
const { client } = require('../client');
const { t } = require('../../i18n');
const { isModmailThread } = require('../helpers');
const { handleDmMessage } = require('../handlers/dmMessage');
const { handleStaffThreadMessage } = require('../handlers/staffThreadMessage');

const registerMessageCreateEvent = () => {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    try {
      if (!message.guild && message.channel.type === ChannelType.DM) {
        await handleDmMessage(message);
        return;
      }

      if (message.guild && isModmailThread(message.channel)) {
        await handleStaffThreadMessage(message);
        return;
      }
    } catch (error) {
      console.error('messageCreate handler error:', error);
      if (message.channel?.isDMBased?.()) {
        await message.author
          .send(t('common.internalError'))
          .catch(() => null);
      }
    }
  });
};

module.exports = { registerMessageCreateEvent };
