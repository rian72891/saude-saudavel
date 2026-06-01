import { createFileRoute } from "@tanstack/react-router";
import { SectionHeader } from "@/components/ui/SectionHeader";

export const Route = createFileRoute("/ia")({
  head: () => ({
    meta: [
      { title: "IA Saúde Plus | Saúde + Saudável" },
      { name: "description", content: "Assistente virtual especializado em medicina preventiva e bem-estar." },
    ],
  }),
  component: IaPage,
});

function IaPage() {
  return (
    <section className="px-4 sm:px-8 py-7">
      <SectionHeader title="🤖 IA Saúde Plus" subtitle="Tire dúvidas sobre saúde preventiva, hábitos e bem-estar." />
      <div className="rounded-xl bg-white shadow-[var(--shadow-card)] p-8 text-center max-w-2xl mx-auto">
        <div className="text-5xl mb-4">🩺</div>
        <h2 className="text-navy font-bold text-lg">Chat de IA — em implementação</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          A próxima etapa conectará este chat à infraestrutura nativa de IA do Lovable Cloud
          (Google Gemini via Lovable AI Gateway). Ele responderá apenas sobre medicina preventiva,
          hábitos saudáveis e bem-estar, sempre com o aviso legal de que não substitui consulta médica.
        </p>
      </div>
    </section>
  );
}
