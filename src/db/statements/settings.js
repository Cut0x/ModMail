const prepareSettingsStatements = (db) => ({
  getSetting: db.prepare('SELECT value FROM bot_settings WHERE key = ?'),
  setSetting: db.prepare(`
    INSERT INTO bot_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `),
});

module.exports = { prepareSettingsStatements };
