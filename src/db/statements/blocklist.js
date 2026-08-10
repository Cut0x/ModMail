const prepareBlocklistStatements = (db) => ({
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
  allBlockedUsers: db.prepare(`
    SELECT user_id AS userId, blocked_by AS blockedBy, blocked_at AS blockedAt, reason
    FROM blocked_users
  `),
  allSpamIgnoredUsers: db.prepare(`
    SELECT user_id AS userId, ignored_at AS ignoredAt
    FROM spam_ignored_users
  `),
});

module.exports = { prepareBlocklistStatements };
