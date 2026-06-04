import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  estimateFoodCalories, generateHealthInsight, getHealthMonitor, upsertHealthLog,
  quickAIAnalysis, computeDailyTargets,
  type Meal,
} from "@/lib/monitor.functions";
import { SectionHeader } from "@/components/ui/SectionHeader";

export const Route = createFileRoute("/_authenticated/monitor")({
  head: () => ({
    meta: [
      { title: "Monitorar a Saúde | Saúde + Saudável" },
      { name: "description", content: "Acompanhe glicose, calorias e refeições com cálculos automáticos por IA." },
    ],
  }),
  component: MonitorPage,
});

const CATEGORY_COLORS: Record<string, string> = {
  proteina: "oklch(0.45 0.10 250)",
  carboidrato: "oklch(0.72 0.16 70)",
  gordura: "oklch(0.65 0.20 40)",
  vegetal: "oklch(0.72 0.17 162)",
  fruta: "oklch(0.70 0.18 25)",
  doce: "oklch(0.65 0.20 350)",
  bebida: "oklch(0.70 0.12 210)",
};
const CATEGORIES = Object.keys(CATEGORY_COLORS);
const todayStr = () => new Date().toISOString().slice(0, 10);

function MonitorPage() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(getHealthMonitor);
  const upsertFn = useServerFn(upsertHealthLog);
  const estimateFn = useServerFn(estimateFoodCalories);
  const insightFn = useServerFn(generateHealthInsight);

  const { data, isLoading } = useQuery({
    queryKey: ["health-monitor"],
    queryFn: () => fetchFn({ data: { days: 14 } }),
  });

  const today = todayStr();
  const todayLog = data?.logs.find((l) => l.log_date === today);
  const [glucose, setGlucose] = useState<string>("");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [foodInput, setFoodInput] = useState("");
  const [insight, setInsight] = useState<string | null>(null);

  // Hidrata estado quando carrega registro existente do dia
  useMemo(() => {
    if (todayLog) {
      setGlucose(todayLog.glucose_mg_dl?.toString() ?? "");
      setMeals((todayLog.meals as Meal[]) ?? []);
      setInsight(todayLog.ai_insight ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayLog?.id]);

  const estimate = useMutation({
    mutationFn: (desc: string) => estimateFn({ data: { description: desc } }),
    onSuccess: (r) => {
      setMeals((m) => [...m, { name: r.name, category: r.category, calories: Math.round(r.calories) }]);
      setFoodInput("");
      toast.success(`+${Math.round(r.calories)} kcal — ${r.reasoning}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha na IA"),
  });

  const save = useMutation({
    mutationFn: () => upsertFn({
      data: { date: today, glucose_mg_dl: glucose ? Number(glucose) : null, meals },
    }),
    onSuccess: () => {
      toast.success("Registro salvo!");
      qc.invalidateQueries({ queryKey: ["health-monitor"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const askInsight = useMutation({
    mutationFn: () => insightFn(),
    onSuccess: (r) => setInsight(r.insight),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  // ----- Dados dos gráficos -----
  const lineData = (data?.logs ?? []).map((l) => ({
    label: l.log_date.slice(5),
    glicose: l.glucose_mg_dl ? Number(l.glucose_mg_dl) : null,
    calorias: l.total_calories,
  }));

  const stackData = (data?.logs ?? []).map((l) => {
    const row: Record<string, number | string> = { label: l.log_date.slice(5) };
    for (const c of CATEGORIES) row[c] = 0;
    for (const m of (l.meals as Meal[]) ?? []) row[m.category] = ((row[m.category] as number) ?? 0) + Math.round(m.calories);
    return row;
  });

  const pieData = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const l of data?.logs ?? []) {
      for (const m of (l.meals as Meal[]) ?? []) {
        totals[m.category] = (totals[m.category] ?? 0) + m.calories;
      }
    }
    return Object.entries(totals).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [data]);

  const totalKcal = meals.reduce((s, m) => s + m.calories, 0);

  if (isLoading) return <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>;

  return (
    <section className="px-4 sm:px-8 py-7 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <SectionHeader title="📊 Monitorar a Saúde" subtitle="Glicose, calorias e refeições — com cálculo automático por IA." />
        <Link to="/dashboard" className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-muted/30 text-navy font-medium">← Painel</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ============== LINE: glicose × calorias ============== */}
        <ChartCard title="📈 Glicose & Calorias (14 dias)" subtitle="Comparativo dos seus indicadores diários.">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={lineData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.014 245)" vertical={false} />
              <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" fontSize={11} tickLine={false} axisLine={false} width={36} />
              <YAxis yAxisId="right" orientation="right" fontSize={11} tickLine={false} axisLine={false} width={36} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid oklch(0.91 0.014 245)", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="left" type="monotone" dataKey="glicose" name="Glicose (mg/dL)" stroke="oklch(0.45 0.10 250)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              <Line yAxisId="right" type="monotone" dataKey="calorias" name="Calorias (kcal)" stroke="oklch(0.72 0.17 162)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* ============== PIE: distribuição por categoria ============== */}
        <ChartCard title="🥗 Distribuição calórica (14 dias)" subtitle="Onde estão suas calorias.">
          {pieData.length === 0 ? (
            <EmptyChart text="Registre refeições abaixo para ver o gráfico." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={92} paddingAngle={2}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? "oklch(0.6 0.05 240)"} />
                  ))}
                </Pie>
                <Tooltip formatter={((v: unknown) => `${v} kcal`) as never} contentStyle={{ borderRadius: 10, border: "1px solid oklch(0.91 0.014 245)", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* ============== STACKED BAR: calorias por alimento/dia ============== */}
        <ChartCard title="🍽 Calorias por categoria (diário)" subtitle="Composição das suas refeições." className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stackData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.014 245)" vertical={false} />
              <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} width={36} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid oklch(0.91 0.014 245)", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {CATEGORIES.map((c) => (
                <Bar key={c} dataKey={c} stackId="cal" fill={CATEGORY_COLORS[c]} maxBarSize={28} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ============== Formulário do dia ============== */}
      <div className="rounded-xl bg-white shadow-[var(--shadow-card)] p-6">
        <h2 className="text-navy font-bold text-lg">📝 Registro de hoje ({today})</h2>
        <p className="text-sm text-muted-foreground mt-1">Adicione sua glicose e as refeições. A IA estima as calorias.</p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4">
          <label className="block text-sm font-semibold text-navy">
            Glicose (mg/dL)
            <input
              type="number" min={20} max={800} value={glucose}
              onChange={(e) => setGlucose(e.target.value)}
              placeholder="ex.: 95"
              className="w-full mt-1.5 px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--green)]/30 focus:border-[var(--green)]"
            />
          </label>

          <div>
            <label className="block text-sm font-semibold text-navy">Adicionar alimento (IA estima as calorias)</label>
            <div className="flex gap-2 mt-1.5">
              <input
                value={foodInput}
                onChange={(e) => setFoodInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && foodInput.trim()) { e.preventDefault(); estimate.mutate(foodInput.trim()); } }}
                placeholder='ex.: "2 ovos mexidos", "prato de arroz com feijão"'
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--green)]/30 focus:border-[var(--green)]"
              />
              <button
                onClick={() => foodInput.trim() && estimate.mutate(foodInput.trim())}
                disabled={estimate.isPending || !foodInput.trim()}
                className="px-4 py-2 rounded-lg bg-green text-white font-semibold text-sm hover:bg-green-dark disabled:opacity-50"
              >
                {estimate.isPending ? "Calculando..." : "🤖 Estimar"}
              </button>
            </div>
          </div>
        </div>

        {meals.length > 0 && (
          <div className="mt-4 space-y-2">
            {meals.map((m, i) => (
              <div key={`${m.name}-${i}`} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[m.category] }} />
                  <span className="text-sm font-semibold text-navy truncate">{m.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">• {m.category}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold text-navy">{m.calories} kcal</span>
                  <button onClick={() => setMeals((mm) => mm.filter((_, idx) => idx !== i))} className="text-xs text-destructive hover:underline">remover</button>
                </div>
              </div>
            ))}
            <div className="text-right text-sm font-bold text-navy">Total: {totalKcal} kcal</div>
          </div>
        )}

        <button
          onClick={() => save.mutate()} disabled={save.isPending}
          className="mt-5 px-5 py-2.5 rounded-lg bg-navy text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50"
        >
          {save.isPending ? "Salvando..." : "Salvar registro do dia"}
        </button>
      </div>

      {/* ============== Insight da IA ============== */}
      <div className="rounded-xl bg-gradient-to-br from-[var(--green-light)] to-white shadow-[var(--shadow-card)] p-6 border border-green/20">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-navy font-bold text-lg">🤖 Análise da IA</h2>
            <p className="text-sm text-muted-foreground mt-1">Padrão alimentar e glicêmico dos últimos 14 dias.</p>
          </div>
          <button
            onClick={() => askInsight.mutate()} disabled={askInsight.isPending}
            className="px-4 py-2 rounded-lg bg-green text-white font-semibold text-sm hover:bg-green-dark disabled:opacity-50"
          >
            {askInsight.isPending ? "Analisando..." : "Gerar análise"}
          </button>
        </div>
        {insight && (
          <div className="mt-4 text-sm text-navy/90 whitespace-pre-line leading-relaxed bg-white/70 rounded-lg p-4">
            {insight}
          </div>
        )}
      </div>
    </section>
  );
}

function ChartCard({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={["rounded-xl bg-white shadow-[var(--shadow-card)] p-6", className ?? ""].join(" ")}>
      <h2 className="text-navy font-bold text-lg">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">{text}</div>;
}

// Reexport para evitar tree-shaking de imports não usados acima:
export const _unused = { Area, AreaChart };
