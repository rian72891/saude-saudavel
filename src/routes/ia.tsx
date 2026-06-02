import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { chatWithAI } from "@/lib/ai.functions";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/ia")({
  head: () => ({
    meta: [
      { title: "IA Saúde Plus | Saúde + Saudável" },
      { name: "description", content: "Assistente virtual especializado em medicina preventiva e bem-estar." },
    ],
  }),
  component: IaPage,
});

type Msg = { role: "user" | "assistant"; content: string };

function IaPage() {
  const { user, loading } = useAuth();
  const fn = useServerFn(chatWithAI);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Olá! Sou a **IA Saúde Plus** 🩺. Posso te ajudar com dúvidas sobre **medicina preventiva**, hábitos saudáveis e bem-estar. Como posso ajudar hoje?" },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const m = useMutation({
    mutationFn: (msgs: Msg[]) => fn({ data: { messages: msgs } }),
    onSuccess: (res) => {
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, m.isPending]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || m.isPending) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    m.mutate(next.filter((x) => x.role === "user" || x.role === "assistant").slice(-10));
  };

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>;

  if (!user) {
    return (
      <section className="px-4 sm:px-8 py-7">
        <SectionHeader title="🤖 IA Saúde Plus" subtitle="Tire dúvidas sobre saúde preventiva, hábitos e bem-estar." />
        <div className="rounded-xl bg-white shadow-[var(--shadow-card)] p-8 text-center max-w-md mx-auto">
          <div className="text-5xl mb-3">🔒</div>
          <h2 className="text-navy font-bold">Entre para conversar</h2>
          <p className="text-sm text-muted-foreground mt-2">Faça login para acessar a IA Saúde Plus.</p>
          <Link to="/auth" className="inline-block mt-4 px-5 py-2.5 rounded-lg bg-green text-white font-semibold text-sm">Entrar</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 sm:px-8 py-7 max-w-3xl mx-auto">
      <SectionHeader title="🤖 IA Saúde Plus" subtitle="Especializada em medicina preventiva e bem-estar." />

      <div className="rounded-xl bg-white shadow-[var(--shadow-card)] flex flex-col" style={{ height: "min(70vh, 600px)" }}>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={["flex", msg.role === "user" ? "justify-end" : "justify-start"].join(" ")}>
              <div className={[
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                msg.role === "user" ? "bg-navy text-white" : "bg-muted/50 text-navy",
              ].join(" ")}>
                {msg.content}
              </div>
            </div>
          ))}
          {m.isPending && (
            <div className="flex justify-start">
              <div className="bg-muted/50 rounded-2xl px-4 py-2.5 text-sm text-muted-foreground">Digitando...</div>
            </div>
          )}
        </div>

        <form onSubmit={send} className="border-t border-border p-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre hábitos saudáveis, prevenção..."
            className="flex-1 rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-green"
            disabled={m.isPending}
          />
          <button
            type="submit"
            disabled={m.isPending || !input.trim()}
            className="px-4 py-2.5 rounded-lg bg-green text-white font-semibold text-sm disabled:opacity-50"
          >
            Enviar
          </button>
        </form>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-3">
        ⚠️ Informações educativas. Não substitui consulta médica.
      </p>
    </section>
  );
}
