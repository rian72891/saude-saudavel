import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDashboardData, toggleWorkoutLog, submitScreening } from "@/lib/dashboard.functions";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { WeeklyProgressChart } from "@/components/dashboard/WeeklyProgressChart";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Minha Dashboard | Saúde + Saudável" },
      { name: "description", content: "Acompanhe treinos, triagem e indicadores de saúde." },
    ],
  }),
  component: DashboardPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">Erro: {error.message}</div>
  ),
});

const WORKOUTS = [
  { key: "cardio", label: "Cardio", emoji: "🏃" },
  { key: "forca", label: "Força", emoji: "🏋️" },
  { key: "alongamento", label: "Alongamento", emoji: "🧘" },
  { key: "caminhada", label: "Caminhada", emoji: "🚶" },
];

function DashboardPage() {
  const qc = useQueryClient();
  const fetchData = useServerFn(getDashboardData);
  const toggleFn = useServerFn(toggleWorkoutLog);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchData(),
  });

  const toggle = useMutation({
    mutationFn: (vars: { workoutType: string; completed: boolean }) =>
      toggleFn({ data: { workoutType: vars.workoutType, completed: vars.completed, date: new Date().toISOString().slice(0, 10) } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao salvar"),
  });

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (isLoading) return <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>;

  const doneToday = new Set((data?.todayLogs ?? []).map((l) => l.workout_type));
  const weekCount = data?.weekLogs?.length ?? 0;
  const weeklyGoalCal = data?.profile?.weekly_goal_cal ?? 900;
  const estCalPerWorkout = 220;
  const burned = weekCount * estCalPerWorkout;
  const pct = Math.min(100, Math.round((burned / weeklyGoalCal) * 100));

  return (
    <section className="px-4 sm:px-8 py-7 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <SectionHeader title={`Olá, ${data?.profile?.full_name || "amigo(a)"} 👋`} subtitle="Sua dashboard pessoal de saúde." />
        <div className="flex items-center gap-2">
          <Link to="/perfil" className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-muted/30 text-navy font-medium">
            👤 Meu perfil
          </Link>
          <button onClick={logout} className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-muted/30 text-navy font-medium">Sair</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Treinos esta semana" value={`${weekCount}`} hint="últimos 7 dias" />
        <StatCard label="Calorias estimadas" value={`${burned} / ${weeklyGoalCal}`} hint={`${pct}% da meta`} />
        <StatCard label="Última triagem" value={data?.latestScreening?.risk_level ?? "—"} hint={data?.latestScreening ? `Score ${data.latestScreening.score}` : "Faça abaixo"} />
      </div>

      <div className="rounded-xl bg-white shadow-[var(--shadow-card)] p-6">
        <h2 className="text-navy font-bold text-lg">✅ Treinos de hoje</h2>
        <p className="text-sm text-muted-foreground mt-1">Marque o que você completou.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {WORKOUTS.map((w) => {
            const done = doneToday.has(w.key);
            return (
              <button
                key={w.key}
                disabled={toggle.isPending}
                onClick={() => toggle.mutate({ workoutType: w.key, completed: !done })}
                className={[
                  "rounded-xl p-4 border-2 transition text-left",
                  done ? "bg-green-light border-green text-green-dark" : "bg-white border-border hover:border-green/50",
                ].join(" ")}
              >
                <div className="text-2xl">{w.emoji}</div>
                <div className="font-bold mt-1 text-sm">{w.label}</div>
                <div className="text-xs opacity-70 mt-0.5">{done ? "✓ Concluído" : "Marcar"}</div>
              </button>
            );
          })}
        </div>
      </div>

      <WeeklyProgressChart />

      <ScreeningForm initial={data?.latestScreening} />

      <div className="rounded-xl bg-white shadow-[var(--shadow-card)] p-6">
        <h2 className="text-navy font-bold text-lg">🤖 Quer orientação personalizada?</h2>
        <p className="text-sm text-muted-foreground mt-1">Converse com a IA Saúde Plus.</p>
        <Link to="/ia" className="inline-block mt-3 px-4 py-2 rounded-lg bg-navy text-white text-sm font-semibold hover:opacity-90">Abrir chat →</Link>
      </div>
    </section>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl bg-white shadow-[var(--shadow-card)] p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="text-2xl font-extrabold text-navy mt-1.5 capitalize">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{hint}</div>
    </div>
  );
}

const QUESTIONS = [
  { key: "exercise_level", label: "Frequência de exercício", options: ["Nunca", "Raro", "Às vezes", "Frequente", "Diário"] },
  { key: "diet_level", label: "Qualidade da alimentação", options: ["Péssima", "Ruim", "Regular", "Boa", "Excelente"] },
  { key: "sleep_level", label: "Qualidade do sono", options: ["Péssimo", "Ruim", "Regular", "Bom", "Excelente"] },
  { key: "family_history", label: "Histórico familiar de doenças crônicas", options: ["Nenhum", "Leve", "Moderado", "Alto", "Muito alto"] },
] as const;

function ScreeningForm({ initial }: { initial: { exercise_level: number; diet_level: number; sleep_level: number; family_history: number } | null | undefined }) {
  const qc = useQueryClient();
  const fn = useServerFn(submitScreening);
  const [values, setValues] = useState<Record<string, number>>({
    exercise_level: initial?.exercise_level ?? 2,
    diet_level: initial?.diet_level ?? 2,
    sleep_level: initial?.sleep_level ?? 2,
    family_history: initial?.family_history ?? 0,
  });

  const m = useMutation({
    mutationFn: () => fn({ data: values as { exercise_level: number; diet_level: number; sleep_level: number; family_history: number } }),
    onSuccess: () => {
      toast.success("Triagem registrada!");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <div className="rounded-xl bg-white shadow-[var(--shadow-card)] p-6">
      <h2 className="text-navy font-bold text-lg">🩺 Triagem preventiva</h2>
      <p className="text-sm text-muted-foreground mt-1">Avalie seus hábitos e descubra seu nível de risco.</p>
      <div className="space-y-4 mt-4">
        {QUESTIONS.map((q) => (
          <div key={q.key}>
            <label className="text-sm font-semibold text-navy">{q.label}</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {q.options.map((opt, idx) => {
                const active = values[q.key] === idx;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setValues((v) => ({ ...v, [q.key]: idx }))}
                    className={[
                      "px-3 py-1.5 rounded-lg text-xs font-semibold border transition",
                      active ? "bg-green text-white border-green" : "bg-white text-navy border-border hover:border-green/50",
                    ].join(" ")}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => m.mutate()}
        disabled={m.isPending}
        className="mt-5 w-full sm:w-auto px-5 py-2.5 rounded-lg bg-navy text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50"
      >
        {m.isPending ? "Salvando..." : "Calcular meu risco"}
      </button>
    </div>
  );
}
