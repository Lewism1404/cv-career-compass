import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AI_MODEL } from "./ai-config";

const AnalyzeInput = z.object({
  cv_id: z.string().uuid().nullable().optional(),
  cv_text: z.string().min(50, "CV text is too short").max(30000),
  cv_name: z.string().min(1).max(200),
  target_role: z.string().min(1).max(200),
  job_description: z.string().max(10000).optional().default(""),
});

export type AnalysisResult = {
  overall_score: number;
  scores: {
    relevant_skills: number;
    experience: number;
    education: number;
    projects: number;
    clarity: number;
    keyword_match: number;
    ats_compatibility: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: Array<{ text: string; priority: "high" | "medium" | "low" }>;
  wording_improvements: Array<{ original: string; suggested: string }>;
  keywords_found: string[];
  keywords_missing: string[];
  summary: string;
};

export const analyzeCV = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { chatJSON } = await import("./ai-gateway.server");

    const system = `You are an expert CV reviewer helping graduates land tech roles.
Analyse the CV against the target role and job description.
STRICT RULES:
- Never invent qualifications, skills, achievements or work experience the CV does not contain.
- When suggesting rewritten wording, use clear placeholders like [ADD METRIC], [YOUR TECH], [CONFIRM YEAR] for anything the user must confirm.
- Be supportive but honest. Focus on actionable improvements.

Return STRICT JSON matching this shape:
{
  "overall_score": number 0-100,
  "scores": { "relevant_skills": 0-100, "experience": 0-100, "education": 0-100, "projects": 0-100, "clarity": 0-100, "keyword_match": 0-100, "ats_compatibility": 0-100 },
  "strengths": string[] (3-6),
  "weaknesses": string[] (3-6),
  "recommendations": [{ "text": string, "priority": "high" | "medium" | "low" }] (5-10 items),
  "wording_improvements": [{ "original": string (verbatim from CV), "suggested": string (with placeholders where info is missing) }] (2-5 items),
  "keywords_found": string[],
  "keywords_missing": string[],
  "summary": string (2-3 sentences)
}`;

    const user = `TARGET ROLE: ${data.target_role}\n\nJOB DESCRIPTION:\n${data.job_description || "(none provided)"}\n\nCV CONTENT:\n${data.cv_text}`;

    const result = await chatJSON<AnalysisResult>(AI_MODEL, [
      { role: "system", content: system },
      { role: "user", content: user },
    ]);

    const { data: inserted, error } = await context.supabase
      .from("analyses")
      .insert({
        user_id: context.userId,
        cv_id: data.cv_id ?? null,
        cv_name: data.cv_name,
        target_role: data.target_role,
        job_description: data.job_description ?? "",
        model: AI_MODEL,
        result,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Persist recommendation items so users can track them
    if (result.recommendations?.length) {
      const items = result.recommendations.map((r) => ({
        analysis_id: inserted.id,
        user_id: context.userId,
        text: r.text,
        priority: r.priority,
        status: "todo" as const,
      }));
      await context.supabase.from("recommendation_items").insert(items);
    }

    return { id: inserted.id };
  });

export const getAnalysis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: analysis, error } = await context.supabase
      .from("analyses")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();
    if (error) throw new Error(error.message);

    const { data: items } = await context.supabase
      .from("recommendation_items")
      .select("id, text, priority, status")
      .eq("analysis_id", data.id)
      .order("priority", { ascending: true });

    return { analysis, items: items ?? [] };
  });

export const listAnalyses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("analyses")
      .select("id, cv_name, target_role, model, result, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateRecommendationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["todo", "in_progress", "completed", "not_applicable"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("recommendation_items")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getDashboardSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [analysesRes, qRes, cvsRes, nextRecoRes] = await Promise.all([
      context.supabase
        .from("analyses")
        .select("id, cv_name, target_role, result, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(5),
      context.supabase
        .from("questionnaires")
        .select("recommendations, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      context.supabase
        .from("cvs")
        .select("id, name, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      context.supabase
        .from("recommendation_items")
        .select("id, text, priority, analysis_id")
        .eq("user_id", context.userId)
        .eq("priority", "high")
        .eq("status", "todo")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return {
      analyses: analysesRes.data ?? [],
      questionnaire: qRes.data ?? null,
      latestCv: cvsRes.data ?? null,
      nextAction: nextRecoRes.data ?? null,
    };
  });