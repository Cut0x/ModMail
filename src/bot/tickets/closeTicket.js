const { client } = require('../client');
const { db } = require('../db');
const { t } = require('../../i18n');
const { isModmailThread } = require('../helpers');

const closeTicket = async ({ thread, closedBy, reason }) => {
  if (!isModmailThread(thread)) return false;

  const resolvedReason = reason ?? t('common.noReasonProvided');

  const userId = db.getUserIdByThreadId(thread.id);
  if (!userId) {
    await thread.send(t('ticket.noMappingFound')).catch(() => null);
    return false;
  }

  const user = await client.users.fetch(userId).catch(() => null);

  if (user) {
    await user
      .send(t('ticket.closedMessageToUser', { reason: resolvedReason }))
      .catch(() => null);
  }

  await db.closeTicketByThreadId({
    threadId: thread.id,
    closedBy,
  });

  await thread.send(t('ticket.closedMessageToThread', { closedBy, reason: resolvedReason })).catch(() => null);

  await thread.setArchived(true, `Closed by ${closedBy}`).catch(() => null);
  await thread.setLocked(true, `Closed by ${closedBy}`).catch(() => null);

  return true;
};

module.exports = { closeTicket };
