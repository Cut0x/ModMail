const { ChannelType } = require('discord.js');
const { config } = require('../../config');
const { client } = require('../client');
const { db } = require('../db');
const { AUTO_ARCHIVE_VALUES } = require('../constants');
const { buildThreadName } = require('../helpers');
const { buildControlPanelMessage } = require('../ui/controlPanel');

const getModmailParentChannel = async () => {
  const channel = await client.channels.fetch(config.threadsChannelId);

  if (!channel || channel.type !== ChannelType.GuildText) {
    throw new Error('MODMAIL_THREADS_CHANNEL_ID must target a guild text channel.');
  }

  return channel;
};

const sendStaffControlPanel = async ({ thread, user }) => {
  const blocked = db.isBlocked(user.id);
  await thread.send(buildControlPanelMessage({ user, blocked }));
};

const sendTicketAnnouncement = async ({ parentChannel, user }) => {
  const mentionPrefix = config.staffRoleId ? `<@&${config.staffRoleId}> ` : '';

  return parentChannel.send({
    content: `${mentionPrefix}New ModMail ticket from **${user.tag}** (\`${user.id}\`).`,
    allowedMentions: config.staffRoleId ? { roles: [config.staffRoleId] } : { parse: [] },
  });
};

const ensureThreadForUser = async (user) => {
  const ticket = db.getTicketByUserId(user.id);

  if (ticket) {
    try {
      const thread = await client.channels.fetch(ticket.threadId);
      if (thread?.isThread?.()) {
        return thread;
      }
    } catch {
      // Missing thread: create a new one below.
    }
  }

  const parentChannel = await getModmailParentChannel();
  const requestedAutoArchive = AUTO_ARCHIVE_VALUES.has(config.threadAutoArchiveMinutes)
    ? config.threadAutoArchiveMinutes
    : 1440;

  const announcementMessage = await sendTicketAnnouncement({ parentChannel, user });

  let thread;
  try {
    thread = await parentChannel.threads.create({
      name: buildThreadName(user),
      startMessage: announcementMessage.id,
      autoArchiveDuration: requestedAutoArchive,
      reason: `ModMail ticket opened for ${user.tag} (${user.id})`,
    });
  } catch (error) {
    console.error('Public thread creation failed, fallback to private thread:', error);

    thread = await parentChannel.threads.create({
      name: buildThreadName(user),
      type: ChannelType.PrivateThread,
      invitable: false,
      autoArchiveDuration: requestedAutoArchive,
      reason: `ModMail ticket opened for ${user.tag} (${user.id})`,
    });
  }

  await db.upsertTicket({
    userId: user.id,
    threadId: thread.id,
    guildId: config.guildId,
  });

  await sendStaffControlPanel({ thread, user });

  return thread;
};

module.exports = {
  getModmailParentChannel,
  sendStaffControlPanel,
  sendTicketAnnouncement,
  ensureThreadForUser,
};
