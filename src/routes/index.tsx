import { createFileRoute, Link } from "@tanstack/react-router";
import { SectionHeader } from "@/components/ui/SectionHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Saúde + Saudável — Painel" },
      { name: "description", content: "Acompanhe seus indicadores de saúde, treinos e cuidado preventivo." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <section className="px-4 sm:px-8 py-7">
      <SectionHeader title="Dashboard de Saúde" subtitle="Monitore seus indicadores e mantenha-se no caminho certo." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <FeatureCard
          to="/academias"
          icon="🏋️"
          title="Academias perto de você"
          desc="Encontre academias próximas no mapa real com geolocalização."
          accent="navy"
        />
        <FeatureCard
          to="/clinicas"
          icon="🏥"
          title="Clínicas e UBS"
          desc="Unidades de saúde próximas, com endereço e contato."
          accent="green"
        />
        <FeatureCard
          to="/noticias"
          icon="📰"
          title="Notícias & Dicas"
          desc="Conteúdo atualizado sobre bem-estar e medicina preventiva."
          accent="green"
        />
        <FeatureCard
          to="/ia"
          icon="🤖"
          title="IA Saúde Plus"
          desc="Assistente virtual especializado em saúde preventiva (em breve)."
          accent="navy"
        />
      </div>

      <div className="mt-8 rounded-xl bg-white shadow-[var(--shadow-card)] p-6">
        <h2 className="text-navy font-bold text-lg">🚧 Próximos passos</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Esta fase entrega o banco de dados, mapas reais (Leaflet + OpenStreetMap) e Notícias dinâmicas.
          Em seguida virão: autenticação, dashboard personalizada (gráficos do Chart.js conectados ao banco),
          checklist de treinos persistente, formulário de triagem e o chat de IA Saúde Plus integrado ao Lovable AI.
        </p>
      </div>
    </section>
  );
}

function FeatureCard({ to, icon, title, desc, accent }: { to: string; icon: string; title: string; desc: string; accent: "navy" | "green" }) {
  return (
    <Link
      to={to as "/"}
      className="group rounded-xl bg-white shadow-[var(--shadow-card)] p-6 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)] block"
    >
      <div className={[
        "w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4",
        accent === "navy" ? "bg-[oklch(0.94_0.04_245)] text-navy" : "bg-green-light text-green-dark",
      ].join(" ")}>{icon}</div>
      <h3 className="text-navy font-bold text-base">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{desc}</p>
      <span className="inline-flex items-center gap-1 text-green-dark font-semibold text-sm mt-4 group-hover:gap-2 transition-all">Acessar →</span>
    </Link>
  );
}
