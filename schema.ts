import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // جدول الأذكار
  azkar: defineTable({
    text: v.string(),
    translation: v.optional(v.string()),
    meaning: v.optional(v.string()),
    category: v.string(), // "morning", "evening", "sleep", "travel", "general"
    repetitions: v.number(),
    source: v.optional(v.string()),
    benefits: v.optional(v.array(v.string())),
    audioUrl: v.optional(v.string()),
    order: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_order", ["order"])
    .searchIndex("search_text", {
      searchField: "text",
      filterFields: ["category"],
    }),

  // جدول تقدم المستخدمين
  userProgress: defineTable({
    userId: v.id("users"),
    azkarId: v.id("azkar"),
    completedCount: v.number(),
    lastCompleted: v.optional(v.number()),
    streak: v.number(),
    totalCompletions: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_azkar", ["userId", "azkarId"])
    .index("by_last_completed", ["lastCompleted"]),

  // جدول الإحصائيات اليومية
  dailyStats: defineTable({
    userId: v.id("users"),
    date: v.string(), // YYYY-MM-DD
    morningCompleted: v.boolean(),
    eveningCompleted: v.boolean(),
    totalAzkarCompleted: v.number(),
    timeSpent: v.number(), // بالدقائق
    streak: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "date"]),

  // جدول المجموعات الاجتماعية
  groups: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    members: v.array(v.id("users")),
    isPublic: v.boolean(),
    challengeType: v.optional(v.string()), // "daily", "weekly", "monthly"
    targetCount: v.optional(v.number()),
  })
    .index("by_creator", ["createdBy"])
    .index("by_public", ["isPublic"]),

  // جدول التذكيرات الذكية
  reminders: defineTable({
    userId: v.id("users"),
    type: v.string(), // "morning", "evening", "custom"
    time: v.string(), // HH:MM
    enabled: v.boolean(),
    timezone: v.optional(v.string()),
    customMessage: v.optional(v.string()),
    aiGenerated: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_enabled", ["enabled"]),

  // جدول الأسئلة والأجوبة الذكية
  aiQuestions: defineTable({
    userId: v.id("users"),
    question: v.string(),
    answer: v.string(),
    category: v.string(),
    confidence: v.number(),
    helpful: v.optional(v.boolean()),
  })
    .index("by_user", ["userId"])
    .index("by_category", ["category"]),

  // جدول المكافآت والإنجازات
  achievements: defineTable({
    userId: v.id("users"),
    type: v.string(), // "streak", "completion", "social", "learning"
    title: v.string(),
    description: v.string(),
    icon: v.string(),
    points: v.number(),
    unlockedAt: v.number(),
    level: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_type", ["type"]),

  // جدول تفضيلات المستخدم
  userPreferences: defineTable({
    userId: v.id("users"),
    language: v.string(),
    theme: v.string(), // "light", "dark", "auto"
    fontSize: v.string(), // "small", "medium", "large"
    voiceEnabled: v.boolean(),
    notificationsEnabled: v.boolean(),
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
      city: v.string(),
    })),
    prayerTimes: v.optional(v.object({
      fajr: v.string(),
      sunrise: v.string(),
      dhuhr: v.string(),
      asr: v.string(),
      maghrib: v.string(),
      isha: v.string(),
    })),
  })
    .index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
