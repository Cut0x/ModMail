const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const defaultState = () => ({
  ticketsByUser: {},
  ticketsByThread: {},
  blockedUsers: {},
  closedTickets: [],
});

function createDb(dbFilePath) {
  const absolutePath = path.resolve(dbFilePath);
  const directory = path.dirname(absolutePath);

  let state = defaultState();
  let writeQueue = Promise.resolve();

  const ensureDbFile = () => {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    if (!fs.existsSync(absolutePath)) {
      fs.writeFileSync(absolutePath, JSON.stringify(state, null, 2), 'utf8');
    }
  };

  const normalizeState = (raw) => ({
    ticketsByUser: raw?.ticketsByUser && typeof raw.ticketsByUser === 'object' ? raw.ticketsByUser : {},
    ticketsByThread: raw?.ticketsByThread && typeof raw.ticketsByThread === 'object' ? raw.ticketsByThread : {},
    blockedUsers: raw?.blockedUsers && typeof raw.blockedUsers === 'object' ? raw.blockedUsers : {},
    closedTickets: Array.isArray(raw?.closedTickets) ? raw.closedTickets : [],
  });

  const load = async () => {
    ensureDbFile();
    const data = await fsp.readFile(absolutePath, 'utf8');
    state = normalizeState(JSON.parse(data));
    return state;
  };

  const save = async () => {
    writeQueue = writeQueue.then(() => fsp.writeFile(absolutePath, JSON.stringify(state, null, 2), 'utf8'));
    return writeQueue;
  };

  const getTicketByUserId = (userId) => state.ticketsByUser[userId] ?? null;

  const getUserIdByThreadId = (threadId) => state.ticketsByThread[threadId] ?? null;

  const upsertTicket = async ({ userId, threadId, guildId }) => {
    const now = new Date().toISOString();
    const existing = state.ticketsByUser[userId];

    if (existing?.threadId && existing.threadId !== threadId) {
      delete state.ticketsByThread[existing.threadId];
    }

    state.ticketsByUser[userId] = {
      ...(existing ?? {}),
      userId,
      threadId,
      guildId,
      openedAt: existing?.openedAt ?? now,
      lastMessageAt: now,
      status: 'open',
    };

    state.ticketsByThread[threadId] = userId;

    await save();
    return state.ticketsByUser[userId];
  };

  const touchTicketForUser = async (userId) => {
    const ticket = state.ticketsByUser[userId];
    if (!ticket) return null;
    ticket.lastMessageAt = new Date().toISOString();
    await save();
    return ticket;
  };

  const closeTicketByThreadId = async ({ threadId, closedBy }) => {
    const userId = state.ticketsByThread[threadId];
    if (!userId) return null;

    const ticket = state.ticketsByUser[userId];
    if (!ticket) {
      delete state.ticketsByThread[threadId];
      await save();
      return null;
    }

    delete state.ticketsByThread[threadId];
    delete state.ticketsByUser[userId];

    state.closedTickets.push({
      ...ticket,
      closedAt: new Date().toISOString(),
      closedBy,
      status: 'closed',
    });

    if (state.closedTickets.length > 5000) {
      state.closedTickets = state.closedTickets.slice(-5000);
    }

    await save();
    return ticket;
  };

  const isBlocked = (userId) => Boolean(state.blockedUsers[userId]);

  const blockUser = async ({ userId, blockedBy, reason = null }) => {
    state.blockedUsers[userId] = {
      userId,
      blockedBy,
      blockedAt: new Date().toISOString(),
      reason,
    };

    await save();
    return state.blockedUsers[userId];
  };

  const unblockUser = async (userId) => {
    const blocked = state.blockedUsers[userId] ?? null;
    if (!blocked) return null;
    delete state.blockedUsers[userId];
    await save();
    return blocked;
  };

  return {
    load,
    getTicketByUserId,
    getUserIdByThreadId,
    upsertTicket,
    touchTicketForUser,
    closeTicketByThreadId,
    isBlocked,
    blockUser,
    unblockUser,
    getState: () => state,
    dbPath: absolutePath,
  };
}

module.exports = { createDb };
