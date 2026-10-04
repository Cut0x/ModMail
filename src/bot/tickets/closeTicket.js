const { client } = require('../client');
const { db } = require('../db');
const { t } = require('../../i18n');
const { isModmailThread } = require('../helpers');
const { buildTicketTranscriptHtml, saveTranscriptToDisk, toDiscordAttachment } = require('./transcript');

const closeTicket = async ({ thread, closedBy, reason }) => {
  if (!isModmailThread(thread)) return false;

  const resolvedReason = reason ?? t('common.noReasonProvided');

  const ticket = db.getTicketByThreadId(thread.id);
  if (!ticket) {
    await thread.send(t('ticket.noMappingFound')).catch(() => null);
    return false;
  }

  const user = await client.users.fetch(ticket.userId).catch(() => null);
  const closerUser = await client.users.fetch(closedBy).catch(() => null);

  const transcript = user
    ? await buildTicketTranscriptHtml({
        thread,
        user,
        ticket,
        closedByTag: closerUser?.tag ?? closedBy,
        reason: resolvedReason,
      }).catch((error) => {
        console.error('Failed to build ticket transcript:', error);
        return null;
      })
    : null;

  if (transcript) {
    await saveTranscriptToDisk(transcript).catch((error) => {
      console.error('Failed to save ticket transcript to disk:', error);
    });
  }

  if (user) {
    await user.send(t('ticket.closedMessageToUser', { reason: resolvedReason })).catch(() => null);

    if (transcript) {
      await user
        .send({ content: t('ticket.transcriptDm'), files: [toDiscordAttachment(transcript)] })
        .catch(() => null);
    }
  }

  await db.closeTicketByThreadId({
    threadId: thread.id,
    closedBy,
  });

  await thread.send(t('ticket.closedMessageToThread', { closedBy, reason: resolvedReason })).catch(() => null);

  if (transcript) {
    await thread
      .send({ content: t('ticket.transcriptAttached'), files: [toDiscordAttachment(transcript)] })
      .catch(() => null);
  }

  await thread.setArchived(true, `Closed by ${closedBy}`).catch(() => null);
  await thread.setLocked(true, `Closed by ${closedBy}`).catch(() => null);

  return true;
};

module.exports = { closeTicket };
