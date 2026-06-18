const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const normalizeLegacyState = (raw) => ({
  ticketsByUser: raw?.ticketsByUser && typeof raw.ticketsByUser === 'object' ? raw.ticketsByUser : {},
  ticketsByThread: raw?.ticketsByThread && typeof raw.ticketsByThread === 'object' ? raw.ticketsByThread : {},
  ticketPanels: raw?.ticketPanels && typeof raw.ticketPanels === 'object' ? raw.ticketPanels : {},
  blockedUsers: raw?.blockedUsers && typeof raw.blockedUsers === 'object' ? raw.blockedUsers : {},
  spamIgnoredUsers: raw?.spamIgnoredUsers && typeof raw.spamIgnoredUsers === 'object' ? raw.spamIgnoredUsers : {},
  closedTickets: Array.isArray(raw?.closedTickets) ? raw.closedTickets : [],
});

const boolToInt = (value) => (value ? 1 : 0);
const intToBool = (value) => Boolean(value);

function createDb(dbFilePath, options = {}) {
  const absolutePath = path.resolve(dbFilePath);
  const directory = path.dirname(absolutePath);
  const legacyJsonPath = options.legacyJsonFilePath ? path.resolve(options.legacyJsonFilePath) : null;

  let db = null;
  let statements = null;

  const ensureDirectory = () => {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
  };

  const runTransaction = (fn) => {
    db.exec('BEGIN IMMEDIATE');

    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  };

  const createSchema = () => {
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;

      CREATE TABLE IF NOT EXISTS tickets (
        user_id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL UNIQUE,
        guild_id TEXT NOT NULL,
        opened_at TEXT NOT NULL,
        last_message_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        welcomed INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_tickets_thread_id ON tickets(thread_id);

      CREATE TABLE IF NOT EXISTS ticket_panels (
        panel_id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        message_id TEXT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        button_text TEXT NOT NULL,
        dm_message TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS blocked_users (
        user_id TEXT PRIMARY KEY,
        blocked_by TEXT NOT NULL,
        blocked_at TEXT NOT NULL,
        reason TEXT
      );

      CREATE TABLE IF NOT EXISTS spam_ignored_users (
        user_id TEXT PRIMARY KEY,
        ignored_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS closed_tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        thread_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        opened_at TEXT NOT NULL,
        last_message_at TEXT NOT NULL,
        closed_at TEXT NOT NULL,
        closed_by TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'closed',
        welcomed INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_closed_tickets_user_id ON closed_tickets(user_id);
      CREATE INDEX IF NOT EXISTS idx_closed_tickets_thread_id ON closed_tickets(thread_id);
    `);
  };

  const prepareStatements = () => ({
    countRows: db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM tickets) +
        (SELECT COUNT(*) FROM ticket_panels) +
        (SELECT COUNT(*) FROM blocked_users) +
        (SELECT COUNT(*) FROM spam_ignored_users) +
        (SELECT COUNT(*) FROM closed_tickets) AS total
    `),
    getTicketByUserId: db.prepare(`
      SELECT
        user_id AS userId,
        thread_id AS threadId,
        guild_id AS guildId,
        opened_at AS openedAt,
        last_message_at AS lastMessageAt,
        status,
        welcomed
      FROM tickets
      WHERE user_id = ?
    `),
    getTicketByThreadId: db.prepare(`
      SELECT
        user_id AS userId,
        thread_id AS threadId,
        guild_id AS guildId,
        opened_at AS openedAt,
        last_message_at AS lastMessageAt,
        status,
        welcomed
      FROM tickets
      WHERE thread_id = ?
    `),
    getUserIdByThreadId: db.prepare('SELECT user_id AS userId FROM tickets WHERE thread_id = ?'),
    upsertTicket: db.prepare(`
      INSERT INTO tickets (user_id, thread_id, guild_id, opened_at, last_message_at, status, welcomed)
      VALUES (?, ?, ?, ?, ?, 'open', ?)
      ON CONFLICT(user_id) DO UPDATE SET
        thread_id = excluded.thread_id,
        guild_id = excluded.guild_id,
        last_message_at = excluded.last_message_at,
        status = 'open',
        welcomed = CASE WHEN excluded.welcomed = 1 THEN 1 ELSE tickets.welcomed END
    `),
    touchTicketForUser: db.prepare('UPDATE tickets SET last_message_at = ? WHERE user_id = ?'),
    markTicketWelcomed: db.prepare('UPDATE tickets SET welcomed = 1, last_message_at = ? WHERE user_id = ?'),
    deleteTicketByUserId: db.prepare('DELETE FROM tickets WHERE user_id = ?'),
    insertClosedTicket: db.prepare(`
      INSERT INTO closed_tickets (
        user_id,
        thread_id,
        guild_id,
        opened_at,
        last_message_at,
        closed_at,
        closed_by,
        status,
        welcomed
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'closed', ?)
    `),
    trimClosedTickets: db.prepare(`
      DELETE FROM closed_tickets
      WHERE id NOT IN (
        SELECT id FROM closed_tickets
        ORDER BY closed_at DESC, id DESC
        LIMIT 5000
      )
    `),
    getTicketPanel: db.prepare(`
      SELECT
        panel_id AS panelId,
        channel_id AS channelId,
        message_id AS messageId,
        title,
        description,
        button_text AS buttonText,
        dm_message AS dmMessage,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM ticket_panels
      WHERE panel_id = ?
    `),
    upsertTicketPanel: db.prepare(`
      INSERT INTO ticket_panels (
        panel_id,
        channel_id,
        message_id,
        title,
        description,
        button_text,
        dm_message,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(panel_id) DO UPDATE SET
        channel_id = excluded.channel_id,
        message_id = excluded.message_id,
        title = excluded.title,
        description = excluded.description,
        button_text = excluded.button_text,
        dm_message = excluded.dm_message,
        updated_at = excluded.updated_at
    `),
    isBlocked: db.prepare('SELECT 1 AS found FROM blocked_users WHERE user_id = ?'),
    blockUser: db.prepare(`
      INSERT INTO blocked_users (user_id, blocked_by, blocked_at, reason)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        blocked_by = excluded.blocked_by,
        blocked_at = excluded.blocked_at,
        reason = excluded.reason
    `),
    getBlockedUser: db.prepare(`
      SELECT user_id AS userId, blocked_by AS blockedBy, blocked_at AS blockedAt, reason
      FROM blocked_users
      WHERE user_id = ?
    `),
    unblockUser: db.prepare('DELETE FROM blocked_users WHERE user_id = ?'),
    isSpamIgnored: db.prepare('SELECT 1 AS found FROM spam_ignored_users WHERE user_id = ?'),
    addSpamIgnoredUser: db.prepare(`
      INSERT INTO spam_ignored_users (user_id, ignored_at)
      VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET ignored_at = excluded.ignored_at
    `),
    getSpamIgnoredUser: db.prepare(`
      SELECT user_id AS userId, ignored_at AS ignoredAt
      FROM spam_ignored_users
      WHERE user_id = ?
    `),
    allTickets: db.prepare(`
      SELECT
        user_id AS userId,
        thread_id AS threadId,
        guild_id AS guildId,
        opened_at AS openedAt,
        last_message_at AS lastMessageAt,
        status,
        welcomed
      FROM tickets
    `),
    allTicketPanels: db.prepare(`
      SELECT
        panel_id AS panelId,
        channel_id AS channelId,
        message_id AS messageId,
        title,
        description,
        button_text AS buttonText,
        dm_message AS dmMessage,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM ticket_panels
    `),
    allBlockedUsers: db.prepare(`
      SELECT user_id AS userId, blocked_by AS blockedBy, blocked_at AS blockedAt, reason
      FROM blocked_users
    `),
    allSpamIgnoredUsers: db.prepare(`
      SELECT user_id AS userId, ignored_at AS ignoredAt
      FROM spam_ignored_users
    `),
    allClosedTickets: db.prepare(`
      SELECT
        user_id AS userId,
        thread_id AS threadId,
        guild_id AS guildId,
        opened_at AS openedAt,
        last_message_at AS lastMessageAt,
        closed_at AS closedAt,
        closed_by AS closedBy,
        status,
        welcomed
      FROM closed_tickets
      ORDER BY closed_at ASC, id ASC
    `),
  });

  const mapTicket = (row) => {
    if (!row) return null;
    return {
      ...row,
      welcomed: intToBool(row.welcomed),
    };
  };

  const importLegacyJsonIfNeeded = async () => {
    if (!legacyJsonPath || !fs.existsSync(legacyJsonPath)) return;
    if (path.resolve(legacyJsonPath) === absolutePath) return;
    if (statements.countRows.get().total > 0) return;

    const raw = await fsp.readFile(legacyJsonPath, 'utf8');
    const state = normalizeLegacyState(JSON.parse(raw));

    runTransaction(() => {
      for (const ticket of Object.values(state.ticketsByUser)) {
        const now = new Date().toISOString();
        statements.upsertTicket.run(
          ticket.userId,
          ticket.threadId,
          ticket.guildId,
          ticket.openedAt ?? now,
          ticket.lastMessageAt ?? now,
          boolToInt(ticket.welcomed),
        );
      }

      for (const panel of Object.values(state.ticketPanels)) {
        const now = new Date().toISOString();
        statements.upsertTicketPanel.run(
          panel.panelId,
          panel.channelId,
          panel.messageId ?? null,
          panel.title,
          panel.description,
          panel.buttonText,
          panel.dmMessage,
          panel.createdAt ?? now,
          panel.updatedAt ?? now,
        );
      }

      for (const blocked of Object.values(state.blockedUsers)) {
        statements.blockUser.run(
          blocked.userId,
          blocked.blockedBy,
          blocked.blockedAt ?? new Date().toISOString(),
          blocked.reason ?? null,
        );
      }

      for (const ignored of Object.values(state.spamIgnoredUsers)) {
        statements.addSpamIgnoredUser.run(ignored.userId, ignored.ignoredAt ?? new Date().toISOString());
      }

      for (const ticket of state.closedTickets) {
        statements.insertClosedTicket.run(
          ticket.userId,
          ticket.threadId,
          ticket.guildId,
          ticket.openedAt ?? new Date().toISOString(),
          ticket.lastMessageAt ?? new Date().toISOString(),
          ticket.closedAt ?? new Date().toISOString(),
          ticket.closedBy,
          boolToInt(ticket.welcomed),
        );
      }
    });
  };

  const load = async () => {
    ensureDirectory();
    db = new DatabaseSync(absolutePath);
    createSchema();
    statements = prepareStatements();
    await importLegacyJsonIfNeeded();
    return getState();
  };

  const getTicketByUserId = (userId) => mapTicket(statements.getTicketByUserId.get(userId));

  const getUserIdByThreadId = (threadId) => statements.getUserIdByThreadId.get(threadId)?.userId ?? null;

  const getTicketPanel = (panelId) => statements.getTicketPanel.get(panelId) ?? null;

  const upsertTicketPanel = async ({ panelId, channelId, messageId = null, title, description, buttonText, dmMessage }) => {
    const existing = getTicketPanel(panelId);
    const now = new Date().toISOString();

    statements.upsertTicketPanel.run(
      panelId,
      channelId,
      messageId,
      title,
      description,
      buttonText,
      dmMessage,
      existing?.createdAt ?? now,
      now,
    );

    return getTicketPanel(panelId);
  };

  const upsertTicket = async ({ userId, threadId, guildId, welcomed = false }) => {
    const existing = getTicketByUserId(userId);
    const now = new Date().toISOString();

    statements.upsertTicket.run(
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
    statements.touchTicketForUser.run(new Date().toISOString(), userId);
    return getTicketByUserId(userId);
  };

  const markTicketWelcomed = async (userId) => {
    statements.markTicketWelcomed.run(new Date().toISOString(), userId);
    return getTicketByUserId(userId);
  };

  const closeTicketByThreadId = async ({ threadId, closedBy }) => {
    const ticket = mapTicket(statements.getTicketByThreadId.get(threadId));
    if (!ticket) return null;

    runTransaction(() => {
      statements.deleteTicketByUserId.run(ticket.userId);
      statements.insertClosedTicket.run(
        ticket.userId,
        ticket.threadId,
        ticket.guildId,
        ticket.openedAt,
        ticket.lastMessageAt,
        new Date().toISOString(),
        closedBy,
        boolToInt(ticket.welcomed),
      );
      statements.trimClosedTickets.run();
    });

    return ticket;
  };

  const isBlocked = (userId) => Boolean(statements.isBlocked.get(userId));

  const isSpamIgnored = (userId) => Boolean(statements.isSpamIgnored.get(userId));

  const addSpamIgnoredUser = async (userId) => {
    statements.addSpamIgnoredUser.run(userId, new Date().toISOString());
    return statements.getSpamIgnoredUser.get(userId);
  };

  const blockUser = async ({ userId, blockedBy, reason = null }) => {
    statements.blockUser.run(userId, blockedBy, new Date().toISOString(), reason);
    return statements.getBlockedUser.get(userId);
  };

  const unblockUser = async (userId) => {
    const blocked = statements.getBlockedUser.get(userId) ?? null;
    if (!blocked) return null;
    statements.unblockUser.run(userId);
    return blocked;
  };

  const getState = () => {
    const ticketsByUser = {};
    const ticketsByThread = {};
    const ticketPanels = {};
    const blockedUsers = {};
    const spamIgnoredUsers = {};

    for (const row of statements.allTickets.all()) {
      const ticket = mapTicket(row);
      ticketsByUser[ticket.userId] = ticket;
      ticketsByThread[ticket.threadId] = ticket.userId;
    }

    for (const panel of statements.allTicketPanels.all()) {
      ticketPanels[panel.panelId] = panel;
    }

    for (const blocked of statements.allBlockedUsers.all()) {
      blockedUsers[blocked.userId] = blocked;
    }

    for (const ignored of statements.allSpamIgnoredUsers.all()) {
      spamIgnoredUsers[ignored.userId] = ignored;
    }

    return {
      ticketsByUser,
      ticketsByThread,
      ticketPanels,
      blockedUsers,
      spamIgnoredUsers,
      closedTickets: statements.allClosedTickets.all().map(mapTicket),
    };
  };

  return {
    load,
    getTicketByUserId,
    getUserIdByThreadId,
    getTicketPanel,
    upsertTicketPanel,
    upsertTicket,
    touchTicketForUser,
    markTicketWelcomed,
    closeTicketByThreadId,
    isBlocked,
    blockUser,
    unblockUser,
    isSpamIgnored,
    addSpamIgnoredUser,
    getState,
    dbPath: absolutePath,
  };
}

module.exports = { createDb };
