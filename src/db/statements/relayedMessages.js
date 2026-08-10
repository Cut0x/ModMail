const prepareRelayedMessageStatements = (db) => ({
  addRelayedMessage: db.prepare(`
    INSERT INTO relayed_messages (
      source_message_id,
      source_channel_id,
      relayed_message_id,
      relayed_channel_id,
      direction,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(source_message_id) DO UPDATE SET
      source_channel_id = excluded.source_channel_id,
      relayed_message_id = excluded.relayed_message_id,
      relayed_channel_id = excluded.relayed_channel_id,
      direction = excluded.direction,
      created_at = excluded.created_at
  `),
  getRelayedMessageBySourceId: db.prepare(`
    SELECT
      source_message_id AS sourceMessageId,
      source_channel_id AS sourceChannelId,
      relayed_message_id AS relayedMessageId,
      relayed_channel_id AS relayedChannelId,
      direction,
      created_at AS createdAt
    FROM relayed_messages
    WHERE source_message_id = ?
  `),
  trimRelayedMessages: db.prepare(`
    DELETE FROM relayed_messages
    WHERE rowid NOT IN (
      SELECT rowid FROM relayed_messages
      ORDER BY rowid DESC
      LIMIT 10000
    )
  `),
});

module.exports = { prepareRelayedMessageStatements };
