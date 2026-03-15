import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";

export const sendDueReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const dueVideos = await ctx.db
      .query("videos")
      .withIndex("by_watched_and_reminderTime", (q) =>
        q.eq("watched", false).lte("reminderTime", now)
      )
      .collect();

    if (dueVideos.length === 0) return;

    for (const video of dueVideos) {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) {
        console.error("Missing TELEGRAM_BOT_TOKEN environment variable.");
        continue;
      }

      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const keyboard = {
        inline_keyboard: [
          [
            { text: "Watched ✓", callback_data: `watched:${video._id}` },
            { text: "Snooze 1 day", callback_data: `snooze:${video._id}` }
          ]
        ]
      };

      const messageText = `🎬 *${video.title}*\n\n${video.youtubeUrl}`;

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: video.telegramChatId,
            text: messageText,
            parse_mode: "Markdown",
            reply_markup: keyboard,
          }),
        });

        if (!res.ok) {
          console.error(`Failed to send reminder for video ${video._id}: ${await res.text()}`);
        } else {
          // Mark the reminder as sent by updating reminderTime to a far future value
          const farFuture = Date.now() + 10 * 365 * 24 * 60 * 60 * 1000; // ~10 years in the future
          await ctx.db.patch(video._id, { reminderTime: farFuture });
        }
      } catch (e) {
        console.error(`Error sending message for video ${video._id}:`, e);
      }
    }
  },
});

export const snoozeVideo = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      reminderTime: Date.now() + 24 * 60 * 60 * 1000,
    });
  },
});
