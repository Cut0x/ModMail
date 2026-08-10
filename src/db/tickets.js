const { mapTicket, boolToInt } = require('./mappers');

const createTicketsApi = (ctx) => {
  const getTicketByUserId = (userId) => mapTicket(ctx.statements.getTicketByUserId.get(userId));

  const getUserIdByThreadId = (threadId) => ctx.statements.getUserIdByThreadId.get(threadId)?.userId ?? null;

  const upsertTicket = async ({ userId, threadId, guildId, welcomed = false }) => {
    const existing = getTicketByUserId(userId);
    const now = new Date().toISOString();

    ctx.statements.upsertTicket.run(
      userId,
      threadId,
      guildId,
      existing?.openedAt ?? now,
      now,
      boolToInt(welcomed),
    );

    return getTicketByUserId(userId);
  };

  const touchTicketForUser = async (userId) => {
    ctx.statements.touchTicketForUser.run(new Date().toISOString(), userId);
    return getTicketByUserId(userId);
  };

  const markTicketWelcomed = async (userId) => {
    ctx.statements.markTicketWelcomed.run(new Date().toISOString(), userId);
    return getTicketByUserId(userId);
  };

  const closeTicketByThreadId = async ({ threadId, closedBy }) => {
    const ticket = mapTicket(ctx.statements.getTicketByThreadId.get(threadId));
    if (!ticket) return null;

    ctx.runTransaction(() => {
      ctx.statements.deleteTicketByUserId.run(ticket.userId);
      ctx.statements.insertClosedTicket.run(
        ticket.userId,
        ticket.threadId,
        ticket.guildId,
        ticket.openedAt,
        ticket.lastMessageAt,
        new Date().toISOString(),
        closedBy,
        boolToInt(ticket.welcomed),
      );
      ctx.statements.trimClosedTickets.run();
    });

    return ticket;
  };

  return {
    getTicketByUserId,
    getUserIdByThreadId,
    upsertTicket,
    touchTicketForUser,
    markTicketWelcomed,
    closeTicketByThreadId,
  };
};

module.exports = { createTicketsApi };
