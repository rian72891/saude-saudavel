import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MEAL_CATEGORIES = ["proteina", "carboidrato", "gordura", "vegetal", "fruta", "doce", "bebida"] as const;
export type MealCategory = (typeof MEAL_CATEGORIES)[number];

export type Meal = { name: string; category: MealCategory; calories: number };

const mealSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.enum(MEAL_CATEGORIES),
  calories: z.number().min(0).max(5000),
});

const logInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  glucose_mg_dl: z.number().min(20).max(800).nullable().optional(),
  meals: z.array(mealSchema).max(30).optional(),
  water_ml: z.number().int().min(0).max(20000).optional(),
  sleep_hours: z.number().min(0).max(24).nullable().optional(),
  weight_kg: z.number().min(20).max(400).nullable().optional(),
  mood: z.number().int().min(1).max(5).nullable().optional(),
  steps: z.number().int().min(0).max(200000).optional(),
});

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3-flash-preview";

async function callAI<T>(opts: { system: string; user: string; tool?: { name: string; parameters: object } }): Promise<T | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  const body: Record<string, unknown> = {
    model: AI_MODEL,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
  };
  if (opts.tool) {
    body.tools = [{ type: "function", function: { name: opts.tool.name, description: "", parameters: opts.tool.parameters } }];
    body.tool_choice = { type: "function", function: { name: opts.tool.name } };
  }
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Limite de requisições da IA atingido. Tente novamente em instantes.");
    if (res.status === 402) throw new Error("Créditos da IA esgotados. Adicione créditos no workspace.");
    throw new Error(`Erro da IA (${res.status})`);
  }
  const json = await res.json();
  const choice = json.choices?.[0]?.message;
  if (opts.tool) {
    const args = choice?.tool_calls?.[0]?.function?.arguments;
    if (!args) return null;
    try { return JSON.parse(args) as T; } catch { return null; }
  }
  return (choice?.content ?? "") as unknown as T;
}

/** Lê o histórico recente (últimos N dias) do usuário para alimentar os gráficos. */
export const getHealthMonitor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ days: z.number().int().min(7).max(60).default(14) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (data.days - 1));
    const startStr = start.toISOString().slice(0, 10);

    const { data: rows, error } = await supabase
      .from("health_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("log_date", startStr)
      .order("log_date", { ascending: true });
    if (error) throw new Error(error.message);

    return { logs: rows ?? [], rangeStart: startStr };
  });

/** Insere/atualiza o registro do dia. Faz merge das colunas enviadas (apenas as definidas). */
export const upsertHealthLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => logInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Lê estado atual do dia para mesclar.
    const { data: existing } = await supabase
      .from("health_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("log_date", data.date)
      .maybeSingle();

    const meals = data.meals ?? (existing?.meals as Meal[] | null) ?? [];
    const total = Math.round((meals as Meal[]).reduce((s, m) => s + m.calories, 0));

    const payload: Record<string, unknown> = {
      user_id: userId,
      log_date: data.date,
      meals,
      total_calories: total,
    };
    if (data.glucose_mg_dl !== undefined) payload.glucose_mg_dl = data.glucose_mg_dl;
    if (data.water_ml !== undefined) payload.water_ml = data.water_ml;
    if (data.sleep_hours !== undefined) payload.sleep_hours = data.sleep_hours;
    if (data.weight_kg !== undefined) payload.weight_kg = data.weight_kg;
    if (data.mood !== undefined) payload.mood = data.mood;
    if (data.steps !== undefined) payload.steps = data.steps;

    const { data: row, error } = await supabase
      .from("health_logs")
      .upsert(payload, { onConflict: "user_id,log_date" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** Estimativa calórica de um alimento via IA (tool calling — saída estruturada). */
export const estimateFoodCalories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ description: z.string().min(2).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const result = await callAI<{ name: string; category: MealCategory; calories: number; reasoning: string }>({
      system:
        "Você é nutricionista. Estime calorias de alimentos descritos em português. " +
        "Categorize entre proteina, carboidrato, gordura, vegetal, fruta, doce ou bebida. " +
        "Retorne porção típica brasileira quando não houver quantidade.",
      user: `Estime: "${data.description}"`,
      tool: {
        name: "register_food",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string", description: "Nome curto do alimento" },
            category: { type: "string", enum: [...MEAL_CATEGORIES] },
            calories: { type: "number", description: "Calorias estimadas (kcal)" },
            reasoning: { type: "string", description: "Justificativa breve (1 frase)" },
          },
          required: ["name", "category", "calories", "reasoning"],
        },
      },
    });
    if (!result) throw new Error("Não foi possível estimar. Tente reformular.");
    return result;
  });

/** Gera insight textual sobre o padrão alimentar/glicêmico dos últimos dias. */
export const generateHealthInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const start = new Date();
    start.setDate(start.getDate() - 13);
    const { data: rows } = await supabase
      .from("health_logs")
      .select("log_date, glucose_mg_dl, total_calories, meals, water_ml, sleep_hours, weight_kg, mood, steps")
      .eq("user_id", userId)
      .gte("log_date", start.toISOString().slice(0, 10))
      .order("log_date", { ascending: true });

    if (!rows || rows.length === 0) {
      return { insight: "Registre alguns dias para receber uma análise personalizada da IA." };
    }

    const summary = rows.map((r) => ({
      data: r.log_date,
      glicose: r.glucose_mg_dl,
      kcal: r.total_calories,
      agua_ml: r.water_ml,
      sono_h: r.sleep_hours,
      peso_kg: r.weight_kg,
      humor: r.mood,
      passos: r.steps,
      refeicoes: ((r.meals as Meal[]) ?? []).map((m) => `${m.name}(${m.category},${m.calories}kcal)`).join(", "),
    }));

    const text = await callAI<string>({
      system:
        "Você é um assistente de medicina preventiva. Analise hidratação, sono, peso, humor, passos, alimentação e glicose dos últimos dias do usuário. " +
        "Em até 5 frases curtas, destaque um ponto positivo, um ponto de atenção, uma tendência e uma recomendação prática. " +
        "Use ⚡, 💧, 😴, ⚖️ ou 🚶 quando fizer sentido. " +
        "Finalize com: 'Estas orientações são informativas e não substituem consulta profissional.'",
      user: `Dados dos últimos dias (JSON):\n${JSON.stringify(summary)}`,
    });

    const insight = (text ?? "Não foi possível gerar insight no momento.").trim();
    const latest = rows[rows.length - 1];
    await supabase.from("health_logs").update({ ai_insight: insight }).eq("user_id", userId).eq("log_date", latest.log_date);

    return { insight };
  });

/** Análise rápida em tempo real (chamada após cada save). Retorna 1-2 frases curtas. */
export const quickAIAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    glucose_mg_dl: z.number().nullable().optional(),
    total_calories: z.number().optional(),
    water_ml: z.number().optional(),
    sleep_hours: z.number().nullable().optional(),
    weight_kg: z.number().nullable().optional(),
    mood: z.number().nullable().optional(),
    steps: z.number().optional(),
    meals: z.array(z.object({ name: z.string(), category: z.string(), calories: z.number() })).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const text = await callAI<string>({
      system:
        "Você é médico preventivo. Em no máximo 2 frases muito curtas e diretas, em pt-BR, " +
        "comente os dados de hoje do usuário com 1 sinal (✅ bom / ⚠️ atenção / 💡 dica). " +
        "Sem disclaimers longos.",
      user: `Hoje: ${JSON.stringify(data)}`,
    });
    return { tip: (text ?? "").trim() || "Continue registrando para receber análises em tempo real." };
  });

/** Calcula meta calórica diária baseada em peso e atividade (BMR estimado). */
export const computeDailyTargets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    weight_kg: z.number().min(20).max(400),
    activity: z.enum(["sedentario", "leve", "moderado", "intenso"]).default("moderado"),
  }).parse(d))
  .handler(async ({ data }) => {
    // Mifflin-St Jeor simplificado (sem idade/altura → assume 30a, 170cm)
    const bmr = 10 * data.weight_kg + 6.25 * 170 - 5 * 30 + 5;
    const factor = { sedentario: 1.2, leve: 1.375, moderado: 1.55, intenso: 1.725 }[data.activity];
    const tdee = Math.round(bmr * factor);
    const water = Math.round(data.weight_kg * 35); // 35ml/kg
    return {
      calories_target: tdee,
      water_target_ml: water,
      sleep_target_h: 8,
      steps_target: 8000,
    };
  });
