const { MessageFlags } = require('discord.js');
const { CONFIG_TICKET_COMMAND_NAME } = require('../constants');
const { handleStaffSlashCommand } = require('../commands/staffCommands');
const { handleTicketConfigCommand } = require('../commands/ticketConfigCommand');
const { routeButtonInteraction } = require('./buttonRouter');
const { routeModalInteraction } = require('./modalRouter');

const handleInteractionCreate = async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === CONFIG_TICKET_COMMAND_NAME) {
        await handleTicketConfigCommand(interaction);
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
        .followUp({ content: 'An error occurred while processing this action.', flags: MessageFlags.Ephemeral })
        .catch(() => null);
      return;
    }

    await interaction
      .reply({ content: 'An error occurred while processing this action.', flags: MessageFlags.Ephemeral })
      .catch(() => null);
  }
};

module.exports = { handleInteractionCreate };
