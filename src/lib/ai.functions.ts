import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SYSTEM_PROMPT = `Você é o "IA Saúde Plus", um assistente virtual especializado EXCLUSIVAMENTE em:
- Medicina preventiva
- Hábitos saudáveis (alimentação, sono, atividade física, hidratação)
- Bem-estar físico e mental
- Orientações gerais de prevenção

REGRAS OBRIGATÓRIAS:
1. Se a pergunta NÃO for sobre saúde preventiva ou bem-estar, recuse educadamente e redirecione: "Sou especializado apenas em saúde preventiva. Posso te ajudar com hábitos saudáveis, prevenção e bem-estar."
2. NUNCA forneça diagnósticos, prescrições de medicamentos ou doses.
3. SEMPRE encerre respostas relacionadas a sintomas ou condições com:
"⚠️ Estas informações são educativas e não substituem consulta médica. Procure um profissional de saúde."
4. Responda em português brasileiro, de forma clara, acolhedora e objetiva.
5. Use markdown leve (listas, negrito) quando ajudar a leitura.`;

const messageSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(2000),
  })).min(1).max(20),
});

export const chatWithAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => messageSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...data.messages,
        ],
      }),
    });

    if (res.status === 429) throw new Error("Muitas requisições. Aguarde um momento e tente novamente.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no painel Lovable Cloud.");
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Falha na IA: ${text.slice(0, 200)}`);
    }

    const json = await res.json() as { choices: Array<{ message: { content: string } }> };
    const reply = json.choices?.[0]?.message?.content ?? "Desculpe, não consegui processar.";
    return { reply };
  });
