const { ChannelType } = require('discord.js');
const { client } = require('../client');
const { isModmailThread } = require('../helpers');
const { handleDmMessageEdit, handleStaffThreadMessageEdit } = require('../handlers/messageEditSync');

const registerMessageUpdateEvent = () => {
  client.on('messageUpdate', async (oldMessage, newMessage) => {
    try {
      if (newMessage.partial) {
        newMessage = await newMessage.fetch().catch(() => null);
        if (!newMessage) return;
      }

      if (newMessage.author?.bot) return;

      // Skip updates that don't actually change the text (e.g. Discord adding a link preview embed).
      if (!oldMessage.partial && newMessage.content === oldMessage.content) return;

      if (!newMessage.guild && newMessage.channel.type === ChannelType.DM) {
        await handleDmMessageEdit(newMessage);
        return;
      }

      if (newMessage.guild && isModmailThread(newMessage.channel)) {
        await handleStaffThreadMessageEdit(newMessage);
        return;
      }
    } catch (error) {
      console.error('messageUpdate handler error:', error);
    }
  });
};

module.exports = { registerMessageUpdateEvent };
