const fs = require('node:fs/promises');
const path = require('node:path');
const { AttachmentBuilder } = require('discord.js');
const { config } = require('../../config');

const MAX_MESSAGES = 5000;
const FETCH_PAGE_SIZE = 100;

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const formatContent = (content) => {
  let safe = escapeHtml(content);
  safe = safe.replace(/&lt;@!?(\d+)&gt;/g, '<span class="mention">@$1</span>');
  safe = safe.replace(/&lt;@&amp;(\d+)&gt;/g, '<span class="mention">@$1</span>');
  safe = safe.replace(/&lt;#(\d+)&gt;/g, '<span class="mention">#$1</span>');
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');
  return safe.replace(/\n/g, '<br>');
};

// Fetches the thread's full message history, oldest first. Discord only returns pages of
// up to 100 messages ordered newest-first, so this walks backwards with `before` until the
// thread is exhausted (or MAX_MESSAGES is hit, as a safety valve against pathological threads).
const fetchAllMessages = async (thread) => {
  const all = [];
  let before;

  while (all.length < MAX_MESSAGES) {
    const page = await thread.messages.fetch({ limit: FETCH_PAGE_SIZE, before });
    if (page.size === 0) break;

    all.push(...page.values());
    before = page.last().id;

    if (page.size < FETCH_PAGE_SIZE) break;
  }

  return all.reverse();
};

// The staff control panel is a buttons-only Components V2 message with no text of its own;
// it adds nothing to a conversation transcript.
const isControlPanelMessage = (message) =>
  message.author.bot && !message.content && message.attachments.size === 0 && message.components.length > 0;

const formatTimestamp = (date) => `${new Date(date).toLocaleString('en-US', { timeZone: 'UTC' })} UTC`;

const renderMessage = (message) => {
  const author = escapeHtml(message.member?.displayName ?? message.author.username);
  const avatar = message.author.displayAvatarURL({ size: 64 });
  const timestamp = formatTimestamp(message.createdTimestamp);
  const content = message.content ? `<div class="content">${formatContent(message.content)}</div>` : '';
  const attachments = [...message.attachments.values()]
    .map(
      (attachment) =>
        `<div class="attachment"><a href="${attachment.url}" target="_blank" rel="noopener">${escapeHtml(attachment.name)}</a></div>`,
    )
    .join('');

  return `
    <div class="message">
      <img class="avatar" src="${avatar}" alt="">
      <div class="body">
        <div class="meta-line"><span class="author">${author}</span><span class="timestamp">${timestamp}</span></div>
        ${content}
        ${attachments}
      </div>
    </div>`;
};

const buildTicketTranscriptHtml = async ({ thread, user, ticket, closedByTag, reason }) => {
  const messages = (await fetchAllMessages(thread)).filter((message) => !isControlPanelMessage(message));
  const rows = messages.map(renderMessage).join('\n') || '<p class="empty">No messages.</p>';

  const openedAt = ticket?.openedAt ? formatTimestamp(ticket.openedAt) : 'n/a';
  const closedAt = formatTimestamp(Date.now());

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>ModMail transcript - ${escapeHtml(user.tag)}</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; padding: 24px; background: #313338; color: #dbdee1; font-family: "gg sans", "Helvetica Neue", Arial, sans-serif; }
  .meta-box { background: #2b2d31; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
  .meta-box h1 { margin: 0 0 8px; font-size: 18px; }
  .meta-box p { margin: 2px 0; font-size: 13px; color: #b5bac1; }
  .message { display: flex; gap: 16px; padding: 8px 0; }
  .avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; }
  .body { min-width: 0; }
  .meta-line { display: flex; align-items: baseline; gap: 8px; }
  .author { font-weight: 600; color: #f2f3f5; }
  .timestamp { font-size: 11px; color: #949ba4; }
  .content { white-space: pre-wrap; word-wrap: break-word; line-height: 1.4; }
  .attachment { margin-top: 4px; }
  .attachment a { color: #00a8fc; text-decoration: none; }
  .mention { background: rgba(88, 101, 242, 0.3); color: #c9cdfb; border-radius: 3px; padding: 0 2px; }
  .empty { color: #949ba4; }
  code { background: #2b2d31; padding: 1px 4px; border-radius: 4px; font-family: Consolas, monospace; }
</style>
</head>
<body>
  <div class="meta-box">
    <h1>ModMail ticket transcript</h1>
    <p>User: ${escapeHtml(user.tag)} (${user.id})</p>
    <p>Opened: ${openedAt}</p>
    <p>Closed: ${closedAt} by ${escapeHtml(closedByTag)}</p>
    <p>Reason: ${escapeHtml(reason)}</p>
  </div>
  <div class="messages">
    ${rows}
  </div>
</body>
</html>`;

  const filename = `ticket-${user.id}-${Date.now()}.html`;
  return { html, filename };
};

const saveTranscriptToDisk = async ({ html, filename }) => {
  await fs.mkdir(config.transcriptsDirPath, { recursive: true });
  const filePath = path.join(config.transcriptsDirPath, filename);
  await fs.writeFile(filePath, html, 'utf8');
  return filePath;
};

const toDiscordAttachment = ({ html, filename }) => new AttachmentBuilder(Buffer.from(html, 'utf8'), { name: filename });

module.exports = { buildTicketTranscriptHtml, saveTranscriptToDisk, toDiscordAttachment };
