# ModMail (Node.js + discord.js + Components V2)

Bot ModMail base sur `discord.js` avec stockage JSON local.

## Stack

- Node.js
- discord.js `14.26.4`
- Discord Components V2 (`MessageFlags.IsComponentsV2` + `ContainerBuilder`)
- JSON database (`data/modmail.json`)

## Installation

```bash
npm install
```

## Configuration

1. Copier `.env.example` vers `.env`
2. Remplir les valeurs

Variables obligatoires:

- `DISCORD_TOKEN`
- `MODMAIL_GUILD_ID`
- `MODMAIL_THREADS_CHANNEL_ID` (doit etre un salon texte classique `GuildText`)

Variables optionnelles:

- `STAFF_ROLE_ID` (recommande pour mentionner le staff a l ouverture du ticket)
- `THREAD_AUTO_ARCHIVE_MINUTES` (`60`, `1440`, `4320`, `10080`)
- `MODMAIL_DB_FILE` (defaut `./data/modmail.json`)

## Lancer

```bash
npm start
```

## Fonctionnement

- Un utilisateur envoie un DM au bot -> le bot envoie d abord une annonce dans `MODMAIL_THREADS_CHANNEL_ID` (avec mention du role staff si configure), puis cree le thread
- Les messages utilisateur sont relayes dans le thread
- Les messages staff dans le thread sont relayes en DM vers l utilisateur
- Un panneau Components V2 est poste dans chaque thread avec boutons:
  - Close ticket (ouvre une modal pour saisir la raison)
  - Block user
  - Unblock user

## Slash commands staff (dans un thread ModMail)

- `/close [reason]`
- `/block [reason]`
- `/unblock`
- `/help`

## Permissions bot recommandees

- View Channels
- Send Messages
- Create Private Threads
- Send Messages in Threads
- Manage Threads
- Read Message History
- Attach Files
- Use External Emojis (optionnel)
- Message Content intent active (Developer Portal)
- Server Members intent non requis
