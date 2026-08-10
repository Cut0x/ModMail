const { client } = require('../client');
const { db } = require('../db');
const { config } = require('../../config');
const { pendingConfirmations } = require('../state');
const { SPAM_THRESHOLD } = require('../constants');
const { safeText, reactToMessage, attachmentFiles } = require('../helpers');
const { buildConfirmMessage } = require('../ui/confirmPrompt');
const { ensureThreadForUser } = require('../tickets/threadManager');

const sendSpamIgnoreLog = async (user) => {
  if (!config.logsIgnoredMpUserChannelId) return;
  const channel = await client.channels.fetch(config.logsIgnoredMpUserChannelId).catch(() => null);
  if (!channel) return;
  await channel
    .send({
      content: `User **${user.tag}** (\`${user.id}\`) has been auto-ignored: sent ${SPAM_THRESHOLD + 1} DMs without responding to the ticket confirmation.`,
      allowedMentions: { parse: [] },
    })
    .catch(() => null);
};

const handleDmMessage = async (message) => {
  const { author } = message;

  if (db.isSpamIgnored(author.id)) return;

  if (db.isBlocked(author.id)) {
    await author
      .send('You are currently blocked from this ModMail. Contact staff another way if needed.')
      .catch(() => null);
    return;
  }

  // If a ticket is already open, forward the message directly without confirmation.
  if (db.getTicketByUserId(author.id)) {
    const thread = await ensureThreadForUser(author);
    await db.touchTicketForUser(author.id);

    const relayedMessage = await thread
      .send({
        content: `**From ${author.tag}** (${author.id})\n${safeText(message.content)}`,
        files: attachmentFiles(message),
        allowedMentions: { parse: [] },
      })
      .catch((error) => {
        console.error('Failed to relay DM message to thread:', error);
        return null;
      });

    const relayed = Boolean(relayedMessage);

    if (relayedMessage) {
      await db.addRelayedMessage({
        sourceMessageId: message.id,
        sourceChannelId: message.channel.id,
        relayedMessageId: relayedMessage.id,
        relayedChannelId: thread.id,
        direction: 'dm_to_thread',
      });
    }

    await reactToMessage(message, relayed);

    if (relayed && !db.getTicketByUserId(author.id)?.welcomed) {
      await author
        .send('Your message has been sent to the staff team. We will reply here soon.')
        .catch(() => null);

      const ticket = db.getTicketByUserId(author.id);
      if (ticket) {
        await db.markTicketWelcomed(author.id);
      }
    }

    return;
  }

  // No open ticket: go through the confirmation flow.
  const pending = pendingConfirmations.get(author.id);

  if (pending) {
    pending.spamCount++;

    if (pending.spamCount >= SPAM_THRESHOLD) {
      pendingConfirmations.delete(author.id);
      await db.addSpamIgnoredUser(author.id);
      await sendSpamIgnoreLog(author);
      await pending.confirmMessage
        .edit({ content: 'You have been ignored for sending too many messages without responding.', components: [] })
        .catch(() => null);
    }

    return;
  }

  const confirmMessage = await author.send(buildConfirmMessage(author.id)).catch(() => null);
  if (!confirmMessage) return;

  pendingConfirmations.set(author.id, {
    confirmMessage,
    originalMessageId: message.id,
    originalChannelId: message.channel.id,
    originalContent: message.content,
    originalFiles: attachmentFiles(message),
    spamCount: 0,
  });
};

module.exports = { handleDmMessage, sendSpamIgnoreLog };
