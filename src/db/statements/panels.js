const preparePanelStatements = (db) => ({
  getTicketPanel: db.prepare(`
    SELECT
      panel_id AS panelId,
      channel_id AS channelId,
      message_id AS messageId,
      title,
      description,
      button_text AS buttonText,
      dm_message AS dmMessage,
      dm_closed_message AS dmClosedMessage,
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
      dm_closed_message,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(panel_id) DO UPDATE SET
      channel_id = excluded.channel_id,
      message_id = excluded.message_id,
      title = excluded.title,
      description = excluded.description,
      button_text = excluded.button_text,
      dm_message = excluded.dm_message,
      dm_closed_message = excluded.dm_closed_message,
      updated_at = excluded.updated_at
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
      dm_closed_message AS dmClosedMessage,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM ticket_panels
  `),
});

module.exports = { preparePanelStatements };
