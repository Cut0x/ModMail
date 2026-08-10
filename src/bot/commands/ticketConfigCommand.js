const { MessageFlags } = require('discord.js');
const { randomUUID } = require('node:crypto');
const { client } = require('../client');
const { db } = require('../db');
const { isAdministrator } = require('../helpers');
const { buildTicketConfigModal, buildTicketPanelMessage } = require('../ui/ticketPanelUi');
const { TICKET_CONFIG_INPUT_IDS } = require('../constants');

const handleTicketConfigCommand = async (interaction) => {
  if (!interaction.inGuild()) return;

  if (!isAdministrator(interaction.member)) {
    await interaction.reply({
      content: 'You need the Administrator permission to use this command.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const targetChannel = interaction.options.getChannel('channel', true);

  if (
    targetChannel.guildId !== interaction.guildId ||
    !targetChannel.isTextBased?.() ||
    typeof targetChannel.send !== 'function'
  ) {
    await interaction.reply({
      content: 'I could not use that channel as a ticket panel channel.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.showModal(buildTicketConfigModal({
    panelId: randomUUID(),
    channelId: targetChannel.id,
  }));
};

const handleTicketConfigModalSubmit = async (interaction) => {
  if (!interaction.inGuild()) return;

  if (!isAdministrator(interaction.member)) {
    await interaction.reply({
      content: 'You need the Administrator permission to use this action.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  const [, , panelId, channelId] = interaction.customId.split(':');
  const title = interaction.fields.getTextInputValue(TICKET_CONFIG_INPUT_IDS.title).trim();
  const description = interaction.fields.getTextInputValue(TICKET_CONFIG_INPUT_IDS.description).trim();
  const buttonText = interaction.fields.getTextInputValue(TICKET_CONFIG_INPUT_IDS.buttonText).trim();
  const dmMessage = interaction.fields.getTextInputValue(TICKET_CONFIG_INPUT_IDS.dmMessage).trim();
  const dmClosedMessage = interaction.fields.getTextInputValue(TICKET_CONFIG_INPUT_IDS.dmClosedMessage).trim();

  const targetChannel = await client.channels.fetch(channelId).catch(() => null);

  if (
    !targetChannel ||
    targetChannel.guildId !== interaction.guildId ||
    !targetChannel.isTextBased?.() ||
    typeof targetChannel.send !== 'function'
  ) {
    await interaction.editReply({
      content: 'I could not find a text channel from this server with that value.',
    });
    return;
  }

  let panelMessage;
  try {
    panelMessage = await targetChannel.send(
      buildTicketPanelMessage({
        panelId,
        title,
        description,
        buttonText,
      }),
    );
  } catch {
    await interaction.editReply({
      content: `I could not send the ticket panel in <#${targetChannel.id}>. Check my permissions in that channel.`,
    });
    return;
  }

  await db.upsertTicketPanel({
    panelId,
    channelId: targetChannel.id,
    messageId: panelMessage.id,
    title,
    description,
    buttonText,
    dmMessage,
    dmClosedMessage,
  });

  await interaction.editReply({
    content: `Ticket panel sent in <#${targetChannel.id}>.`,
  });
};

module.exports = { handleTicketConfigCommand, handleTicketConfigModalSubmit };
