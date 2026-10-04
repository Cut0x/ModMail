module.exports = {
  common: {
    notAllowedCommand: "Vous n'êtes pas autorisé à utiliser cette commande.",
    notAllowedAction: "Vous n'êtes pas autorisé à effectuer cette action.",
    threadOnly: 'Cette commande ne peut être utilisée que dans un fil ModMail.',
    noUserLinked: 'Aucun utilisateur lié à ce fil.',
    cannotDmUser: "Impossible d'envoyer un MP à cet utilisateur (introuvable).",
    noReasonProvided: 'Aucune raison fournie.',
    noText: '(aucun texte)',
    editedSuffix: '\n*(modifié)*',
    cannotCreateTicketNow: "Vous ne pouvez pas créer de ticket pour le moment.",
    internalError: "Une erreur interne est survenue lors du traitement de votre message. Veuillez réessayer plus tard.",
    interactionError: "Une erreur est survenue lors du traitement de cette action.",
  },

  help: {
    list: [
      '/close [raison]',
      '/block [raison]',
      '/unblock',
      '/snippet add|remove|list|send',
      '/setlang <langue>',
      '/help',
    ],
  },

  block: {
    blocked: "L'utilisateur {userId} a été bloqué.",
    unblocked: "L'utilisateur {userId} a été débloqué.",
    blockedDm: "Vous êtes actuellement bloqué sur ce ModMail. Contactez le staff par un autre moyen si besoin.",
  },

  ticket: {
    closedFor: "Ticket fermé pour l'utilisateur {userId}.",
    closeFailed: 'Impossible de fermer le ticket.',
    closedByCommandReason: 'Fermé via une commande du staff.',
    closeActionMismatch: 'Cette action de fermeture ne correspond pas au fil actuel.',
    closedMessageToUser: 'Votre ticket ModMail a été fermé.\nRaison : {reason}',
    closedMessageToThread: 'Ticket fermé par <@{closedBy}>.\nRaison : {reason}',
    noMappingFound: 'Aucun ticket actif associé à ce fil.',
    memberLeft:
      '**{tag}** a quitté le serveur. Les messages envoyés dans ce fil ne lui seront plus délivrés. Vous pouvez fermer ce ticket.',
    memberRejoined:
      '**{tag}** a rejoint le serveur à nouveau. Les messages envoyés dans ce fil lui seront de nouveau délivrés.',
    deliveryBlockedMemberLeft: "Cet utilisateur a quitté le serveur ; le message ne peut pas être délivré.",
    openedFromPanel: '**Ticket ouvert depuis le panneau**\nUtilisateur : <@{userId}> (`{userId}`)\nRaison : {reason}',
    openedConfirmation: 'Votre ticket a été ouvert. Consultez vos MP pour échanger avec le support.',
    panelNotConfigured: "Ce panneau de ticket n'est plus configuré.",
    announcement: '{mentionPrefix}Nouveau ticket ModMail de **{tag}** (`{id}`).',
  },

  confirm: {
    prompt: "Voulez-vous créer un ticket avec l'équipe du staff ?",
    yes: 'Oui',
    no: 'Non',
    notYours: 'Cette confirmation ne vous appartient pas.',
    expired: "Cette confirmation n'est plus valide.",
    cancelled: 'Création du ticket annulée.',
    messageSent: "Votre message a été transmis à l'équipe du staff. Nous vous répondrons ici bientôt.",
    spamIgnored: 'Vous avez été ignoré pour avoir envoyé trop de messages sans répondre à la confirmation.',
  },

  relay: {
    fromUser: '**De {tag}** ({id})\n{content}',
    staffMessage: '**{staffName} :** {content}',
    staffAttachment: '**{staffName} a envoyé une pièce jointe.**',
  },

  controlPanel: {
    header: '## Ticket ModMail\nUtilisateur : <@{id}>\nID : `{id}`',
    closeButton: 'Fermer le ticket',
    closeDescription: 'Fermer ce ticket.',
    blockButtonBlocked: 'Utilisateur bloqué',
    blockButtonActive: "Bloquer l'utilisateur",
    blockDescription: 'Bloquer les MP entrants de cet utilisateur.',
    unblockButtonActive: "Débloquer l'utilisateur",
    unblockButtonBlocked: 'Utilisateur non bloqué',
    unblockDescription: 'Autoriser de nouveau les MP entrants.',
  },

  closeModal: {
    label: 'Raison de fermeture',
    placeholder: "Raison affichée à l'utilisateur",
    title: 'Fermer le ticket ModMail',
  },

  ticketPanelAdmin: {
    needAdminCommand: "Vous devez avoir la permission Administrateur pour utiliser cette commande.",
    needAdminAction: "Vous devez avoir la permission Administrateur pour effectuer cette action.",
    invalidChannel: "Je n'ai pas pu utiliser ce salon comme salon de panneau de ticket.",
    channelNotFound: "Je n'ai pas trouvé de salon textuel de ce serveur avec cette valeur.",
    sendFailed: "Je n'ai pas pu envoyer le panneau de ticket dans <#{channelId}>. Vérifiez mes permissions dans ce salon.",
    panelSent: 'Panneau de ticket envoyé dans <#{channelId}>.',
    titleLabel: 'Titre du panneau',
    titlePlaceholder: 'Ouvrir un ticket de support',
    descriptionLabel: 'Description du panneau',
    descriptionPlaceholder: 'Cliquez sur le bouton ci-dessous pour contacter le support.',
    buttonTextLabel: 'Texte du bouton',
    buttonTextPlaceholder: 'Ouvrir un ticket',
    dmMessageLabel: "Message en MP après l'ouverture du ticket",
    dmMessagePlaceholder: 'Votre ticket est ouvert. Pour échanger avec le support, envoyez vos messages ici.',
    dmClosedMessageLabel: 'Message quand les MP sont fermés',
    dmClosedMessagePlaceholder: 'Vos messages privés sont fermés.',
    modalTitle: 'Configurer le panneau de ticket',
  },

  ticketOpen: {
    reasonLabel: 'Raison du ticket',
    reasonPlaceholder: "Expliquez pourquoi vous ouvrez ce ticket.",
    reasonModalTitle: 'Ouvrir un ticket de support',
  },

  snippet: {
    nameInvalid: 'Les noms de réponse préenregistrée ne peuvent contenir que des lettres, chiffres, tirets et underscores.',
    deleted: 'La réponse préenregistrée « {name} » a été supprimée.',
    notFound: 'Aucune réponse préenregistrée nommée « {name} ».',
    emptyList: 'Aucune réponse préenregistrée pour le moment. Utilisez /snippet add pour en créer une.',
    contentEmpty: 'Le contenu de la réponse préenregistrée ne peut pas être vide.',
    saved: 'La réponse préenregistrée « {name} » a été enregistrée.',
    contentLabel: 'Contenu',
    modalTitle: 'Réponse préenregistrée : {name}',
  },

  setlang: {
    notAdmin: "Vous devez avoir la permission Administrateur pour utiliser cette commande.",
    updated: 'La langue du bot a été réglée sur {localeName}.',
  },
};
