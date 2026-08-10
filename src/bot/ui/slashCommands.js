const { ChannelType, PermissionsBitField, SlashCommandBuilder } = require('discord.js');
const { CONFIG_TICKET_COMMAND_NAME } = require('../constants');

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
].map((command) => command.toJSON());

const registerSlashCommands = async (guild) => {
  await guild.commands.set(buildSlashCommands());
};

module.exports = { buildSlashCommands, registerSlashCommands };
