const { client } = require('../client');
const { db } = require('../db');
const { isModmailThread, isStaffMember, attachmentFiles, reactToMessage } = require('../helpers');

const handleStaffThreadMessage = async (message) => {
  if (!isModmailThread(message.channel)) return;
  if (!isStaffMember(message.member)) return;

  const userId = db.getUserIdByThreadId(message.channel.id);
  if (!userId) return;

  const targetUser = await client.users.fetch(userId).catch(() => null);
  if (!targetUser) {
    await message.reply('Cannot DM the target user (not found).');
    await reactToMessage(message, false);
    return;
  }

  const staffName = message.member?.displayName ?? message.author.username;
  const files = attachmentFiles(message);
  const hasText = message.content && message.content.trim().length > 0;
  const content = hasText
    ? `**${staffName}:** ${message.content.trim()}`
    : `**${staffName} sent an attachment.**`;

  const sentMessage = await targetUser
    .send({ content, files, allowedMentions: { parse: [] } })
    .catch((error) => {
      console.error('Failed to relay staff message to user DM:', error);
      return null;
    });

  const sent = Boolean(sentMessage);

  await reactToMessage(message, sent);

  if (sentMessage) {
    await db.addRelayedMessage({
      sourceMessageId: message.id,
      sourceChannelId: message.channel.id,
      relayedMessageId: sentMessage.id,
      relayedChannelId: sentMessage.channel.id,
      direction: 'thread_to_dm',
    });
  }

  if (sent) {
    await db.touchTicketForUser(userId);
  }
};

module.exports = { handleStaffThreadMessage };
