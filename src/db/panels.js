const { DEFAULT_DM_CLOSED_MESSAGE } = require('./constants');

const createPanelsApi = (ctx) => {
  const getTicketPanel = (panelId) => ctx.statements.getTicketPanel.get(panelId) ?? null;

  const upsertTicketPanel = async ({
    panelId,
    channelId,
    messageId = null,
    title,
    description,
    buttonText,
    dmMessage,
    dmClosedMessage = DEFAULT_DM_CLOSED_MESSAGE,
  }) => {
    const existing = getTicketPanel(panelId);
    const now = new Date().toISOString();

    ctx.statements.upsertTicketPanel.run(
      panelId,
      channelId,
      messageId,
      title,
      description,
      buttonText,
      dmMessage,
      dmClosedMessage,
      existing?.createdAt ?? now,
      now,
    );

    return getTicketPanel(panelId);
  };

  return { getTicketPanel, upsertTicketPanel };
};

module.exports = { createPanelsApi };
