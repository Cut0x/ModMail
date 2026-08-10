const { mapTicket } = require('./mappers');

const createStateReader = (ctx) => () => {
  const ticketsByUser = {};
  const ticketsByThread = {};
  const ticketPanels = {};
  const blockedUsers = {};
  const spamIgnoredUsers = {};

  for (const row of ctx.statements.allTickets.all()) {
    const ticket = mapTicket(row);
    ticketsByUser[ticket.userId] = ticket;
    ticketsByThread[ticket.threadId] = ticket.userId;
  }

  for (const panel of ctx.statements.allTicketPanels.all()) {
    ticketPanels[panel.panelId] = panel;
  }

  for (const blocked of ctx.statements.allBlockedUsers.all()) {
    blockedUsers[blocked.userId] = blocked;
  }

  for (const ignored of ctx.statements.allSpamIgnoredUsers.all()) {
    spamIgnoredUsers[ignored.userId] = ignored;
  }

  return {
    ticketsByUser,
    ticketsByThread,
    ticketPanels,
    blockedUsers,
    spamIgnoredUsers,
    closedTickets: ctx.statements.allClosedTickets.all().map(mapTicket),
  };
};

module.exports = { createStateReader };
