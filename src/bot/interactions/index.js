const { MessageFlags } = require('discord.js');
const { CONFIG_TICKET_COMMAND_NAME, SNIPPET_COMMAND_NAME, SETLANG_COMMAND_NAME } = require('../constants');
const { t } = require('../../i18n');
const { handleStaffSlashCommand } = require('../commands/staffCommands');
const { handleTicketConfigCommand } = require('../commands/ticketConfigCommand');
const { handleSnippetCommand, handleSnippetAutocomplete } = require('../commands/snippetCommands');
const { handleSetlangCommand } = require('../commands/setlangCommand');
const { routeButtonInteraction } = require('./buttonRouter');
const { routeModalInteraction } = require('./modalRouter');

const handleInteractionCreate = async (interaction) => {
  try {
    if (interaction.isAutocomplete()) {
      if (interaction.commandName === SNIPPET_COMMAND_NAME) {
        await handleSnippetAutocomplete(interaction);
      }
      return;
    }

    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === CONFIG_TICKET_COMMAND_NAME) {
        await handleTicketConfigCommand(interaction);
        return;
      }

      if (interaction.commandName === SNIPPET_COMMAND_NAME) {
        await handleSnippetCommand(interaction);
        return;
      }

      if (interaction.commandName === SETLANG_COMMAND_NAME) {
        await handleSetlangCommand(interaction);
        return;
      }

      await handleStaffSlashCommand(interaction);
      return;
    }

    if (interaction.isButton() && (await routeButtonInteraction(interaction))) return;

    if (interaction.isModalSubmit() && (await routeModalInteraction(interaction))) return;
  } catch (error) {
    console.error('interactionCreate handler error:', error);
    if (interaction.deferred || interaction.replied) {
      await interaction
        .followUp({ content: t('common.interactionError'), flags: MessageFlags.Ephemeral })
        .catch(() => null);
      return;
    }

    await interaction
      .reply({ content: t('common.interactionError'), flags: MessageFlags.Ephemeral })
      .catch(() => null);
  }
};

module.exports = { handleInteractionCreate };
