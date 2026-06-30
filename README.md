# WaifuIm Telegram Bot

A feature-rich Telegram bot for browsing anime images powered by the [waifu.im](https://waifu.im) API. Built with [grammY](https://grammy.dev/) and TypeScript, with dual deployment support for Node.js and Cloudflare Workers.

## Features

- **Random & Search** - Fetch random images or search by tags, artists, and filters
- **Favorites** - Save and browse your favorite images
- **Albums** - Create themed collections, share via link, and copy shared albums
- **Daily Delivery** - Subscribe to receive a random image on a schedule
- **Inline Mode** - Use `@waifuimbot <tags>` in any chat to search inline
- **Settings** - Customize NSFW mode, orientation, animation, image count, and language
- **Leaderboards** - Most active users, most favorites, most albums
- **Admin Panel** - User management, ban/unban, broadcast messages, statistics
- **i18n** - English and Persian (Farsi) language support

## Tech Stack

- **Runtime**: Node.js / Cloudflare Workers
- **Language**: TypeScript (ES2022)
- **Bot Framework**: grammY
- **Database**: SQLite via sql.js (local) / Cloudflare D1 (Workers)
- **Build**: esbuild

## Project Structure

```
src/
├── api/                  # waifu.im API client & types
├── bot/
│   ├── admin/            # Admin panel, users, broadcast, statistics
│   ├── commands/         # All bot commands (random, search, settings, etc.)
│   ├── handlers/         # Callback queries, inline mode, cancel handler
│   ├── middleware/       # Auth & admin middleware
│   └── scheduler/       # Daily image scheduler
├── cloudflare/           # Cloudflare Workers / D1 adapter
├── db/                   # Database layer (SQLite queries)
├── i18n/                 # Internationalization messages
├── stubs/                # Cloudflare Workers stubs
├── types/                # Type declarations
└── utils/                # Logger, formatters, image helpers
```

## Prerequisites

- Node.js 18+
- A Telegram Bot token (from [@BotFather](https://t.me/BotFather))
- A [waifu.im](https://waifu.im) API key

## Setup

1. Clone the repository:

```bash
git clone https://github.com/chaveamin/waifuim.git
cd waifuim
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root:

```env
BOT_TOKEN=your-telegram-bot-token
ADMIN_TELEGRAM_ID=your-telegram-user-id
WAIFU_API_KEY=your-waifu-im-api-key
NSFW_ALLOWED=true
```

4. Start the bot in development mode:

```bash
npm run dev
```

## Scripts

| Command         | Description                         |
| --------------- | ----------------------------------- |
| `npm run dev`   | Start bot in development mode (tsx) |
| `npm run build` | Build for production (esbuild)      |
| `npm run start` | Run the production build            |

## Cloudflare Workers Deployment

The bot also supports deployment to Cloudflare Workers with D1 database:

1. Install wrangler (already in devDependencies):

```bash
npx wrangler login
```

2. Update `wrangler.toml` with your own tokens and D1 database config.

3. Deploy:

```bash
npx wrangler deploy
```

## Bot Commands

| Command          | Description                                   |
| ---------------- | --------------------------------------------- |
| `/start`         | Welcome message and language selection        |
| `/help`          | List all available commands                   |
| `/random`        | Get a random image based on your settings     |
| `/group`         | Send a group of images                        |
| `/search <tags>` | Search images by tags                         |
| `/tags`          | Browse all available tags                     |
| `/artists`       | Browse artists                                |
| `/image <id>`    | Get a specific image by ID                    |
| `/favorites`     | View your saved favorites                     |
| `/albums`        | Manage your image collections                 |
| `/daily`         | Subscribe/unsubscribe to daily image delivery |
| `/settings`      | Customize your image preferences              |
| `/profile`       | View your profile and stats                   |
| `/stats`         | View API statistics                           |
| `/leaderboard`   | View community leaderboards                   |
| `/admin`         | Open admin panel (admin only)                 |

## Database Schema

The bot uses SQLite with the following tables:

- **users** - User profiles and preferences
- **commands_used** - Command usage logging
- **favorites** - User image favorites
- **albums** - User-created albums
- **album_images** - Images within albums
- **broadcast_log** - Admin broadcast history

## License

MIT
