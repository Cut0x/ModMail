const { DEFAULT_DM_CLOSED_MESSAGE } = require('./constants');

// Every statement here is CREATE TABLE/INDEX IF NOT EXISTS, so running this
// against an existing database only ever adds missing objects, it never
// drops or rewrites a table that already has data in it.
const createSchema = (db) => {
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
      dm_closed_message TEXT NOT NULL DEFAULT 'Vos messages privés sont fermés.',
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

    -- Added after initial release: maps a relayed message to the message it
    -- was relayed from, so an edit on one side can be mirrored on the other.
    -- Purely additive: it never touches the tables above, so upgrading a bot
    -- that already has tickets/panels/blocks in its database is safe and
    -- loses nothing. Messages sent before this table existed simply have no
    -- mapping row, so editing them is silently skipped instead of erroring.
    CREATE TABLE IF NOT EXISTS relayed_messages (
      source_message_id TEXT PRIMARY KEY,
      source_channel_id TEXT NOT NULL,
      relayed_message_id TEXT NOT NULL,
      relayed_channel_id TEXT NOT NULL,
      direction TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const panelColumns = db.prepare('PRAGMA table_info(ticket_panels)').all();
  const hasClosedDmMessage = panelColumns.some((column) => column.name === 'dm_closed_message');

  if (!hasClosedDmMessage) {
    db.exec(`ALTER TABLE ticket_panels ADD COLUMN dm_closed_message TEXT NOT NULL DEFAULT '${DEFAULT_DM_CLOSED_MESSAGE}'`);
  }
};

module.exports = { createSchema };
