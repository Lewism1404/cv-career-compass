import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
// import { AI_MODEL } from "./ai-config";

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
  recommendations: Array<{
    text: string;
    priority: "high" | "medium" | "low";
  }>;
  wording_improvements: Array<{
    original: string;
    suggested: string;
  }>;
  keywords_found: string[];
  keywords_missing: string[];
  summary: string;
};

export const analyzeCV = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data, context }) => {
    /*
     * MOCK ANALYSIS
     *
     * This result is created locally and does not call an AI API.
     * It can be used to test the analysis results page, database storage,
     * dashboard history and recommendation tracking without API costs.
     */

    const result: AnalysisResult = {
      overall_score: 74,

      scores: {
        relevant_skills: 76,
        experience: 65,
        education: 85,
        projects: 72,
        clarity: 78,
        keyword_match: 68,
        ats_compatibility: 82,
      },

      strengths: [
        `The CV contains relevant foundations for a ${data.target_role} role.`,
        "The education section demonstrates a suitable technical background.",
        "The CV includes useful technical skills and project experience.",
        "The overall structure is clear and easy to follow.",
      ],

      weaknesses: [
        "Some technical skills are listed without clear evidence of how they were used.",
        "Project descriptions could explain the candidate's individual contribution more clearly.",
        "Several experience descriptions focus on duties rather than results.",
        "The CV could contain more keywords related to the selected role.",
      ],

      recommendations: [
        {
          text: `Update the personal profile so it clearly targets ${data.target_role} positions.`,
          priority: "high",
        },
        {
          text: "Add specific examples showing how technical skills were used in projects.",
          priority: "high",
        },
        {
          text: "Explain your individual responsibilities within each team project.",
          priority: "high",
        },
        {
          text: "Add measurable outcomes where accurate, using figures you can confirm.",
          priority: "medium",
        },
        {
          text: "Include more relevant terminology from the supplied job description.",
          priority: "medium",
        },
        {
          text: "Check that dates, headings and formatting are consistent throughout the CV.",
          priority: "low",
        },
      ],

      wording_improvements: [
        {
          original: "Worked on a university software project.",
          suggested:
            "Collaborated with [NUMBER] team members to develop [PROJECT TYPE] using [YOUR TECH], contributing specifically to [YOUR RESPONSIBILITY].",
        },
        {
          original: "Used Git for version control.",
          suggested:
            "Used Git and GitHub to manage branches, review changes and coordinate development across a team of [NUMBER] students.",
        },
      ],

      keywords_found: ["software development", "teamwork", "problem-solving", "Git", "programming"],

      keywords_missing: ["testing", "REST APIs", "Agile", "debugging", "deployment"],

      summary: `This CV shows a useful foundation for a ${data.target_role} position. The strongest improvements would be to add clearer evidence for technical skills, explain individual project contributions and tailor the wording more closely to the target role.`,
    };

    /*
     * ORIGINAL AI ANALYSIS CODE
     *
     * Keep this commented out while testing for free.
     * When you later want to use the real AI analysis:
     *
     * 1. Uncomment the AI_MODEL import at the top of this file.
     * 2. Comment out or remove the mock result above.
     * 3. Uncomment the code below.
     */

    /*
    const { chatJSON } = await import("./ai-gateway.server");

    const system = `You are an expert CV reviewer helping graduates land tech roles.
Analyse the CV against the target role and job description.

STRICT RULES:
- Never invent qualifications, skills, achievements or work experience the CV does not contain.
- When suggesting rewritten wording, use clear placeholders like [ADD METRIC], [YOUR TECH], [CONFIRM YEAR] for anything the user must confirm.
- Be supportive but honest.
- Focus on actionable improvements.

Return STRICT JSON matching this shape:
{
  "overall_score": number 0-100,
  "scores": {
    "relevant_skills": 0-100,
    "experience": 0-100,
    "education": 0-100,
    "projects": 0-100,
    "clarity": 0-100,
    "keyword_match": 0-100,
    "ats_compatibility": 0-100
  },
  "strengths": string[] (3-6),
  "weaknesses": string[] (3-6),
  "recommendations": [
    {
      "text": string,
      "priority": "high" | "medium" | "low"
    }
  ] (5-10 items),
  "wording_improvements": [
    {
      "original": string (verbatim from CV),
      "suggested": string (with placeholders where info is missing)
    }
  ] (2-5 items),
  "keywords_found": string[],
  "keywords_missing": string[],
  "summary": string (2-3 sentences)
}`;

    const user = `TARGET ROLE: ${data.target_role}

JOB DESCRIPTION:
${data.job_description || "(none provided)"}

CV CONTENT:
${data.cv_text}`;

    const result = await chatJSON<AnalysisResult>(AI_MODEL, [
      {
        role: "system",
        content: system,
      },
      {
        role: "user",
        content: user,
      },
    ]);
    */

    const { data: inserted, error } = await context.supabase
      .from("analyses")
      .insert({
        user_id: context.userId,
        cv_id: data.cv_id ?? null,
        cv_name: data.cv_name,
        target_role: data.target_role,
        job_description: data.job_description ?? "",
        model: "mock-analysis",
        result,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (result.recommendations.length > 0) {
      const items = result.recommendations.map((recommendation) => ({
        analysis_id: inserted.id,
        user_id: context.userId,
        text: recommendation.text,
        priority: recommendation.priority,
        status: "todo" as const,
      }));

      const { error: itemsError } = await context.supabase
        .from("recommendation_items")
        .insert(items);

      if (itemsError) {
        throw new Error(itemsError.message);
      }
    }

    return { id: inserted.id };
  });

export const getAnalysis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: analysis, error } = await context.supabase
      .from("analyses")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const { data: items, error: itemsError } = await context.supabase
      .from("recommendation_items")
      .select("id, text, priority, status")
      .eq("analysis_id", data.id)
      .eq("user_id", context.userId)
      .order("priority", { ascending: true });

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    return {
      analysis,
      items: items ?? [],
    };
  });

export const listAnalyses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("analyses")
      .select("id, cv_name, target_role, model, result, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

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
      .update({
        status: data.status,
      })
      .eq("id", data.id)
      .eq("user_id", context.userId);

    if (error) {
      throw new Error(error.message);
    }

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
