const prepareTicketStatements = (db) => ({
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

module.exports = { prepareTicketStatements };
