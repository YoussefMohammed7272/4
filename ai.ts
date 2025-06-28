import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { api } from "./_generated/api";

const openai = new OpenAI({
  baseURL: process.env.CONVEX_OPENAI_BASE_URL,
  apiKey: process.env.CONVEX_OPENAI_API_KEY,
});

// مساعد ذكي للإجابة على الأسئلة الدينية
export const askReligiousQuestion = action({
  args: { 
    question: v.string(),
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    try {
      const systemPrompt = `أنت مساعد ذكي متخصص في الأذكار والأدعية الإسلامية. 
      أجب على الأسئلة بطريقة علمية دقيقة مع ذكر المصادر عند الإمكان.
      اجعل إجاباتك واضحة ومفيدة للمسلمين في حياتهم اليومية.
      إذا لم تكن متأكداً من الإجابة، اطلب من المستخدم استشارة عالم دين.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.question }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const answer = response.choices[0].message.content || "عذراً، لم أتمكن من الإجابة على سؤالك.";
      
      // حفظ السؤال والجواب في قاعدة البيانات
      await ctx.runMutation(api.ai.saveQuestionAnswer, {
        userId: args.userId,
        question: args.question,
        answer,
        category: "religious",
        confidence: 0.8,
      });

      return { answer, success: true };
    } catch (error) {
      console.error("خطأ في المساعد الذكي:", error);
      return { 
        answer: "عذراً، حدث خطأ تقني. يرجى المحاولة مرة أخرى.", 
        success: false 
      };
    }
  },
});

// توليد تذكيرات مخصصة
export const generatePersonalizedReminder = action({
  args: { 
    userId: v.id("users"),
    timeOfDay: v.string(), // "morning", "evening"
    userStats: v.object({
      streak: v.number(),
      completionRate: v.number(),
      favoriteCategory: v.string(),
    })
  },
  handler: async (ctx, args) => {
    try {
      const prompt = `أنشئ رسالة تذكير شخصية ومحفزة للأذكار باللغة العربية.
      معلومات المستخدم:
      - وقت اليوم: ${args.timeOfDay === 'morning' ? 'الصباح' : 'المساء'}
      - عدد الأيام المتتالية: ${args.userStats.streak}
      - معدل الإكمال: ${args.userStats.completionRate}%
      - الفئة المفضلة: ${args.userStats.favoriteCategory}
      
      اجعل الرسالة قصيرة (50 كلمة كحد أقصى) ومشجعة وشخصية.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.8,
      });

      return response.choices[0].message.content || "حان وقت الأذكار! بارك الله فيك.";
    } catch (error) {
      console.error("خطأ في توليد التذكير:", error);
      return "حان وقت الأذكار! بارك الله فيك.";
    }
  },
});

// شرح معاني الأذكار
export const explainZikrMeaning = action({
  args: { 
    zikrText: v.string(),
    userLevel: v.string() // "beginner", "intermediate", "advanced"
  },
  handler: async (ctx, args) => {
    try {
      const levelMap = {
        beginner: "مبتدئ - استخدم لغة بسيطة وواضحة",
        intermediate: "متوسط - يمكن استخدام مصطلحات دينية معتدلة",
        advanced: "متقدم - يمكن استخدام مصطلحات علمية ومراجع"
      };

      const prompt = `اشرح معنى وفضل هذا الذكر باللغة العربية للمستوى ${levelMap[args.userLevel as keyof typeof levelMap]}:
      "${args.zikrText}"
      
      اجعل الشرح مفيداً وملهماً في 100-150 كلمة.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
      });

      return response.choices[0].message.content || "هذا ذكر عظيم له فضل كبير في الإسلام.";
    } catch (error) {
      console.error("خطأ في شرح المعنى:", error);
      return "هذا ذكر عظيم له فضل كبير في الإسلام.";
    }
  },
});

// حفظ السؤال والجواب
export const saveQuestionAnswer = mutation({
  args: {
    userId: v.id("users"),
    question: v.string(),
    answer: v.string(),
    category: v.string(),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiQuestions", args);
  },
});
