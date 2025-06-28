import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// الحصول على جميع الأذكار حسب الفئة
export const getAzkarByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("azkar")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .order("asc")
      .collect();
  },
});

// البحث في الأذكار
export const searchAzkar = query({
  args: { 
    searchTerm: v.string(),
    category: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("azkar")
      .withSearchIndex("search_text", (q) => 
        q.search("text", args.searchTerm)
      );
    
    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category));
    }
    
    return await query.take(20);
  },
});

// تسجيل إكمال ذكر
export const completeZikr = mutation({
  args: { 
    azkarId: v.id("azkar"),
    completedCount: v.number()
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("المستخدم غير مسجل الدخول");

    const existing = await ctx.db
      .query("userProgress")
      .withIndex("by_user_and_azkar", (q) => 
        q.eq("userId", userId).eq("azkarId", args.azkarId)
      )
      .unique();

    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    if (existing) {
      // تحديث التقدم الموجود
      const lastCompleted = existing.lastCompleted || 0;
      const daysSinceLastCompleted = Math.floor((now - lastCompleted) / (24 * 60 * 60 * 1000));
      const newStreak = daysSinceLastCompleted <= 1 ? existing.streak + 1 : 1;

      await ctx.db.patch(existing._id, {
        completedCount: args.completedCount,
        lastCompleted: now,
        streak: newStreak,
        totalCompletions: existing.totalCompletions + args.completedCount,
      });
    } else {
      // إنشاء تقدم جديد
      await ctx.db.insert("userProgress", {
        userId,
        azkarId: args.azkarId,
        completedCount: args.completedCount,
        lastCompleted: now,
        streak: 1,
        totalCompletions: args.completedCount,
      });
    }

    // تحديث الإحصائيات اليومية
    await updateDailyStats(ctx, userId, today);
    
    return { success: true };
  },
});

// الحصول على تقدم المستخدم
export const getUserProgress = query({
  args: { azkarId: v.optional(v.id("azkar")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    if (args.azkarId) {
      return await ctx.db
        .query("userProgress")
        .withIndex("by_user_and_azkar", (q) => 
          q.eq("userId", userId).eq("azkarId", args.azkarId)
        )
        .unique();
    }

    return await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

// الحصول على الإحصائيات اليومية
export const getDailyStats = query({
  args: { 
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let query = ctx.db
      .query("dailyStats")
      .withIndex("by_user", (q) => q.eq("userId", userId));

    return await query.order("desc").take(30);
  },
});

// دالة مساعدة لتحديث الإحصائيات اليومية
async function updateDailyStats(ctx: any, userId: any, date: string) {
  const existing = await ctx.db
    .query("dailyStats")
    .withIndex("by_user_and_date", (q) => 
      q.eq("userId", userId).eq("date", date)
    )
    .unique();

  const userProgress = await ctx.db
    .query("userProgress")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const totalCompleted = userProgress.reduce((sum: number, progress: any) => 
    sum + (progress.completedCount || 0), 0
  );

  // تحديد إذا كانت أذكار الصباح والمساء مكتملة
  const morningAzkar = await ctx.db
    .query("azkar")
    .withIndex("by_category", (q) => q.eq("category", "morning"))
    .collect();
  
  const eveningAzkar = await ctx.db
    .query("azkar")
    .withIndex("by_category", (q) => q.eq("category", "evening"))
    .collect();

  const morningCompleted = morningAzkar.every((zikr: any) => {
    const progress = userProgress.find((p: any) => p.azkarId === zikr._id);
    return progress && progress.completedCount >= zikr.repetitions;
  });

  const eveningCompleted = eveningAzkar.every((zikr: any) => {
    const progress = userProgress.find((p: any) => p.azkarId === zikr._id);
    return progress && progress.completedCount >= zikr.repetitions;
  });

  if (existing) {
    await ctx.db.patch(existing._id, {
      morningCompleted,
      eveningCompleted,
      totalAzkarCompleted: totalCompleted,
    });
  } else {
    await ctx.db.insert("dailyStats", {
      userId,
      date,
      morningCompleted,
      eveningCompleted,
      totalAzkarCompleted: totalCompleted,
      timeSpent: 0,
      streak: 1,
    });
  }
}
