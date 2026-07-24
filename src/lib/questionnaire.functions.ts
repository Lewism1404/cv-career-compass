import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AI_MODEL } from "./ai-config";

const AnswersSchema = z.object({
  interest_programming: z.number().min(1).max(5),
  interest_data: z.number().min(1).max(5),
  interest_cyber: z.number().min(1).max(5),
  interest_support: z.number().min(1).max(5),
  work_style: z.enum(["independent", "team", "mixed"]),
  problem_solving_confidence: z.number().min(1).max(5),
  communication_confidence: z.number().min(1).max(5),
  practical_theoretical: z.enum(["practical", "theoretical", "balanced"]),
  qualifications: z.string().max(2000),
  current_skills: z.string().max(2000),
  improvement_areas: z.string().max(2000),
});

export type QuestionnaireAnswers = z.infer<typeof AnswersSchema>;

export type RoleRecommendation = {
  role: string;
  suitability: number;
  explanation: string;
  strengths: string[];
  skills_to_improve: string[];
};

export const submitQuestionnaire = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnswersSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { chatJSON } = await import("./ai-gateway.server");

    const system = `You are a friendly UK-focused careers advisor for graduates entering tech.
Recommend 3-5 realistic tech roles from this list where relevant:
Graduate Software Engineer, Web Developer, Software Tester, Data Analyst, IT Support Technician, Cyber Security Analyst, Business Analyst, Technical Consultant, Automation Software Engineer.
Return STRICT JSON matching: { "recommendations": [{ "role": string, "suitability": number 0-100, "explanation": string (2-3 sentences, supportive tone), "strengths": string[] (3-5 items), "skills_to_improve": string[] (2-4 items) }] }
Do NOT invent qualifications the user did not mention.`;

    const user = `Questionnaire answers (1=low, 5=high):\n${JSON.stringify(data, null, 2)}`;

    const result = await chatJSON<{ recommendations: RoleRecommendation[] }>(
      AI_MODEL,
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    );

    const { data: inserted, error } = await context.supabase
      .from("questionnaires")
      .insert({
        user_id: context.userId,
        answers: data,
        recommendations: result.recommendations ?? [],
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: inserted.id, recommendations: result.recommendations ?? [] };
  });

export const getLatestQuestionnaire = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("questionnaires")
      .select("id, answers, recommendations, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });