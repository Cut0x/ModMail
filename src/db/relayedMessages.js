const createRelayedMessagesApi = (ctx) => {
  const addRelayedMessage = async ({
    sourceMessageId,
    sourceChannelId,
    relayedMessageId,
    relayedChannelId,
    direction,
  }) => {
    ctx.statements.addRelayedMessage.run(
      sourceMessageId,
      sourceChannelId,
      relayedMessageId,
      relayedChannelId,
      direction,
      new Date().toISOString(),
    );
    ctx.statements.trimRelayedMessages.run();
  };

  const getRelayedMessageBySourceId = (sourceMessageId) =>
    ctx.statements.getRelayedMessageBySourceId.get(sourceMessageId) ?? null;

  return { addRelayedMessage, getRelayedMessageBySourceId };
};

module.exports = { createRelayedMessagesApi };
