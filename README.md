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
- `REACTION_SUCCESS_EMOJI` / `REACTION_FAILURE_EMOJI` (reaction added to a message once relayed; unicode emoji or custom emoji pasted as `<:name:id>`; default `✅` / `❌`)

Example:

- `BOT_ACTIVITY_PLAYING=your ModMail tickets` -> profile shows `Playing your ModMail tickets`

## Run

```bash
npm start
```

## Behavior

- A user sends a DM to the bot -> the bot posts an announcement in `MODMAIL_THREADS_CHANNEL_ID` (with staff role mention if configured), then creates a thread
- An administrator can run `/config-ticket channel:#channel` to send a public ticket panel with a green button
- The ticket panel button opens a modal asking the user why they are opening a ticket, then creates or reuses the user's ModMail thread
- The DM sent after a panel ticket is opened, and the response shown when the user's DMs are closed, are configurable from `/config-ticket`
- User messages are relayed into the thread
- Staff messages in the thread are relayed to the user via DM, signed with the display name of the staff member who wrote it (never a generic "Staff" label)
- Typing indicators are relayed in both directions using Discord's native typing indicator: the user typing in DM triggers the bot's typing indicator in the thread, and staff typing in the thread triggers the bot's typing indicator in the user's DM
- Every relayed message gets a reaction on the original message: `REACTION_SUCCESS_EMOJI` if it was delivered, `REACTION_FAILURE_EMOJI` if it failed (e.g. the user has DMs closed)
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

- `/config-ticket channel:#channel` (requires `Administrator`)

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
