import { Bot, webhookCallback, InlineKeyboard } from "grammy";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  getTonightTimestamp,
  getTomorrowTimestamp,
  getThisWeekendTimestamp,
  parseCustomTime,
} from "@/lib/reminderTime";

// ────────────────────────────────────────────────────────────────────────────
// Bot setup
// ────────────────────────────────────────────────────────────────────────────

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");

const bot = new Bot(token);

// ────────────────────────────────────────────────────────────────────────────
// In-memory state for multi-step flows
// Key: chatId (string)
// ────────────────────────────────────────────────────────────────────────────

type PendingVideo = {
  youtubeUrl: string;
  title: string;
  thumbnail: string;
};

/** Awaiting a timezone reply after /start */
const awaitingTimezone = new Set<string>();

/**
 * Video waiting for a time selection (Tonight / Tomorrow / Weekend / Custom).
 * Populated as soon as a YouTube URL is detected — before any button is tapped.
 * This avoids embedding the URL in callback data (Telegram's 64-char limit).
 */
const pendingVideo = new Map<string, PendingVideo>();

/** Awaiting a custom time string after user tapped "Custom ✏️" */
const awaitingCustomTime = new Map<string, PendingVideo>();

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function extractYouTubeUrl(text: string): string | null {
  const match = text.match(
    /https?:\/\/(www\.)?(youtube\.com\/watch\?[^\s]*v=[^\s]+|youtu\.be\/[^\s]+)/
  );
  return match ? match[0] : null;
}

async function fetchYouTubeTitle(
  url: string
): Promise<{ title: string; thumbnail: string } | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      title?: string;
      thumbnail_url?: string;
    };
    return {
      title: data.title ?? "Untitled video",
      thumbnail: data.thumbnail_url ?? "",
    };
  } catch {
    return null;
  }
}

/** All callback strings are ≤ 10 chars — well within Telegram's 64-char limit. */
function buildReminderKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Tonight 🌙", "tonight")
    .text("Tomorrow ☀️", "tomorrow")
    .row()
    .text("This Weekend 📅", "weekend")
    .text("Custom ✏️", "custom");
}

async function saveVideoForChat(
  chatId: string,
  video: PendingVideo,
  reminderTime: number
) {
  await fetchMutation(api.videos.saveVideo, {
    userId: chatId,
    telegramChatId: chatId,
    youtubeUrl: video.youtubeUrl,
    title: video.title,
    thumbnail: video.thumbnail,
    reminderTime,
  });
}

async function getUserTimezone(chatId: string): Promise<string> {
  try {
    const user = await fetchQuery(api.users.getUserByChatId, {
      telegramChatId: chatId,
    });
    return user?.timezone ?? "UTC";
  } catch {
    return "UTC";
  }
}

// ────────────────────────────────────────────────────────────────────────────
// /start command
// ────────────────────────────────────────────────────────────────────────────

bot.command("start", async (ctx) => {
  const chatId = String(ctx.chat.id);

  awaitingTimezone.add(chatId);

  await ctx.reply(
    `👋 Welcome to *WatchLater Bot*!

I'll remind you to watch YouTube videos you saved but keep forgetting.

*First, tell me your timezone* so I can remind you at the right time.
Reply with your IANA timezone name, for example:

• \`Asia/Kolkata\`
• \`America/New_York\`
• \`Europe/London\`
• \`America/Los_Angeles\`

Not sure? Find yours at [https://nodatime.org/TimeZones](https://nodatime.org/TimeZones)`,
    { parse_mode: "Markdown" }
  );
});

// ────────────────────────────────────────────────────────────────────────────
// Inline keyboard callbacks
// ────────────────────────────────────────────────────────────────────────────

bot.on("callback_query:data", async (ctx) => {
  const action = ctx.callbackQuery.data; // "tonight" | "tomorrow" | "weekend" | "custom"
  const chatId = String(ctx.chat?.id ?? ctx.callbackQuery.from.id);

  await ctx.answerCallbackQuery();

  if (action.startsWith("watched:")) {
    const videoId = action.split(":")[1] as Id<"videos">;
    await fetchMutation(api.videos.markWatched, { videoId });
    await ctx.reply("✅ Marked as watched! Great job 🎉");
    return;
  }

  if (action.startsWith("snooze:")) {
    const videoId = action.split(":")[1] as Id<"videos">;
    await fetchMutation(api.reminders.snoozeVideo, { videoId });
    await ctx.reply("⏰ Snoozed! I'll remind you again tomorrow.");
    return;
  }

  const video = pendingVideo.get(chatId);
  if (!video) {
    await ctx.reply("⚠️ Session expired. Please send the YouTube link again.");
    return;
  }

  if (action === "tonight" || action === "tomorrow" || action === "weekend") {
    const timezone = await getUserTimezone(chatId);
    let reminderTime: number;

    if (action === "tonight") {
      reminderTime = getTonightTimestamp(timezone);
    } else if (action === "tomorrow") {
      reminderTime = getTomorrowTimestamp(timezone);
    } else {
      reminderTime = getThisWeekendTimestamp(timezone);
    }

    pendingVideo.delete(chatId);
    await saveVideoForChat(chatId, video, reminderTime);

    const when = new Date(reminderTime).toLocaleString("en-US", {
      timeZone: timezone,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    await ctx.reply(
      `✅ *Saved!*\n\n📺 ${video.title}\n\n⏰ I'll remind you *${when}*`,
      { parse_mode: "Markdown" }
    );
  } else if (action === "custom") {
    // Move from pendingVideo → awaitingCustomTime (custom time entry flow)
    pendingVideo.delete(chatId);
    awaitingCustomTime.set(chatId, video);
    await ctx.reply(
      '🕐 *When should I remind you?*\n\nType something like:\n• "tonight at 10pm"\n• "friday 7pm"\n• "in 3 hours"\n• "next monday morning"',
      { parse_mode: "Markdown" }
    );
  }
});

// ────────────────────────────────────────────────────────────────────────────
// Text messages — handles YouTube URLs, timezone replies, and custom time
// ────────────────────────────────────────────────────────────────────────────

bot.on("message:text", async (ctx) => {
  const chatId = String(ctx.chat.id);
  const text = ctx.message.text.trim();

  // ── 1. Custom time reply ──────────────────────────────────────────────────
  if (awaitingCustomTime.has(chatId)) {
    const timezone = await getUserTimezone(chatId);
    const reminderTime = parseCustomTime(text, timezone);

    if (!reminderTime) {
      await ctx.reply(
        `😕 I couldn't understand that time. Try something like "tomorrow 9pm" or "friday morning".`
      );
      return;
    }

    const video = awaitingCustomTime.get(chatId)!;
    awaitingCustomTime.delete(chatId);

    await saveVideoForChat(chatId, video, reminderTime);

    const when = new Date(reminderTime).toLocaleString("en-US", {
      timeZone: timezone,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    await ctx.reply(
      `✅ *Saved!*\n\n📺 ${video.title}\n\n⏰ I'll remind you *${when}*`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  // ── 2. Timezone reply (after /start) ─────────────────────────────────────
  if (awaitingTimezone.has(chatId)) {
    // Basic IANA timezone validation via Intl
    try {
      Intl.DateTimeFormat(undefined, { timeZone: text });
    } catch {
      await ctx.reply(
        `❌ "${text}" doesn't look like a valid timezone.\n\nTry something like \`Asia/Kolkata\` or \`America/New_York\`.`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    await fetchMutation(api.users.saveUser, {
      telegramChatId: chatId,
      timezone: text,
    });

    awaitingTimezone.delete(chatId);

    await ctx.reply(
      `✅ Got it! Your timezone is set to *${text}*.\n\nNow send me a YouTube link and I'll remind you to watch it! 🎬`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  // ── 3. YouTube URL detection ──────────────────────────────────────────────
  const youtubeUrl = extractYouTubeUrl(text);

  if (youtubeUrl) {
    const videoInfo = await fetchYouTubeTitle(youtubeUrl);

    if (!videoInfo) {
      await ctx.reply(
        "❌ I couldn't fetch that video's info. Is the link correct?"
      );
      return;
    }

    // Store video server-side — callback data will just be a bare action word
    pendingVideo.set(chatId, { youtubeUrl, ...videoInfo });

    await ctx.reply(
      `📺 *${videoInfo.title}*\n\nWhen should I remind you to watch this?`,
      {
        parse_mode: "Markdown",
        reply_markup: buildReminderKeyboard(),
      }
    );
    return;
  }

  // ── 4. Fallback ───────────────────────────────────────────────────────────
  await ctx.reply(
    "Send me a YouTube link and I'll remind you to watch it! 🎬"
  );
});

// ────────────────────────────────────────────────────────────────────────────
// Route exports
// ────────────────────────────────────────────────────────────────────────────

export const POST = webhookCallback(bot, "std/http");

export async function GET() {
  return new Response("OK", { status: 200 });
}
