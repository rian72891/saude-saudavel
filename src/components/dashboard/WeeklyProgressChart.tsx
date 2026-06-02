import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getWeeklyProgress } from "@/lib/profile.functions";

export function WeeklyProgressChart() {
  const fn = useServerFn(getWeeklyProgress);
  const { data = [], isLoading } = useQuery({
    queryKey: ["weekly-progress"],
    queryFn: () => fn(),
  });

  return (
    <div className="rounded-xl bg-white shadow-[var(--shadow-card)] p-6">
      <h2 className="text-navy font-bold text-lg">📊 Progresso semanal</h2>
      <p className="text-sm text-muted-foreground mt-1">Treinos concluídos nos últimos 7 dias.</p>
      <div className="h-[220px] mt-4">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Carregando gráfico...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.014 245)" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={32} />
              <Tooltip
                cursor={{ fill: "oklch(0.95 0.01 240)" }}
                contentStyle={{ borderRadius: 10, border: "1px solid oklch(0.91 0.014 245)", fontSize: 12 }}
                formatter={((v: unknown, _n: unknown, p: { payload?: { calories?: number } }) =>
                  [`${v} treino(s) • ${p?.payload?.calories ?? 0} kcal`, "Concluídos"]) as never}
                labelFormatter={(l) => `Dia: ${l}`}
              />
              <Bar dataKey="count" fill="oklch(0.72 0.17 162)" radius={[8, 8, 0, 0]} maxBarSize={42} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
