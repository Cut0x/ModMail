const { prepareTicketStatements } = require('./tickets');
const { preparePanelStatements } = require('./panels');
const { prepareBlocklistStatements } = require('./blocklist');
const { prepareRelayedMessageStatements } = require('./relayedMessages');
const { prepareCannedResponseStatements } = require('./cannedResponses');
const { prepareSettingsStatements } = require('./settings');

const prepareStatements = (db) => ({
  countRows: db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM tickets) +
      (SELECT COUNT(*) FROM ticket_panels) +
      (SELECT COUNT(*) FROM blocked_users) +
      (SELECT COUNT(*) FROM spam_ignored_users) +
      (SELECT COUNT(*) FROM closed_tickets) +
      (SELECT COUNT(*) FROM canned_responses) AS total
  `),
  ...prepareTicketStatements(db),
  ...preparePanelStatements(db),
  ...prepareBlocklistStatements(db),
  ...prepareRelayedMessageStatements(db),
  ...prepareCannedResponseStatements(db),
  ...prepareSettingsStatements(db),
});

module.exports = { prepareStatements };
