const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { boolToInt } = require('./mappers');
const { DEFAULT_DM_CLOSED_MESSAGE } = require('./constants');

const normalizeLegacyState = (raw) => ({
  ticketsByUser: raw?.ticketsByUser && typeof raw.ticketsByUser === 'object' ? raw.ticketsByUser : {},
  ticketsByThread: raw?.ticketsByThread && typeof raw.ticketsByThread === 'object' ? raw.ticketsByThread : {},
  ticketPanels: raw?.ticketPanels && typeof raw.ticketPanels === 'object' ? raw.ticketPanels : {},
  blockedUsers: raw?.blockedUsers && typeof raw.blockedUsers === 'object' ? raw.blockedUsers : {},
  spamIgnoredUsers: raw?.spamIgnoredUsers && typeof raw.spamIgnoredUsers === 'object' ? raw.spamIgnoredUsers : {},
  closedTickets: Array.isArray(raw?.closedTickets) ? raw.closedTickets : [],
});

const importLegacyJsonIfNeeded = async (ctx, { legacyJsonPath, absolutePath }) => {
  if (!legacyJsonPath || !fs.existsSync(legacyJsonPath)) return;
  if (path.resolve(legacyJsonPath) === absolutePath) return;
  if (ctx.statements.countRows.get().total > 0) return;

  const raw = await fsp.readFile(legacyJsonPath, 'utf8');
  const state = normalizeLegacyState(JSON.parse(raw));

  ctx.runTransaction(() => {
    for (const ticket of Object.values(state.ticketsByUser)) {
      const now = new Date().toISOString();
      ctx.statements.upsertTicket.run(
        ticket.userId,
        ticket.threadId,
        ticket.guildId,
        ticket.openedAt ?? now,
        ticket.lastMessageAt ?? now,
        boolToInt(ticket.welcomed),
      );
    }

    for (const panel of Object.values(state.ticketPanels)) {
      const now = new Date().toISOString();
      ctx.statements.upsertTicketPanel.run(
        panel.panelId,
        panel.channelId,
        panel.messageId ?? null,
        panel.title,
        panel.description,
        panel.buttonText,
        panel.dmMessage,
        panel.dmClosedMessage ?? DEFAULT_DM_CLOSED_MESSAGE,
        panel.createdAt ?? now,
        panel.updatedAt ?? now,
      );
    }

    for (const blocked of Object.values(state.blockedUsers)) {
      ctx.statements.blockUser.run(
        blocked.userId,
        blocked.blockedBy,
        blocked.blockedAt ?? new Date().toISOString(),
        blocked.reason ?? null,
      );
    }

    for (const ignored of Object.values(state.spamIgnoredUsers)) {
      ctx.statements.addSpamIgnoredUser.run(ignored.userId, ignored.ignoredAt ?? new Date().toISOString());
    }

    for (const ticket of state.closedTickets) {
      ctx.statements.insertClosedTicket.run(
        ticket.userId,
        ticket.threadId,
        ticket.guildId,
        ticket.openedAt ?? new Date().toISOString(),
        ticket.lastMessageAt ?? new Date().toISOString(),
        ticket.closedAt ?? new Date().toISOString(),
        ticket.closedBy,
        boolToInt(ticket.welcomed),
      );
    }
  });
};

module.exports = { importLegacyJsonIfNeeded };
