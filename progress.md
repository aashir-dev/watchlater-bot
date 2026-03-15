# Progress Log

*# WatchLater Bot — Build Progress

> Paste this file + PRD.md at the start of every Antigravity agent session.
> Update this file after every coding session so you never lose track.

---

## Current status
🟡 Phase 1 (MVP) in progress

---

## Phase 1 checklist — MVP

### Setup
- [x] `npx create-next-app@latest watchlater --typescript --tailwind --app` — run in terminal
- [x] `npm install convex @clerk/nextjs grammy chrono-node` — install dependencies
- [x] `npx convex dev` — set up Convex project, get CONVEX_URL
- [x] Create `.env.local` with all environment variables
- [x] Drop `PRD.md` and `PROGRESS.md` into project root
- [ ] Message @BotFather on Telegram, create bot, get token

### Database
- [x] Create `convex/schema.ts` with `videos` and `users` tables
- [x] Create `convex/videos.ts` with mutations: saveVideo, markWatched, getDueReminders
- [x] Create `convex/users.ts` with mutations: saveUser, getUserByChatId

### Telegram bot
- [x] Create `app/api/telegram/route.ts` — webhook handler
- [x] `/start` command working — welcome message + asks for timezone
- [x] YouTube URL detection working
- [x] oEmbed title fetching working
- [x] Inline keyboard buttons working (Tonight / Tomorrow / Weekend / Custom)
- [x] Natural language time parsing working (chrono-node)
- [x] Video saved to Convex after time is picked
- [x] Confirmation message sent to user

### Reminder engine
- [x] Create `lib/reminderTime.ts` — helper to compute timestamps per timezone
- [x] Cron job set up in Convex (`convex/crons.ts`)
- [x] Cron queries due reminders every hour
- [x] Cron fires Telegram message with video link + "Watched ✓" button
- [x] "Watched ✓" button callback marks video as watched in Convex

### Deployment
- [ ] Push to GitHub
- [ ] Deploy to Vercel
- [ ] Set all environment variables in Vercel dashboard
- [ ] Register Telegram webhook URL via browser

---

## Phase 2 checklist — Monetise (don't start until Phase 1 is fully working)
- [ ] Clerk auth set up
- [ ] Web dashboard page showing saved videos
- [ ] Stripe subscriptions integrated
- [ ] Free tier limit (10 videos) enforced
- [ ] Pro tier ($4/mo) unlocks unlimited videos

---

## Phase 3 checklist — Grow (after first paying users)
- [ ] PWA share sheet configured
- [ ] Browser extension built
- [ ] Product Hunt launch prepared

---

## Session log
> Add a note after every coding session so future-you knows what happened

| Date | What was done | What's next |
|---|---|---|
| - | Project not started yet | Run create-next-app |
| 2026-03-15 | Setup Next.js, created context file (`context.md`), convex schema, `users.ts`, and `videos.ts` | Set up Telegram bot webhook handler |
| 2026-03-15 | Created `app/api/telegram/route.ts` (full bot logic) and `lib/reminderTime.ts` (timezone helpers) | Implement cron jobs for reminders |
| 2026-03-15 | Implemented `convex/crons.ts` and `convex/reminders.ts` for cron jobs, added "Watched" and "Snooze" callback handlers in Telegram route. | Deploy to Vercel + register Telegram webhook |

---

## Known issues / bugs
> Log bugs here as you find them

None yet.

---

## Decisions made
> Log any important decisions here so you don't second-guess yourself later

| Decision | Reason |
|---|---|
| grammy over node-telegram-bot-api | Better TypeScript support, cleaner API |
| Convex over Supabase | Already familiar, real-time built-in, no SQL needed |
| Clerk for auth | Integrates cleanly with Convex and Stripe |
| chrono-node for time parsing | Handles natural language without custom regex |
| Buttons-first UX | Zero friction for users, no parsing errors |Paste your content here...*
