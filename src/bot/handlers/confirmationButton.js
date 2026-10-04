const { MessageFlags } = require('discord.js');
const { db } = require('../db');
const { t } = require('../../i18n');
const { pendingConfirmations } = require('../state');
const { safeText } = require('../helpers');
const { ensureThreadForUser } = require('../tickets/threadManager');

const handleConfirmationButton = async (interaction) => {
  const parts = interaction.customId.split(':');
  const action = parts[2];
  const userId = parts[3];

  if (interaction.user.id !== userId) {
    await interaction
      .reply({ content: t('confirm.notYours'), flags: MessageFlags.Ephemeral })
      .catch(() => null);
    return;
  }

  const pending = pendingConfirmations.get(userId);

  if (!pending) {
    await interaction.update({ content: t('confirm.expired'), components: [] }).catch(() => null);
    return;
  }

  if (action === 'no') {
    pendingConfirmations.delete(userId);
    await interaction.update({ content: t('confirm.cancelled'), components: [] }).catch(() => null);
    return;
  }

  if (action === 'yes') {
    if (db.isBlocked(userId) || db.isSpamIgnored(userId)) {
      pendingConfirmations.delete(userId);
      await interaction
        .update({ content: t('common.cannotCreateTicketNow'), components: [] })
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
      content: t('relay.fromUser', { tag: user.tag, id: user.id, content: safeText(pending.originalContent) }),
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
      .editReply({ content: t('confirm.messageSent'), components: [] })
      .catch(() => null);
  }
};

module.exports = { handleConfirmationButton };
