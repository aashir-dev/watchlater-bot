import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    telegramChatId: v.string(),
    timezone: v.string(),
    clerkId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_telegramChatId", ["telegramChatId"]),

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
    .index("by_telegramChatId", ["telegramChatId"])
    .index("by_reminderTime", ["reminderTime"])
    .index("by_watched_and_reminderTime", ["watched", "reminderTime"]),
});
