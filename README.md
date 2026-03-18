# WatchLater Bot 🎬

A Telegram bot that reminds you to watch YouTube videos you saved but keep forgetting.

![Demo](assets/demo.gif)

[![Next.js](https://img.shields.io/badge/Next.js_15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Convex](https://img.shields.io/badge/Convex-EE342F?style=for-the-badge&logo=convex)](https://convex.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vercel](https://img.shields.io/badge/Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/)
[![Telegram](https://img.shields.io/badge/Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/mywatchlaterbot)

## Try it
👉 [t.me/mywatchlaterbot](https://t.me/mywatchlaterbot)

---

## How it works

1. Send the bot a YouTube link
2. Pick when you want to be reminded — Tonight, Tomorrow, This Weekend, or a custom time
3. The bot saves the video and fires a Telegram reminder at exactly the right time in your timezone
4. Tap **Watched ✓** when you're done — or **Snooze** to push it to tomorrow

📱 On mobile you can share videos directly from the YouTube app to the bot — no copy-pasting needed.

---

## Features

- 🔗 Auto-fetches video title and thumbnail via YouTube oEmbed API
- 🌍 Timezone-aware reminders (supports any IANA timezone)
- 🕐 Natural language time parsing — "friday 9pm", "in 3 hours", "next monday morning"
- ⏰ Cron job runs every minute, fires reminders automatically
- ✅ Mark videos as watched or snooze with inline buttons
- 💾 Persistent session state — works reliably across serverless function instances

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | Convex |
| Telegram bot | grammY |
| Time parsing | chrono-node |
| Deployment | Vercel |
| Language | TypeScript |

---

## Project Structure
```
watchlater-bot/
├── app/
│   └── api/
│       └── telegram/
│           └── route.ts        ← Telegram webhook handler
├── convex/
│   ├── schema.ts               ← Database schema
│   ├── videos.ts               ← Video mutations and queries
│   ├── users.ts                ← User mutations and queries
│   ├── sessions.ts             ← Conversation state management
│   ├── reminders.ts            ← Reminder sending action
│   └── crons.ts                ← Cron job definitions
└── lib/
    └── reminderTime.ts         ← Timezone-aware timestamp helpers
```

---

## Local Development

1. Clone the repo
```bash
   git clone https://github.com/aashir-dev/watchlater-bot
   cd watchlater-bot
```

2. Install dependencies
```bash
   npm install
```

3. Set up environment variables — create `.env.local`:
```
   TELEGRAM_BOT_TOKEN=
   NEXT_PUBLIC_CONVEX_URL=
   CONVEX_DEPLOYMENT=
   NEXT_PUBLIC_CONVEX_SITE_URL=
```

4. Start Convex
```bash
   npx convex dev
```

5. Start the dev server
```bash
   npm run dev
```

6. Register your Telegram webhook:
```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_URL>/api/telegram
```

---

## Author

Built by [Aashir](https://github.com/aashir-dev)

