const { Events, ActivityType } = require('discord.js');
const { config } = require('../../config');
const { client } = require('../client');
const { db } = require('../db');
const { getModmailParentChannel } = require('../tickets/threadManager');
const { registerSlashCommands } = require('../ui/slashCommands');

const registerReadyEvent = () => {
  client.once(Events.ClientReady, async () => {
    await db.load();

    const guild = await client.guilds.fetch(config.guildId).catch(() => null);
    if (!guild) {
      throw new Error('MODMAIL_GUILD_ID is invalid or bot is not in that guild.');
    }

    await getModmailParentChannel();
    await registerSlashCommands(guild);
    if (config.botActivityPlaying && client.user) {
      client.user.setActivity(config.botActivityPlaying, { type: ActivityType.Playing });
    }

    console.log(`Logged in as ${client.user.tag}`);
    console.log(`ModMail guild: ${guild.name} (${guild.id})`);
    console.log(`SQLite DB: ${db.dbPath}`);
    console.log('Slash commands registered: /config-ticket, /close, /block, /unblock, /help');
    if (config.botActivityPlaying) {
      console.log(`Bot activity: Playing ${config.botActivityPlaying}`);
    }
  });
};

module.exports = { registerReadyEvent };
