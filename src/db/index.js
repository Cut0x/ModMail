const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const { createSchema } = require('./schema');
const { prepareStatements } = require('./statements');
const { createTransactionRunner } = require('./transaction');
const { createTicketsApi } = require('./tickets');
const { createPanelsApi } = require('./panels');
const { createBlocklistApi } = require('./blocklist');
const { createRelayedMessagesApi } = require('./relayedMessages');
const { createStateReader } = require('./state');
const { importLegacyJsonIfNeeded } = require('./legacyImport');

function createDb(dbFilePath, options = {}) {
  const absolutePath = path.resolve(dbFilePath);
  const directory = path.dirname(absolutePath);
  const legacyJsonPath = options.legacyJsonFilePath ? path.resolve(options.legacyJsonFilePath) : null;

  // Shared mutable context: db/statements are only assigned once load() runs,
  // but every domain API below is built up front and simply reads ctx.db /
  // ctx.statements at call time, so the field's late assignment is fine.
  const ctx = { db: null, statements: null };
  ctx.runTransaction = createTransactionRunner(ctx);

  const tickets = createTicketsApi(ctx);
  const panels = createPanelsApi(ctx);
  const blocklist = createBlocklistApi(ctx);
  const relayedMessages = createRelayedMessagesApi(ctx);
  const getState = createStateReader(ctx);

  const load = async () => {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    ctx.db = new Database(absolutePath);
    createSchema(ctx.db);
    ctx.statements = prepareStatements(ctx.db);

    await importLegacyJsonIfNeeded(ctx, { legacyJsonPath, absolutePath });

    return getState();
  };

  return {
    load,
    ...tickets,
    ...panels,
    ...blocklist,
    ...relayedMessages,
    getState,
    dbPath: absolutePath,
  };
}

module.exports = { createDb };
