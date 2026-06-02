import { useMemo } from "react";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from "recharts";

interface HealthLog {
  log_date: string;
  glucose_mg_dl: number | null;
  total_calories: number;
  meals: any;
}

interface Props {
  data: HealthLog[];
  weeklyGoal?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  proteina: "#001F3F", // Massa/Proteína
  carboidrato: "#F39C12", // Carbs
  gordura: "#E74C3C", // Calorias/Gordura
  vegetal: "#2ECC71", // Weekly/Vegetal
  fruta: "#3498DB", // Meta/Fruta
  doce: "#9B59B6",
  bebida: "#1ABC9C",
};

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function HealthMonitoringCharts({ data, weeklyGoal = 2000 }: Props) {
  // Processamento para Glicose vs Alimentação (Line Chart)
  const glucoseData = useMemo(() => {
    return data.map(log => {
      const date = new Date(log.log_date + 'T00:00:00');
      return {
        name: WEEK_DAYS[date.getDay()],
        glicose: log.glucose_mg_dl,
        alimentacao: log.total_calories / 100, // Escalonado para o gráfico
        realCalories: log.total_calories
      };
    });
  }, [data]);

  // Processamento para Calorias por Alimento (Stacked Bar Chart)
  const caloriesData = useMemo(() => {
    return data.map(log => {
      const date = new Date(log.log_date + 'T00:00:00');
      const meals = Array.isArray(log.meals) ? log.meals : [];
      
      const row: any = { 
        name: WEEK_DAYS[date.getDay()],
      };

      meals.forEach((m: any) => {
        const cat = m.category || 'outros';
        row[cat] = (row[cat] || 0) + m.calories;
      });

      return row;
    });
  }, [data]);

  // Processamento para Composição da Dieta (Pie Chart)
  const dietData = useMemo(() => {
    const totals: Record<string, number> = {};
    let grandTotal = 0;

    data.forEach(log => {
      const meals = Array.isArray(log.meals) ? log.meals : [];
      meals.forEach((m: any) => {
        const cat = m.category || 'outros';
        totals[cat] = (totals[cat] || 0) + m.calories;
        grandTotal += m.calories;
      });
    });

    if (grandTotal === 0) return [];

    return Object.entries(totals).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: Math.round((value / grandTotal) * 100),
      calories: value,
      color: CATEGORY_COLORS[name] || "#BDC3C7"
    }));
  }, [data]);

  const totalCaloriesWeek = useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.total_calories, 0);
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="rounded-xl bg-white shadow-[var(--shadow-card)] p-10 text-center">
        <span className="text-4xl block mb-4">📈</span>
        <h2 className="text-navy font-bold text-lg">Sem dados de saúde esta semana</h2>
        <p className="text-sm text-muted-foreground mt-2">Comece a registrar sua alimentação e glicose para ver o monitoramento.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white shadow-[var(--shadow-card)] p-6 space-y-8">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          <h2 className="text-navy font-bold text-lg">Monitorar a Saúde</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tempo Real</div>
          <a href="/monitor" className="text-[10px] bg-green/10 text-green-dark px-2 py-1 rounded hover:bg-green/20 transition-colors font-bold">ATUALIZAR DADOS</a>
        </div>
      </div>

      {/* Glicose vs Alimentação */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Glicose vs Alimentação (mg/dL vs kcal/100)</h3>
        <div className="h-[250px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={glucoseData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ stroke: '#e2e8f0' }}
                formatter={(value: any, name: string) => {
                  if (name === "Alimentação") return [`${(value * 100).toFixed(0)} kcal`, name];
                  return [value, name];
                }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
              <Line 
                type="monotone" 
                dataKey="glicose" 
                stroke="#001F3F" 
                strokeWidth={3} 
                dot={{ r: 4, fill: "#001F3F", strokeWidth: 2, stroke: "#fff" }} 
                activeDot={{ r: 6 }} 
                name="Glicose"
                connectNulls
              />
              <Line 
                type="monotone" 
                dataKey="alimentacao" 
                stroke="#2ECC71" 
                strokeWidth={3} 
                dot={{ r: 4, fill: "#2ECC71", strokeWidth: 2, stroke: "#fff" }} 
                name="Alimentação"
              />
            </LineChart>
          </ResponsiveContainer>
          {data.length > 0 && data[data.length-1].total_calories > 0 && (
            <div className="absolute top-2 right-4 bg-[#001F3F] text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm animate-pulse">
              {data[data.length-1].total_calories} kcal hoje
            </div>
          )}
        </div>
      </div>

      {/* Calorias por Alimento */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Calorias por Categoria</h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={caloriesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend verticalAlign="right" layout="vertical" align="right" iconType="square" wrapperStyle={{fontSize: '10px'}} />
              {Object.keys(CATEGORY_COLORS).map(cat => (
                <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[cat]} name={cat.charAt(0).toUpperCase() + cat.slice(1)} barSize={30} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-center text-[10px] text-slate-500 mt-2 font-medium">
          ■ {totalCaloriesWeek} Calorias consumidas nos últimos 7 dias
        </p>
      </div>

      {/* Composição da Dieta */}
      {dietData.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Composição da Dieta (%)</h3>
          <div className="h-[250px] w-full flex flex-col items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dietData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dietData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend 
                  verticalAlign="bottom" 
                  align="center" 
                  layout="horizontal"
                  formatter={(value, entry: any) => (
                    <span className="text-[10px] font-bold text-slate-600">
                      {value} ({entry.payload.value}%)
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
