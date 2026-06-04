import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3-flash-preview";

const InputSchema = z.object({
  placeName: z.string().min(1).max(200),
  placeType: z.enum(["gym", "clinic"]),
  category: z.string().max(80).optional(),
  dateSeed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type PlaceNewsItem = {
  title: string;
  summary: string;
  category: string;
  emoji: string;
};

export type PlaceNewsResult = { items: PlaceNewsItem[]; generatedAt: string };

/**
 * Gera 3 dicas/notícias diárias contextualizadas para o local (academia/clínica).
 * Cache key = (nome + tipo + data) — atualiza naturalmente uma vez por dia via React Query.
 */
export const generatePlaceNews = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<PlaceNewsResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return { items: fallback(data.placeType), generatedAt: data.dateSeed };
    }

    const system =
      data.placeType === "gym"
        ? "Você é editor de saúde fitness. Gere 3 notícias/dicas DIÁRIAS, curtas e originais, " +
          "relacionadas a treino, recuperação, nutrição esportiva ou bem-estar — relevantes para frequentadores de academia. " +
          "Use linguagem motivacional em pt-BR. Não cite marcas. Sem disclaimers."
        : "Você é editor de saúde preventiva. Gere 3 notícias/dicas DIÁRIAS, curtas e originais, " +
          "sobre prevenção, hábitos saudáveis, vacinação, exames de rotina ou bem-estar — relevantes para pacientes desta unidade. " +
          "Linguagem clara em pt-BR. Não cite marcas. Sem disclaimers longos.";

    const user = `Local: "${data.placeName}" (${data.placeType === "gym" ? "academia" : "clínica/unidade de saúde"})${data.category ? ` — ${data.category}` : ""}. Data: ${data.dateSeed}. Gere 3 itens únicos e variados.`;

    try {
      const res = await fetch(AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
          tools: [{
            type: "function",
            function: {
              name: "publish_news",
              parameters: {
                type: "object",
                additionalProperties: false,
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        title: { type: "string", description: "Título curto (até 70 chars)" },
                        summary: { type: "string", description: "Resumo de 1-2 frases" },
                        category: { type: "string", description: "Categoria (Treino, Nutrição, Prevenção, etc.)" },
                        emoji: { type: "string", description: "1 emoji representativo" },
                      },
                      required: ["title", "summary", "category", "emoji"],
                    },
                  },
                },
                required: ["items"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "publish_news" } },
        }),
      });

      if (!res.ok) {
        return { items: fallback(data.placeType), generatedAt: data.dateSeed };
      }
      const json = await res.json();
      const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) return { items: fallback(data.placeType), generatedAt: data.dateSeed };
      const parsed = JSON.parse(args) as { items: PlaceNewsItem[] };
      return { items: parsed.items.slice(0, 3), generatedAt: data.dateSeed };
    } catch {
      return { items: fallback(data.placeType), generatedAt: data.dateSeed };
    }
  });

function fallback(kind: "gym" | "clinic"): PlaceNewsItem[] {
  if (kind === "gym") {
    return [
      { title: "Aquecimento muda o resultado", summary: "5–10 minutos de mobilidade reduzem lesões e melhoram performance.", category: "Treino", emoji: "🏋️" },
      { title: "Hidrate-se antes da fadiga", summary: "Beba água a cada 20 min de treino, mesmo sem sede.", category: "Recuperação", emoji: "💧" },
      { title: "Sono é hipertrofia", summary: "7–9h de sono regulam testosterona e cortisol — base do ganho muscular.", category: "Bem-estar", emoji: "😴" },
    ];
  }
  return [
    { title: "Check-up anual vale a pena", summary: "Exames de rotina detectam alterações silenciosas precocemente.", category: "Prevenção", emoji: "🩺" },
    { title: "Vacinação em dia protege todos", summary: "Mantenha o calendário atualizado, especialmente influenza e COVID.", category: "Imunização", emoji: "💉" },
    { title: "Pressão arterial em casa", summary: "Medir 2x por semana ajuda a identificar tendências e ajustar hábitos.", category: "Cardiovascular", emoji: "❤️" },
  ];
}
