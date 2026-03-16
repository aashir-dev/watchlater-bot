# Product Requirements Document (PRD)

# WatchLater Bot — Product Requirements Document

## What we're building
A SaaS product that reminds users to watch YouTube videos they saved but keep forgetting. Users interact primarily via a Telegram bot. A web dashboard (built later) lets them manage their videos visually.

## The problem
People save YouTube videos to Watch Later and never watch them. This app sends smart reminders at times the user actually sets.

## Target user
Anyone who saves YouTube videos and forgets them. Solo individuals. No teams, no collaboration features needed at this stage.

## How it works (core flow)
1. User messages the Telegram bot with a YouTube link
2. Bot fetches the video title via YouTube oEmbed API (free, no key needed)
3. Bot asks: "When should I remind you?" — shows inline buttons: Tonight / Tomorrow / This Weekend / Custom
4. User taps a button (or types natural language like "remind me friday 9pm")
5. Reminder is saved to Convex database with a unix timestamp
6. Cron job runs every hour, checks for due reminders, fires Telegram message
7. User taps "Watched ✓" button in the reminder message — video marked done

## Tech stack
- **Framework**: Next.js 15 (App Router, TypeScript)
- **Database**: Convex (real-time, TypeScript-native)
- **Auth**: Clerk (for web dashboard login later)
- **Telegram bot**: grammy library
- **Time parsing**: chrono-node (parses "tonight", "friday 9pm", "in 2 hours")
- **Email**: Resend (added later)
- **Payments**: Stripe (added later, Phase 2)
- **Deployment**: Vercel
- **IDE**: Antigravity (Google) with Claude Sonnet 4.6 for core logic

## Convex database schema

### Table: videos
- userId: string
- telegramChatId: string
- youtubeUrl: string
- title: string
- thumbnail: string
- watched: boolean
- reminderTime: number (unix timestamp in ms)
- createdAt: number (unix timestamp in ms)

### Table: users
- telegramChatId: string
- timezone: string (e.g. "Asia/Kolkata")
- clerkId: string (optional, linked when user signs into dashboard)
- createdAt: number (unix timestamp in ms)

## Telegram bot commands
| Command | What it does |
|---|---|
| /start | Welcome message, asks for timezone, explains the bot |
| /list | Shows all unwatched saved videos |
| /snooze | Pushes current reminder to tomorrow same time |
| /delete | Shows list of videos to delete |

## Reminder time options (inline keyboard)
- **Tonight** → same day at 8:00pm user's timezone
- **Tomorrow** → next day at 9:00am user's timezone
- **This Weekend** → nearest Saturday at 10:00am user's timezone
- **Custom** → bot replies "Tell me when!" and parses natural language with chrono-node

## File structure
```
watchlater/
├── app/
│   ├── api/
│   │   └── telegram/
│   │       └── route.ts        ← Telegram webhook handler
│   ├── dashboard/
│   │   └── page.tsx            ← Web dashboard (Phase 2)
│   └── page.tsx                ← Landing page
├── convex/
│   ├── schema.ts               ← Database schema
│   ├── videos.ts               ← Video mutations and queries
│   ├── users.ts                ← User mutations and queries
│   ├── crons.ts                ← Cron jobs definitions
│   └── reminders.ts            ← Actions for sending external notifications
├── lib/
│   └── reminderTime.ts         ← Helper to compute reminder timestamps
├── PRD.md                      ← This file
├── PROGRESS.md                 ← Build progress tracker
└── .env.local                  ← API keys (never commit this)
```

## Environment variables needed
```
TELEGRAM_BOT_TOKEN=
NEXT_PUBLIC_CONVEX_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

## Phases
### Phase 1 — MVP (current focus)
- Telegram bot working end to end
- User can save videos and set reminder time
- Cron job fires reminders
- User can mark videos as watched

### Phase 2 — Monetise
- Web dashboard to view and manage videos
- Clerk auth for dashboard login
- Stripe subscriptions (Free: 10 videos, Pro $4/mo: unlimited)

### Phase 3 — Grow
- Browser extension (1-click save from YouTube)
- PWA share sheet (mobile)
- Product Hunt launch*Waiting for content...*
