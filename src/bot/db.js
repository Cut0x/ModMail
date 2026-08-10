const { config } = require('../config');
const { createDb } = require('../db');

// Singleton DB instance shared by every bot module. Created immediately, but
// load() (which opens the SQLite file) only runs once in events/ready.js.
const db = createDb(config.dbFilePath, {
  legacyJsonFilePath: config.legacyJsonFilePath,
});

module.exports = { db };
