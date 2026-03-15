import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveVideo = mutation({
  args: {
    userId: v.string(),
    telegramChatId: v.string(),
    youtubeUrl: v.string(),
    title: v.string(),
    thumbnail: v.string(),
    reminderTime: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("videos", {
      userId: args.userId,
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
    return await ctx.db.patch(args.videoId, {
      watched: true,
    });
  },
});

export const getDueReminders = query({
  args: { currentTime: v.number() },
  handler: async (ctx, args) => {
    const dueVideos = await ctx.db
      .query("videos")
      .withIndex("by_watched_and_reminderTime", (q) =>
        q.eq("watched", false).lte("reminderTime", args.currentTime)
      )
      .collect();

    return dueVideos;
  },
});
