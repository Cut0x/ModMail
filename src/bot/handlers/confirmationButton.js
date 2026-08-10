const { MessageFlags } = require('discord.js');
const { db } = require('../db');
const { pendingConfirmations } = require('../state');
const { safeText } = require('../helpers');
const { ensureThreadForUser } = require('../tickets/threadManager');

const handleConfirmationButton = async (interaction) => {
  const parts = interaction.customId.split(':');
  const action = parts[2];
  const userId = parts[3];

  if (interaction.user.id !== userId) {
    await interaction
      .reply({ content: 'This confirmation does not belong to you.', flags: MessageFlags.Ephemeral })
      .catch(() => null);
    return;
  }

  const pending = pendingConfirmations.get(userId);

  if (!pending) {
    await interaction.update({ content: 'This confirmation is no longer valid.', components: [] }).catch(() => null);
    return;
  }

  if (action === 'no') {
    pendingConfirmations.delete(userId);
    await interaction.update({ content: 'Ticket creation cancelled.', components: [] }).catch(() => null);
    return;
  }

  if (action === 'yes') {
    if (db.isBlocked(userId) || db.isSpamIgnored(userId)) {
      pendingConfirmations.delete(userId);
      await interaction
        .update({ content: 'You cannot create a ticket at this time.', components: [] })
        .catch(() => null);
      return;
    }

    pendingConfirmations.delete(userId);
    await interaction.deferUpdate().catch(() => null);

    const user = interaction.user;
    const thread = await ensureThreadForUser(user);
    await db.touchTicketForUser(user.id);

    const ticket = db.getTicketByUserId(user.id);
    if (ticket && !ticket.welcomed) {
      await db.markTicketWelcomed(user.id);
    }

    const relayedMessage = await thread.send({
      content: `**From ${user.tag}** (${user.id})\n${safeText(pending.originalContent)}`,
      files: pending.originalFiles,
      allowedMentions: { parse: [] },
    });

    if (pending.originalMessageId && pending.originalChannelId) {
      await db.addRelayedMessage({
        sourceMessageId: pending.originalMessageId,
        sourceChannelId: pending.originalChannelId,
        relayedMessageId: relayedMessage.id,
        relayedChannelId: thread.id,
        direction: 'dm_to_thread',
      });
    }

    await interaction
      .editReply({ content: 'Your message has been sent to the staff team. We will reply here soon.', components: [] })
      .catch(() => null);
  }
};

module.exports = { handleConfirmationButton };
