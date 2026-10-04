const { ChannelType, PermissionsBitField, SlashCommandBuilder } = require('discord.js');
const { CONFIG_TICKET_COMMAND_NAME, SNIPPET_COMMAND_NAME } = require('../constants');

const buildSlashCommands = () => [
  new SlashCommandBuilder()
    .setName(CONFIG_TICKET_COMMAND_NAME)
    .setDescription('Configure and send a ticket opening panel')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('Channel where the ticket panel will be sent')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    ),
  new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close the current ModMail ticket')
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Reason shown to the user')
        .setRequired(false)
        .setMaxLength(1000),
    ),
  new SlashCommandBuilder()
    .setName('block')
    .setDescription('Block the ticket user from sending ModMail')
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Optional block reason')
        .setRequired(false)
        .setMaxLength(1000),
    ),
  new SlashCommandBuilder()
    .setName('unblock')
    .setDescription('Unblock the ticket user for ModMail'),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available ModMail slash commands'),
  new SlashCommandBuilder()
    .setName(SNIPPET_COMMAND_NAME)
    .setDescription('Manage saved replies for ModMail tickets')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Create or update a saved reply')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Short identifier for this saved reply')
            .setRequired(true)
            .setMaxLength(60),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Delete a saved reply')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Saved reply to delete')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('List all saved replies'))
    .addSubcommand((sub) =>
      sub
        .setName('send')
        .setDescription('Send a saved reply to this ticket')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Saved reply to send')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    ),
].map((command) => command.toJSON());

const registerSlashCommands = async (guild) => {
  await guild.commands.set(buildSlashCommands());
};

module.exports = { buildSlashCommands, registerSlashCommands };
