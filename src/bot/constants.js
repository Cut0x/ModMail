const AUTO_ARCHIVE_VALUES = new Set([60, 1440, 4320, 10080]);
const CLOSE_MODAL_PREFIX = 'modmail:closemodal';
const CLOSE_REASON_INPUT_ID = 'close_reason';
const STAFF_COMMAND_NAMES = new Set(['close', 'block', 'unblock', 'help']);
const CONFIG_TICKET_COMMAND_NAME = 'config-ticket';
const TICKET_CONFIG_MODAL_PREFIX = 'modmail:ticketconfig';
const TICKET_OPEN_BUTTON_PREFIX = 'modmail:ticketopen';
const TICKET_REASON_MODAL_PREFIX = 'modmail:ticketreason';
const TICKET_CONFIG_INPUT_IDS = {
  title: 'ticket_title',
  description: 'ticket_description',
  buttonText: 'ticket_button_text',
  dmMessage: 'ticket_dm_message',
  dmClosedMessage: 'ticket_dm_closed_message',
};
const TICKET_REASON_INPUT_ID = 'ticket_reason';
const CONFIRM_PREFIX = 'modmail:confirm';
const SPAM_THRESHOLD = 3;
const EDITED_SUFFIX = '\n*(edited)*';

module.exports = {
  AUTO_ARCHIVE_VALUES,
  CLOSE_MODAL_PREFIX,
  CLOSE_REASON_INPUT_ID,
  STAFF_COMMAND_NAMES,
  CONFIG_TICKET_COMMAND_NAME,
  TICKET_CONFIG_MODAL_PREFIX,
  TICKET_OPEN_BUTTON_PREFIX,
  TICKET_REASON_MODAL_PREFIX,
  TICKET_CONFIG_INPUT_IDS,
  TICKET_REASON_INPUT_ID,
  CONFIRM_PREFIX,
  SPAM_THRESHOLD,
  EDITED_SUFFIX,
};
