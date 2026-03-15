# Context
# WatchLater Bot — Agent Context File
> Paste this at the start of EVERY Antigravity session along with PROGRESS.md.
> This file has verified, correct syntax for every library we use. Do not deviate from these patterns.

---

## Project summary
A Telegram bot SaaS that reminds users to watch saved YouTube videos.
Stack: Next.js 15 (App Router) + Convex + Clerk + grammy + chrono-node + Stripe (later)

---

## Convex — correct syntax (verified from official docs)

### Schema (convex/schema.ts)
```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    telegramChatId: v.string(),
    timezone: v.string(),
    clerkId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_telegram", ["telegramChatId"]),

  videos: defineTable({
    userId: v.string(),
    telegramChatId: v.string(),
    youtubeUrl: v.string(),
    title: v.string(),
    thumbnail: v.string(),
    watched: v.boolean(),
    reminderTime: v.number(),
    createdAt: v.number(),
  })
    .index("by_chat", ["telegramChatId"])
    .index("by_reminder", ["reminderTime", "watched"]),
});
```

### Mutation (convex/videos.ts)
```ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveVideo = mutation({
  args: {
    telegramChatId: v.string(),
    youtubeUrl: v.string(),
    title: v.string(),
    thumbnail: v.string(),
    reminderTime: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("videos", {
      userId: args.telegramChatId,
      telegramChatId: args.telegramChatId,
      youtubeUrl: args.youtubeUrl,
      title: args.title,
      thumbnail: args.thumbnail,
      watched: false,
      reminderTime: args.reminderTime,
      createdAt: Date.now(),
    });
  },
});

export const markWatched = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, { watched: true });
  },
});

export const getDueReminders = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("videos")
      .withIndex("by_reminder", (q) =>
        q.lte("reminderTime", args.now).eq("watched", false)
      )
      .collect();
  },
});
```

### User mutation (convex/users.ts)
```ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveUser = mutation({
  args: {
    telegramChatId: v.string(),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_telegram", (q) => q.eq("telegramChatId", args.telegramChatId))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("users", {
      telegramChatId: args.telegramChatId,
      timezone: args.timezone,
      createdAt: Date.now(),
    });
  },
});

export const getUserByChatId = query({
  args: { telegramChatId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_telegram", (q) => q.eq("telegramChatId", args.telegramChatId))
      .first();
  },
});
```

### Cron job (convex/crons.ts)
```ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "send due reminders",
  { minutes: 60 },
  internal.reminders.sendDueReminders
);

export default crons;
```

---

## grammy — correct syntax for Next.js App Router webhook

### Webhook route (app/api/telegram/route.ts)
```ts
import { Bot, webhookCallback, InlineKeyboard } from "grammy";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

// Register handlers here
bot.command("start", (ctx) => ctx.reply("Welcome to WatchLater! 🎬"));

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text;
  // handle messages
});

// Inline keyboard callback
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  await ctx.answerCallbackQuery();
  // handle button taps
});

export const POST = webhookCallback(bot, "std/http");

// Required for Telegram webhook verification
export async function GET() {
  return new Response("OK", { status: 200 });
}
```

### Inline keyboard example
```ts
const keyboard = new InlineKeyboard()
  .text("Tonight 🌙", "remind:tonight")
  .text("Tomorrow ☀️", "remind:tomorrow")
  .row()
  .text("This Weekend 📅", "remind:weekend")
  .text("Custom ✏️", "remind:custom");

await ctx.reply(`Saved! 🎬 *${title}*\n\nWhen should I remind you?`, {
  parse_mode: "Markdown",
  reply_markup: keyboard,
});
```

---

## chrono-node — correct syntax

```ts
import * as chrono from "chrono-node";

// Parse natural language time
const parsed = chrono.parse("remind me friday 9pm", new Date(), {
  forwardDate: true,
});

if (parsed.length > 0) {
  const reminderDate = parsed[0].date(); // returns a JS Date object
  const reminderTimestamp = reminderDate.getTime(); // unix ms timestamp
}

// With timezone reference date
const referenceDate = new Date();
const result = chrono.parseDate("tonight at 8pm", referenceDate, {
  forwardDate: true,
});
```

---

## Reminder time helpers (lib/reminderTime.ts)

```ts
// Compute reminder timestamps based on button taps
export function getReminderTime(option: string, timezone: string): number {
  const now = new Date();

  switch (option) {
    case "tonight": {
      const tonight = new Date(now);
      tonight.setHours(20, 0, 0, 0); // 8pm local
      if (tonight <= now) tonight.setDate(tonight.getDate() + 1);
      return tonight.getTime();
    }
    case "tomorrow": {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // 9am
      return tomorrow.getTime();
    }
    case "weekend": {
      const weekend = new Date(now);
      const day = weekend.getDay();
      const daysUntilSat = day === 6 ? 7 : 6 - day;
      weekend.setDate(weekend.getDate() + daysUntilSat);
      weekend.setHours(10, 0, 0, 0); // 10am Saturday
      return weekend.getTime();
    }
    default:
      return now.getTime() + 24 * 60 * 60 * 1000; // fallback: 24hrs
  }
}
```

---

## Environment variables (.env.local)
```
TELEGRAM_BOT_TOKEN=
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_SITE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=       # add in Phase 2
CLERK_SECRET_KEY=                        # add in Phase 2
```

---

## Important rules for the agent
- Always use `v.id("tableName")` for Convex document ID references
- Always use `webhookCallback(bot, "std/http")` for Next.js App Router — NOT `"express"` or `"fastify"`
- Always use `ctx.answerCallbackQuery()` before handling inline button callbacks
- Never use `bot.start()` in webhook mode — that's for long polling only
- Convex auto-adds `_id` and `_creationTime` — never define these in schema
- All Convex timestamps are unix milliseconds (`Date.now()`)
- Never commit `.env.local` to git
<!-- Paste your context below -->

