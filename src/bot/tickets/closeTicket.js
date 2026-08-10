const { client } = require('../client');
const { db } = require('../db');
const { isModmailThread } = require('../helpers');

const closeTicket = async ({ thread, closedBy, reason = 'No reason provided.' }) => {
  if (!isModmailThread(thread)) return false;

  const userId = db.getUserIdByThreadId(thread.id);
  if (!userId) {
    await thread.send('No active ticket mapping found for this thread.').catch(() => null);
    return false;
  }

  const user = await client.users.fetch(userId).catch(() => null);

  if (user) {
    await user
      .send(`Your ModMail ticket has been closed.\nReason: ${reason}`)
      .catch(() => null);
  }

  await db.closeTicketByThreadId({
    threadId: thread.id,
    closedBy,
  });

  await thread.send(`Ticket closed by <@${closedBy}>.\nReason: ${reason}`).catch(() => null);

  await thread.setArchived(true, `Closed by ${closedBy}`).catch(() => null);
  await thread.setLocked(true, `Closed by ${closedBy}`).catch(() => null);

  return true;
};

module.exports = { closeTicket };
