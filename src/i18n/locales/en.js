module.exports = {
  common: {
    notAllowedCommand: 'You are not allowed to use this command.',
    notAllowedAction: 'You are not allowed to use this action.',
    threadOnly: 'This command can only be used inside a ModMail thread.',
    noUserLinked: 'No user linked to this thread.',
    cannotDmUser: 'Cannot DM the target user (not found).',
    noReasonProvided: 'No reason provided.',
    noText: '(no text)',
    editedSuffix: '\n*(edited)*',
    cannotCreateTicketNow: 'You cannot create a ticket at this time.',
    internalError: 'An internal error occurred while handling your message. Please try again later.',
    interactionError: 'An error occurred while processing this action.',
  },

  help: {
    list: [
      '/close [reason]',
      '/block [reason]',
      '/unblock',
      '/snippet add|remove|list|send',
      '/setlang <locale>',
      '/help',
    ],
  },

  block: {
    blocked: 'User {userId} has been blocked.',
    unblocked: 'User {userId} has been unblocked.',
    blockedDm: 'You are currently blocked from this ModMail. Contact staff another way if needed.',
  },

  ticket: {
    closedFor: 'Ticket closed for user {userId}.',
    closeFailed: 'Unable to close ticket.',
    closedByCommandReason: 'Closed by staff command.',
    closeActionMismatch: 'This close action does not match the current thread.',
    closedMessageToUser: 'Your ModMail ticket has been closed.\nReason: {reason}',
    closedMessageToThread: 'Ticket closed by <@{closedBy}>.\nReason: {reason}',
    noMappingFound: 'No active ticket mapping found for this thread.',
    memberLeft:
      '**{tag}** has left the server. Messages sent in this thread will no longer be delivered to them. You can close this ticket.',
    memberRejoined:
      '**{tag}** has rejoined the server. Messages sent in this thread will be delivered to them again.',
    deliveryBlockedMemberLeft: 'This user has left the server; the message cannot be delivered.',
    openedFromPanel: '**Ticket opened from panel**\nUser: <@{userId}> (`{userId}`)\nReason: {reason}',
    openedConfirmation: 'Your ticket has been opened. Check your DMs to talk with support.',
    panelNotConfigured: 'This ticket panel is no longer configured.',
    announcement: '{mentionPrefix}New ModMail ticket from **{tag}** (`{id}`).',
  },

  confirm: {
    prompt: 'Do you want to create a ticket with the staff team?',
    yes: 'Yes',
    no: 'No',
    notYours: 'This confirmation does not belong to you.',
    expired: 'This confirmation is no longer valid.',
    cancelled: 'Ticket creation cancelled.',
    messageSent: 'Your message has been sent to the staff team. We will reply here soon.',
    spamIgnored: 'You have been ignored for sending too many messages without responding.',
  },

  relay: {
    fromUser: '**From {tag}** ({id})\n{content}',
    staffMessage: '**{staffName}:** {content}',
    staffAttachment: '**{staffName} sent an attachment.**',
  },

  controlPanel: {
    header: '## ModMail Ticket\nUser: <@{id}>\nID: `{id}`',
    closeButton: 'Close ticket',
    closeDescription: 'Close this ticket.',
    blockButtonBlocked: 'User blocked',
    blockButtonActive: 'Block user',
    blockDescription: 'Block incoming DMs from this user.',
    unblockButtonActive: 'Unblock user',
    unblockButtonBlocked: 'User not blocked',
    unblockDescription: 'Allow incoming DMs again.',
  },

  closeModal: {
    label: 'Close reason',
    placeholder: 'Reason shown to the user',
    title: 'Close ModMail Ticket',
  },

  ticketPanelAdmin: {
    needAdminCommand: 'You need the Administrator permission to use this command.',
    needAdminAction: 'You need the Administrator permission to use this action.',
    invalidChannel: 'I could not use that channel as a ticket panel channel.',
    channelNotFound: 'I could not find a text channel from this server with that value.',
    sendFailed: 'I could not send the ticket panel in <#{channelId}>. Check my permissions in that channel.',
    panelSent: 'Ticket panel sent in <#{channelId}>.',
    titleLabel: 'Panel title',
    titlePlaceholder: 'Open a support ticket',
    descriptionLabel: 'Panel description',
    descriptionPlaceholder: 'Click the button below to contact support.',
    buttonTextLabel: 'Button text',
    buttonTextPlaceholder: 'Open ticket',
    dmMessageLabel: 'DM message after ticket opens',
    dmMessagePlaceholder: 'Your ticket is open. To talk with support, send your messages here.',
    dmClosedMessageLabel: 'Message when DMs are closed',
    dmClosedMessagePlaceholder: 'Your DMs are closed.',
    modalTitle: 'Configure ticket panel',
  },

  ticketOpen: {
    reasonLabel: 'Ticket reason',
    reasonPlaceholder: 'Explain why you are opening this ticket.',
    reasonModalTitle: 'Open a support ticket',
  },

  snippet: {
    nameInvalid: 'Saved reply names can only contain letters, numbers, dashes and underscores.',
    deleted: 'Saved reply "{name}" has been deleted.',
    notFound: 'No saved reply named "{name}".',
    emptyList: 'No saved replies yet. Use /snippet add to create one.',
    contentEmpty: 'Saved reply content cannot be empty.',
    saved: 'Saved reply "{name}" has been saved.',
    contentLabel: 'Content',
    modalTitle: 'Saved reply: {name}',
  },

  setlang: {
    notAdmin: 'You need the Administrator permission to use this command.',
    updated: 'Bot language set to {localeName}.',
  },
};
