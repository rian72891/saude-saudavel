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
  proteina: "#001F3F",
  carboidrato: "#F39C12",
  gordura: "#E74C3C",
  vegetal: "#2ECC71",
  fruta: "#3498DB",
  doce: "#9B59B6",
  bebida: "#1ABC9C",
};

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Dados de exemplo caso o usuário não tenha registros
const MOCK_DATA = [
  { log_date: "2026-05-26", glucose_mg_dl: 14, total_calories: 500, meals: [{category: 'proteina', calories: 500}] },
  { log_date: "2026-05-27", glucose_mg_dl: 17, total_calories: 800, meals: [{category: 'carboidrato', calories: 800}] },
  { log_date: "2026-05-28", glucose_mg_dl: 13, total_calories: 1100, meals: [{category: 'gordura', calories: 1100}] },
  { log_date: "2026-05-29", glucose_mg_dl: 20, total_calories: 1600, meals: [{category: 'vegetal', calories: 1600}] },
  { log_date: "2026-05-30", glucose_mg_dl: 16, total_calories: 1900, meals: [{category: 'fruta', calories: 1900}] },
  { log_date: "2026-05-31", glucose_mg_dl: 12, total_calories: 2100, meals: [{category: 'doce', calories: 2100}] },
  { log_date: "2026-06-01", glucose_mg_dl: 10, total_calories: 2500, meals: [{category: 'bebida', calories: 2500}] },
];

export function HealthMonitoringCharts({ data, weeklyGoal = 2000 }: Props) {
  const hasRealData = data && data.length > 0 && data.some(d => d.total_calories > 0 || d.glucose_mg_dl !== null);
  const activeData = hasRealData ? data : MOCK_DATA;

  // Processamento para Glicose vs Alimentação (Line Chart)
  const glucoseData = useMemo(() => {
    return activeData.map(log => {
      const date = new Date(log.log_date + 'T00:00:00');
      return {
        name: WEEK_DAYS[date.getDay()],
        glicose: log.glucose_mg_dl,
        alimentacao: log.total_calories / 100,
        realCalories: log.total_calories
      };
    });
  }, [activeData]);

  // Processamento para Calorias por Alimento (Stacked Bar Chart)
  const caloriesData = useMemo(() => {
    return activeData.map(log => {
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
  }, [activeData]);

  // Processamento para Composição da Dieta (Pie Chart)
  const dietData = useMemo(() => {
    const totals: Record<string, number> = {};
    let grandTotal = 0;

    activeData.forEach(log => {
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
  }, [activeData]);

  const totalCaloriesWeek = useMemo(() => {
    return activeData.reduce((acc, curr) => acc + curr.total_calories, 0);
  }, [activeData]);

  return (
    <div className="rounded-xl bg-white shadow-[var(--shadow-card)] p-6 space-y-8 relative overflow-hidden">
      {!hasRealData && (
        <div className="absolute top-2 right-2 z-10">
          <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
            DADOS DE EXEMPLO
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          <h2 className="text-navy font-bold text-lg">Monitorar a Saúde</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {hasRealData ? 'Tempo Real' : 'Demonstração'}
          </div>
          <a href="/monitor" className="text-[10px] bg-green text-white px-2 py-1 rounded hover:bg-green-dark transition-colors font-bold shadow-sm">
            {hasRealData ? 'ATUALIZAR' : 'COMEÇAR AGORA'}
          </a>
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
          {activeData.length > 0 && activeData[activeData.length-1].total_calories > 0 && (
            <div className="absolute top-2 right-4 bg-[#001F3F] text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm animate-pulse">
              {activeData[activeData.length-1].total_calories} kcal hoje
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
          ■ {totalCaloriesWeek} Calorias consumidas no período
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
