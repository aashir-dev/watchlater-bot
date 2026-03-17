import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const setSession = mutation({
  args: {
    telegramChatId: v.string(),
    state: v.string(),
    pendingVideo: v.optional(
      v.object({
        youtubeUrl: v.string(),
        title: v.string(),
        thumbnail: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_telegramChatId", (q) =>
        q.eq("telegramChatId", args.telegramChatId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        state: args.state,
        pendingVideo: args.pendingVideo,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("sessions", {
        telegramChatId: args.telegramChatId,
        state: args.state,
        pendingVideo: args.pendingVideo,
        updatedAt: Date.now(),
      });
    }
  },
});

export const getSession = query({
  args: { telegramChatId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_telegramChatId", (q) =>
        q.eq("telegramChatId", args.telegramChatId)
      )
      .first();
  },
});

export const clearSession = mutation({
  args: { telegramChatId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_telegramChatId", (q) =>
        q.eq("telegramChatId", args.telegramChatId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
