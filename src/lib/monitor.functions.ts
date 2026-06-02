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
  glucose_mg_dl: z.number().min(20).max(800).nullable(),
  meals: z.array(mealSchema).max(30),
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

/** Insere/atualiza o registro do dia. */
export const upsertHealthLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => logInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const total = Math.round(data.meals.reduce((s, m) => s + m.calories, 0));
    const { data: row, error } = await supabase
      .from("health_logs")
      .upsert(
        {
          user_id: userId,
          log_date: data.date,
          glucose_mg_dl: data.glucose_mg_dl,
          meals: data.meals,
          total_calories: total,
        },
        { onConflict: "user_id,log_date" }
      )
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
      .select("log_date, glucose_mg_dl, total_calories, meals")
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
      refeicoes: (r.meals as Meal[]).map((m) => `${m.name}(${m.category},${m.calories}kcal)`).join(", "),
    }));

    const text = await callAI<string>({
      system:
        "Você é um assistente de medicina preventiva. Analise o padrão alimentar e glicêmico dos últimos dias do usuário. " +
        "Em até 4 frases curtas, destaque um ponto positivo, um ponto de atenção e uma recomendação prática. " +
        "Finalize com a frase: 'Estas orientações são informativas e não substituem consulta profissional.'",
      user: `Dados dos últimos dias (JSON):\n${JSON.stringify(summary)}`,
    });

    const insight = (text ?? "Não foi possível gerar insight no momento.").trim();

    // Salva no registro mais recente para referência
    const latest = rows[rows.length - 1];
    await supabase.from("health_logs").update({ ai_insight: insight }).eq("user_id", userId).eq("log_date", latest.log_date);

    return { insight };
  });
