# ModMail (Node.js + discord.js + Components V2)

ModMail bot built with `discord.js` and local SQLite storage.

## Stack

- Node.js 24+
- discord.js `14.26.4`
- Discord Components V2 (`MessageFlags.IsComponentsV2` + `ContainerBuilder`)
- SQLite database (`data/modmail.sqlite`)

## Installation

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env`
2. Fill in the values

Required variables:

- `DISCORD_TOKEN`
- `MODMAIL_GUILD_ID`
- `MODMAIL_THREADS_CHANNEL_ID` (must be a regular text channel: `GuildText`)

Optional variables:

- `STAFF_ROLE_ID` (recommended, used to mention staff when a ticket opens)
- `BOT_ACTIVITY_PLAYING` (sets the bot status as **Playing ...**)
- `THREAD_AUTO_ARCHIVE_MINUTES` (`60`, `1440`, `4320`, `10080`)
- `MODMAIL_SQLITE_FILE` (default: `./data/modmail.sqlite`)
- `MODMAIL_DB_FILE` (optional legacy JSON file imported automatically when the SQLite database is empty)

Example:

- `BOT_ACTIVITY_PLAYING=your ModMail tickets` -> profile shows `Playing your ModMail tickets`

## Run

```bash
npm start
```

## Behavior

- A user sends a DM to the bot -> the bot posts an announcement in `MODMAIL_THREADS_CHANNEL_ID` (with staff role mention if configured), then creates a thread
- An administrator can run `/config-ticket` and choose the target channel in the modal to send a public ticket panel with a green button
- The ticket panel button opens a modal asking the user why they are opening a ticket, then creates or reuses the user's ModMail thread
- The DM sent after a panel ticket is opened is configurable from `/config-ticket`
- User messages are relayed into the thread
- Staff messages in the thread are relayed to the user via DM
- A Components V2 control panel is posted in each thread with buttons:
- `Close ticket` (opens a modal to enter a reason)
- `Block user`
- `Unblock user`

## Staff Slash Commands (inside a ModMail thread)

- `/close [reason]`
- `/block [reason]`
- `/unblock`
- `/help`

## Admin Slash Commands

- `/config-ticket` (requires `Administrator`)

## Recommended Bot Permissions

- View Channels
- Send Messages
- Create Private Threads
- Send Messages in Threads
- Manage Threads
- Read Message History
- Attach Files
- Use External Emojis (optional)
- Message Content intent enabled (Developer Portal)
- Server Members intent not required
