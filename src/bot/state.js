// userId -> { confirmMessage: Message, originalMessageId, originalChannelId, originalContent, originalFiles, spamCount }
const pendingConfirmations = new Map();

module.exports = { pendingConfirmations };
