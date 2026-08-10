const { client } = require('../client');
const { db } = require('../db');
const { EDITED_SUFFIX } = require('../constants');
const { safeText, isModmailThread, isStaffMember } = require('../helpers');

const handleDmMessageEdit = async (message) => {
  const { author } = message;
  if (!author || author.bot) return;

  const mapping = db.getRelayedMessageBySourceId(message.id);
  if (!mapping || mapping.direction !== 'dm_to_thread') return;

  const thread = await client.channels.fetch(mapping.relayedChannelId).catch(() => null);
  if (!thread || !thread.isThread?.()) return;

  const relayedMessage = await thread.messages.fetch(mapping.relayedMessageId).catch(() => null);
  if (!relayedMessage) return;

  await relayedMessage
    .edit({
      content: `**From ${author.tag}** (${author.id})\n${safeText(message.content)}${EDITED_SUFFIX}`,
      allowedMentions: { parse: [] },
    })
    .catch((error) => {
      console.error('Failed to sync edited DM message to thread:', error);
    });
};

const handleStaffThreadMessageEdit = async (message) => {
  if (!isModmailThread(message.channel)) return;
  if (!isStaffMember(message.member)) return;

  const mapping = db.getRelayedMessageBySourceId(message.id);
  if (!mapping || mapping.direction !== 'thread_to_dm') return;

  const dmChannel = await client.channels.fetch(mapping.relayedChannelId).catch(() => null);
  if (!dmChannel) return;

  const relayedMessage = await dmChannel.messages.fetch(mapping.relayedMessageId).catch(() => null);
  if (!relayedMessage) return;

  const staffName = message.member?.displayName ?? message.author.username;
  const hasText = message.content && message.content.trim().length > 0;
  const content = hasText
    ? `**${staffName}:** ${message.content.trim()}${EDITED_SUFFIX}`
    : `**${staffName} sent an attachment.**`;

  await relayedMessage.edit({ content, allowedMentions: { parse: [] } }).catch((error) => {
    console.error('Failed to sync edited staff message to DM:', error);
  });
};

module.exports = { handleDmMessageEdit, handleStaffThreadMessageEdit };
