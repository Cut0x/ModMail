const { Events } = require('discord.js');
const { client } = require('../client');
const { db } = require('../db');
const { t } = require('../../i18n');
const { isModmailThread } = require('../helpers');

const registerGuildMemberAddEvent = () => {
  client.on(Events.GuildMemberAdd, async (member) => {
    try {
      const ticket = db.getTicketByUserId(member.id);
      if (!ticket || !ticket.memberLeft) return;

      const thread = await client.channels.fetch(ticket.threadId).catch(() => null);
      if (!thread || !isModmailThread(thread)) return;

      await db.clearTicketMemberLeft(member.id);

      await thread
        .send(t('ticket.memberRejoined', { tag: member.user?.tag ?? member.id }))
        .catch(() => null);
    } catch (error) {
      console.error('guildMemberAdd handler error:', error);
    }
  });
};

module.exports = { registerGuildMemberAddEvent };
