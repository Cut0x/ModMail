const { Events } = require('discord.js');
const { client } = require('../client');
const { db } = require('../db');
const { isModmailThread } = require('../helpers');

const registerGuildMemberRemoveEvent = () => {
  client.on(Events.GuildMemberRemove, async (member) => {
    try {
      const ticket = db.getTicketByUserId(member.id);
      if (!ticket || ticket.memberLeft) return;

      const thread = await client.channels.fetch(ticket.threadId).catch(() => null);
      if (!thread || !isModmailThread(thread)) return;

      await db.markTicketMemberLeft(member.id);

      await thread
        .send(
          `**${member.user?.tag ?? member.id}** has left the server. Messages sent in this thread will no longer be delivered to them. You can close this ticket.`,
        )
        .catch(() => null);
    } catch (error) {
      console.error('guildMemberRemove handler error:', error);
    }
  });
};

module.exports = { registerGuildMemberRemoveEvent };
