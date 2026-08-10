const { Events } = require('discord.js');
const { client } = require('../client');
const { db } = require('../db');
const { isModmailThread, isStaffMember } = require('../helpers');

const registerTypingStartEvent = () => {
  client.on(Events.TypingStart, async (typing) => {
    try {
      if (typing.user.bot) return;

      if (!typing.inGuild()) {
        const ticket = db.getTicketByUserId(typing.user.id);
        if (!ticket) return;

        const thread = await client.channels.fetch(ticket.threadId).catch(() => null);
        if (!thread || !isModmailThread(thread)) return;

        await thread.sendTyping().catch(() => null);
        return;
      }

      if (!isModmailThread(typing.channel) || !isStaffMember(typing.member)) return;

      const userId = db.getUserIdByThreadId(typing.channel.id);
      if (!userId) return;

      const targetUser = await client.users.fetch(userId).catch(() => null);
      if (!targetUser) return;

      const dmChannel = await targetUser.createDM().catch(() => null);
      if (!dmChannel) return;

      await dmChannel.sendTyping().catch(() => null);
    } catch (error) {
      console.error('typingStart handler error:', error);
    }
  });
};

module.exports = { registerTypingStartEvent };
