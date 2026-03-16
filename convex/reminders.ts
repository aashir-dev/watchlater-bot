import { internalAction, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const sendDueReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    const dueVideos = await ctx.runQuery(internal.videos.getDueReminders, { 
      currentTime: Date.now() 
    });

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
          await ctx.runMutation(internal.videos.markReminderSent, { videoId: video._id });
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
