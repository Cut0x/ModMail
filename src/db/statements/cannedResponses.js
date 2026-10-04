const prepareCannedResponseStatements = (db) => ({
  getCannedResponse: db.prepare(`
    SELECT
      name,
      content,
      created_by AS createdBy,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM canned_responses
    WHERE name = ?
  `),
  upsertCannedResponse: db.prepare(`
    INSERT INTO canned_responses (name, content, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      content = excluded.content,
      created_by = excluded.created_by,
      updated_at = excluded.updated_at
  `),
  deleteCannedResponse: db.prepare('DELETE FROM canned_responses WHERE name = ?'),
  allCannedResponses: db.prepare(`
    SELECT
      name,
      content,
      created_by AS createdBy,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM canned_responses
    ORDER BY name ASC
  `),
});

module.exports = { prepareCannedResponseStatements };
