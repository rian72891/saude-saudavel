import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const profileSchema = z.object({
  full_name: z.string().min(1).max(120),
  age: z.number().int().min(1).max(120).nullable(),
  weight_kg: z.number().min(20).max(400).nullable(),
  height_cm: z.number().min(80).max(260).nullable(),
  city: z.string().max(120).nullable(),
  weekly_goal_cal: z.number().int().min(100).max(20000),
});

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => profileSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("profiles")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** Resumo dos últimos 7 dias para o gráfico semanal. */
export const getWeeklyProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6); // 7 dias incluindo hoje
    const startStr = start.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("workout_logs")
      .select("log_date, workout_type")
      .eq("user_id", userId)
      .gte("log_date", startStr);
    if (error) throw new Error(error.message);

    const days: { date: string; label: string; count: number; calories: number }[] = [];
    const CAL_PER = 220;
    const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const count = (data ?? []).filter((l) => l.log_date === iso).length;
      days.push({ date: iso, label: dayLabels[d.getDay()], count, calories: count * CAL_PER });
    }
    return days;
  });
