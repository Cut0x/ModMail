# ModMail

A self-hosted Discord ModMail bot that lets your members DM the bot to open a private support ticket with your staff team, built with `discord.js` v14 and local SQLite storage.

![Node](https://img.shields.io/badge/node-%3E%3D18.19.1-339933?logo=node.js&logoColor=white)
![discord.js](https://img.shields.io/badge/discord.js-14.26-5865F2?logo=discord&logoColor=white)
![SQLite](https://img.shields.io/badge/storage-SQLite-003B57?logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/license-ISC-blue)
[![GitHub stars](https://img.shields.io/github/stars/Cut0x/ModMail?style=social)](https://github.com/Cut0x/ModMail/stargazers)

> ⭐ **If this project is useful to you, please consider starring the repo!** It helps other server owners find it and motivates future updates.

## Contents

- [Features](#features)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Bot permissions & intents](#bot-permissions--intents)
- [Commands](#commands)
- [Project structure](#project-structure)
- [Ideas & roadmap](#ideas--roadmap)
- [Contributing](#contributing)
- [License](#license)

## Features

- **DM ↔ thread relay**: a user's DM opens a private thread for staff, and every message flows both ways in real time.
- **Confirmation flow**: the first DM from a user asks for a Yes/No confirmation before a ticket is created, to avoid accidental or spam tickets.
- **Live edit sync**: if a user or a staff member edits a message they sent, the relayed copy on the other side is edited too, so both sides always see the same conversation.
- **Ticket panels**: `/config-ticket` lets an admin drop a public button in any channel that opens a modal (reason) and creates a ticket, fully configurable (title, description, DM message, closed-DM message).
- **Typing indicators**: typing in DM shows up as typing in the thread, and vice versa.
- **Delivery reactions**: every relayed message gets a ✅ or ❌ reaction depending on whether delivery succeeded.
- **Block / unblock**: staff can block a user from opening new tickets, right from buttons on the ticket control panel or with `/block` and `/unblock`.
- **Anti-spam auto-ignore**: a user who keeps DMing without answering the confirmation prompt gets automatically ignored, with an optional log channel.
- **Components V2 control panel**: a rich control panel is posted in every thread (Close / Block / Unblock buttons).
- **SQLite persistence**: tickets, panels, blocklist and message mappings survive restarts; upgrading the bot never touches or drops existing data (new tables are additive only).
- **Legacy JSON import**: if you're migrating from an older JSON-based version, it's imported automatically the first time the SQLite database is empty.

## Getting started

### Prerequisites

- Node.js `>= 18.19.1`
- A Discord application with a bot user ([Discord Developer Portal](https://discord.com/developers/applications))

### Install

```bash
git clone https://github.com/Cut0x/ModMail.git
cd ModMail
npm install
```

### Configure

```bash
cp .env.example .env
```

Fill in `.env` (see [Configuration](#configuration) below), then run:

```bash
npm start
```

Use `npm run dev` during development: it restarts automatically on file changes (`node --watch`).

## Configuration

### Required

| Variable | Description |
| --- | --- |
| `DISCORD_TOKEN` | Your bot's token |
| `MODMAIL_GUILD_ID` | The server (guild) ID the bot operates in |
| `MODMAIL_THREADS_CHANNEL_ID` | A regular text channel (`GuildText`) where ticket threads are created |

### Optional

| Variable | Description | Default |
| --- | --- | --- |
| `STAFF_ROLE_ID` | Role mentioned when a new ticket opens; also used to detect staff members | *(none)* |
| `BOT_ACTIVITY_PLAYING` | Sets the bot's status to "Playing …" | *(none)* |
| `THREAD_AUTO_ARCHIVE_MINUTES` | `60`, `1440`, `4320` or `10080` | `1440` |
| `MODMAIL_SQLITE_FILE` | Path to the SQLite database file | `./data/modmail.sqlite` |
| `MODMAIL_DB_FILE` | Legacy JSON file, imported automatically once if the SQLite DB is empty | `./data/modmail.json` |
| `LOGS_IGNORED_MP_USER_CHANNEL` | Channel where auto-ignored DM spammers are logged | *(none)* |
| `REACTION_SUCCESS_EMOJI` | Reaction added when a message is relayed successfully (unicode or `<:name:id>`) | `✅` |
| `REACTION_FAILURE_EMOJI` | Reaction added when relaying fails | `❌` |

## Bot permissions & intents

Enable in the Developer Portal → Bot:

- **Message Content Intent**

Recommended permissions when inviting the bot:

- View Channels
- Send Messages / Send Messages in Threads
- Create Private Threads
- Manage Threads
- Read Message History
- Attach Files
- Use External Emojis *(optional, for custom reaction emojis)*

Server Members intent is **not** required.

## Commands

### Staff (used inside a ModMail thread)

| Command | Description |
| --- | --- |
| `/close [reason]` | Closes the ticket and notifies the user |
| `/block [reason]` | Blocks the user from opening new tickets |
| `/unblock` | Unblocks the user |
| `/help` | Lists available commands |

### Admin

| Command | Description |
| --- | --- |
| `/config-ticket channel:#channel` | Configures and sends a public ticket-opening panel (requires `Administrator`) |

## Project structure

```
src/
├── config.js        # Environment variables & validation
├── index.js          # Entry point, wires everything and logs in
├── db/                # SQLite persistence layer (tickets, panels, blocklist, relayed messages)
└── bot/
    ├── client.js       # Discord client instance
    ├── ui/             # Embeds, modals, buttons, slash command builders
    ├── tickets/        # Thread lifecycle (create, close)
    ├── handlers/       # DM / staff message relay + edit sync
    ├── commands/       # Slash command & modal logic
    ├── interactions/   # Button / modal routing
    └── events/         # Discord event listeners
```

The codebase is kept intentionally split into small, single-purpose files (each well under 150 lines), so it's easy to navigate, review and extend: a good starting point if you want to add your own feature.

## Ideas & roadmap

Nothing here is planned or promised, these are just ideas for anyone who wants to open a PR:

- 🗑️ **Delete sync**: mirror message deletions the same way edits are now mirrored.
- 📄 **Ticket transcripts**: export a closed ticket's conversation as HTML/Markdown when it closes.
- 🏷️ **Tags / categories**: let staff label tickets (billing, bug report, etc.) for easier triage.
- 💬 **Canned responses**: a `/reply <snippet>` command for frequently used answers.
- 🌍 **i18n**: translate bot-facing strings beyond the current English/French mix.
- ⏱️ **SLA reminders**: ping staff if a ticket has gone unanswered for too long.
- 🕵️ **Anonymous staff replies**: an option to sign replies as "Staff" instead of a display name.
- 🐳 **Docker support**: a `Dockerfile` + `docker-compose.yml` for easier self-hosting.
- ✅ **Automated tests**: unit tests for the `db/` layer and handler logic.
- 📊 **Basic stats/dashboard**: ticket volume, response time, per-staff activity.

Have another idea? Open an issue to discuss it before starting a big PR.

## Contributing

Contributions are welcome!

1. Fork the repo and create a branch from `main`.
2. Keep changes focused and files small/single-purpose, matching the existing structure.
3. Test your changes locally (`npm start` against a test server) before opening a PR.
4. Open a PR describing what changed and why.

If you run into a bug or have a feature request, please [open an issue](https://github.com/Cut0x/ModMail/issues).

## License

ISC (see [`package.json`](./package.json)).

---

If this project saved you time, a ⭐ on [the repo](https://github.com/Cut0x/ModMail) goes a long way. Thanks for checking it out!
