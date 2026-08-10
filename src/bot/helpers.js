const { PermissionsBitField } = require('discord.js');
const { config } = require('../config');

const safeText = (value) => (value && value.trim().length > 0 ? value : '(no text)');

const reactToMessage = async (message, success) => {
  const emoji = success ? config.reactionSuccessEmoji : config.reactionFailureEmoji;
  if (!emoji) return;
  await message.react(emoji).catch(() => null);
};

const attachmentFiles = (message) => {
  if (!message.attachments?.size) return [];

  return [...message.attachments.values()].map((attachment) => ({
    attachment: attachment.url,
    name: attachment.name ?? `file-${attachment.id}`,
  }));
};

const isStaffMember = (member) => {
  if (!member) return false;

  if (config.staffRoleId) {
    if (member.roles?.cache?.has) {
      return member.roles.cache.has(config.staffRoleId);
    }

    if (Array.isArray(member.roles)) {
      return member.roles.includes(config.staffRoleId);
    }
  }

  if (member.permissions?.has) {
    return member.permissions.has(PermissionsBitField.Flags.ManageMessages);
  }

  if (typeof member.permissions === 'string') {
    return new PermissionsBitField(BigInt(member.permissions)).has(
      PermissionsBitField.Flags.ManageMessages,
    );
  }

  return false;
};

const isAdministrator = (member) => {
  if (!member) return false;

  if (member.permissions?.has) {
    return member.permissions.has(PermissionsBitField.Flags.Administrator);
  }

  if (typeof member.permissions === 'string') {
    return new PermissionsBitField(BigInt(member.permissions)).has(
      PermissionsBitField.Flags.Administrator,
    );
  }

  return false;
};

const isModmailThread = (channel) => {
  return channel?.isThread?.() && channel.parentId === config.threadsChannelId;
};

const buildThreadName = (user) => {
  const base = `modmail-${user.username}`
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/--+/g, '-')
    .slice(0, 70);

  return `${base || 'modmail-user'}-${user.id.slice(-6)}`;
};

module.exports = {
  safeText,
  reactToMessage,
  attachmentFiles,
  isStaffMember,
  isAdministrator,
  isModmailThread,
  buildThreadName,
};
