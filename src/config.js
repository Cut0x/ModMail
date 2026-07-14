const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ quiet: true });

const REQUIRED_KEYS = ['DISCORD_TOKEN', 'MODMAIL_GUILD_ID', 'MODMAIL_THREADS_CHANNEL_ID'];

for (const key of REQUIRED_KEYS) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const allowedAutoArchive = new Set([60, 1440, 4320, 10080]);
const parsedAutoArchive = Number.parseInt(process.env.THREAD_AUTO_ARCHIVE_MINUTES ?? '1440', 10);

// Accepts a unicode emoji, or a custom emoji copy-pasted as `<:name:id>` / `<a:name:id>`.
const normalizeEmoji = (value, fallback) => {
  const raw = value?.trim();
  if (!raw) return fallback;

  const customEmojiMatch = raw.match(/^<a?:\w+:(\d+)>$/);
  return customEmojiMatch ? customEmojiMatch[1] : raw;
};

const config = {
  token: process.env.DISCORD_TOKEN,
  guildId: process.env.MODMAIL_GUILD_ID,
  threadsChannelId: process.env.MODMAIL_THREADS_CHANNEL_ID,
  staffRoleId: process.env.STAFF_ROLE_ID || null,
  botActivityPlaying: process.env.BOT_ACTIVITY_PLAYING?.trim() || null,
  threadAutoArchiveMinutes: allowedAutoArchive.has(parsedAutoArchive) ? parsedAutoArchive : 1440,
  dbFilePath: process.env.MODMAIL_SQLITE_FILE || path.join(__dirname, '..', 'data', 'modmail.sqlite'),
  legacyJsonFilePath: process.env.MODMAIL_DB_FILE || path.join(__dirname, '..', 'data', 'modmail.json'),
  logsIgnoredMpUserChannelId: process.env.LOGS_IGNORED_MP_USER_CHANNEL || null,
  reactionSuccessEmoji: normalizeEmoji(process.env.REACTION_SUCCESS_EMOJI, '✅'),
  reactionFailureEmoji: normalizeEmoji(process.env.REACTION_FAILURE_EMOJI, '❌'),
};

module.exports = { config };
