import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    const [profileRes, todayLogsRes, weekLogsRes, latestScreeningRes, healthLogsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("workout_logs").select("*").eq("user_id", userId).eq("log_date", today),
      supabase.from("workout_logs").select("*").eq("user_id", userId).gte("log_date", sevenDaysAgo),
      supabase.from("screenings").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("health_logs").select("*").eq("user_id", userId).gte("log_date", sevenDaysAgo).order("log_date", { ascending: true }),
    ]);

    return {
      profile: profileRes.data,
      todayLogs: todayLogsRes.data ?? [],
      weekLogs: weekLogsRes.data ?? [],
      latestScreening: latestScreeningRes.data,
      healthLogs: healthLogsRes.data ?? [],
    };
  });

const toggleSchema = z.object({
  workoutType: z.string().min(1).max(50),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completed: z.boolean(),
});

export const toggleWorkoutLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => toggleSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.completed) {
      const { error } = await supabase.from("workout_logs").insert({
        user_id: userId,
        workout_type: data.workoutType,
        log_date: data.date,
        completed: true,
      });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("workout_logs")
        .delete()
        .eq("user_id", userId)
        .eq("workout_type", data.workoutType)
        .eq("log_date", data.date);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

const screeningSchema = z.object({
  exercise_level: z.number().int().min(0).max(4),
  diet_level: z.number().int().min(0).max(4),
  sleep_level: z.number().int().min(0).max(4),
  family_history: z.number().int().min(0).max(4),
});

export const submitScreening = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => screeningSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Score: 0 (ótimo) → 16 (alto risco). Invert exercise/diet/sleep (higher = better) but family_history higher = worse.
    const inv = (n: number) => 4 - n;
    const raw = inv(data.exercise_level) + inv(data.diet_level) + inv(data.sleep_level) + data.family_history;
    const score = Math.round((raw / 16) * 100);
    let risk: "baixo" | "moderado" | "alto" = "baixo";
    if (score >= 60) risk = "alto";
    else if (score >= 35) risk = "moderado";

    const { data: row, error } = await supabase
      .from("screenings")
      .insert({ user_id: userId, ...data, score, risk_level: risk })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
