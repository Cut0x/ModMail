const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config();

const REQUIRED_KEYS = ['DISCORD_TOKEN', 'MODMAIL_GUILD_ID', 'MODMAIL_THREADS_CHANNEL_ID'];

for (const key of REQUIRED_KEYS) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const allowedAutoArchive = new Set([60, 1440, 4320, 10080]);
const parsedAutoArchive = Number.parseInt(process.env.THREAD_AUTO_ARCHIVE_MINUTES ?? '1440', 10);

const config = {
  token: process.env.DISCORD_TOKEN,
  guildId: process.env.MODMAIL_GUILD_ID,
  threadsChannelId: process.env.MODMAIL_THREADS_CHANNEL_ID,
  staffRoleId: process.env.STAFF_ROLE_ID || null,
  prefix: process.env.MODMAIL_PREFIX || '!',
  threadAutoArchiveMinutes: allowedAutoArchive.has(parsedAutoArchive) ? parsedAutoArchive : 1440,
  dbFilePath: process.env.MODMAIL_DB_FILE || path.join(__dirname, '..', 'data', 'modmail.json'),
};

module.exports = { config };
