import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const saveCV = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().min(1).max(200),
        file_path: z.string().nullable().optional(),
        file_type: z.string().nullable().optional(),
        extracted_text: z.string().max(50000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("cvs")
      .insert({
        user_id: context.userId,
        name: data.name,
        file_path: data.file_path ?? null,
        file_type: data.file_type ?? null,
        extracted_text: data.extracted_text,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const listCVs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("cvs")
      .select("id, name, file_type, file_path, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getCV = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("cvs")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCV = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // Fetch file path to remove from storage
    const { data: cv } = await context.supabase
      .from("cvs")
      .select("file_path")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (cv?.file_path) {
      await context.supabase.storage.from("cvs").remove([cv.file_path]);
    }
    const { error } = await context.supabase
      .from("cvs")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });