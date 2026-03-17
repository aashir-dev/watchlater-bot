import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getUserByChatId = query({
  args: { telegramChatId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_telegramChatId", (q) => q.eq("telegramChatId", args.telegramChatId))
      .first();
  },
});

export const saveUser = mutation({
  args: {
    telegramChatId: v.string(),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_telegramChatId", (q) => q.eq("telegramChatId", args.telegramChatId))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        timezone: args.timezone,
      });
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      telegramChatId: args.telegramChatId,
      timezone: args.timezone,
      createdAt: Date.now(),
    });
  },
});
