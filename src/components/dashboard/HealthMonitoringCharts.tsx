import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from "recharts";

const glucoseData = [
  { name: "Seg", glicose: 14, alimentacao: 5 },
  { name: "Ter", glicose: 17, alimentacao: 8 },
  { name: "Qua", glicose: 13, alimentacao: 11 },
  { name: "Qui", glicose: 20, alimentacao: 16 },
  { name: "Sex", glicose: 16, alimentacao: 19 },
  { name: "Sáb", glicose: 12, alimentacao: 21 },
  { name: "Dom", glicose: 10, alimentacao: 25 },
];

const caloriesData = [
  { name: "Massa", massa: 140, carbs: 60, calorias: 30, weekly: 20, meta: 10 },
  { name: "Proteína", massa: 100, carbs: 50, calorias: 20, weekly: 15, meta: 8 },
  { name: "Carbs", massa: 160, carbs: 30, calorias: 20, weekly: 10, meta: 5 },
  { name: "Gordura", massa: 110, carbs: 40, calorias: 20, weekly: 15, meta: 10 },
];

const dietData = [
  { name: "Alimentação", value: 35, color: "#001F3F" },
  { name: "Massa", value: 20, color: "#00C49F" },
  { name: "Exercício", value: 20, color: "#00B2D9" },
  { name: "Outros", value: 25, color: "#F39C12" },
];

export function HealthMonitoringCharts() {
  return (
    <div className="rounded-xl bg-white shadow-[var(--shadow-card)] p-6 space-y-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">📊</span>
        <h2 className="text-navy font-bold text-lg">Monitorar a Saúde</h2>
      </div>

      {/* Glicose vs Alimentação */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Glicose vs Alimentação</h3>
        <div className="h-[250px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={glucoseData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} domain={[0, 28]} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ stroke: '#e2e8f0' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="square" />
              <Line 
                type="monotone" 
                dataKey="glicose" 
                stroke="#001F3F" 
                strokeWidth={3} 
                dot={{ r: 6, fill: "#001F3F", strokeWidth: 2, stroke: "#fff" }} 
                activeDot={{ r: 8 }} 
                name="Glicose"
              />
              <Line 
                type="monotone" 
                dataKey="alimentacao" 
                stroke="#2ECC71" 
                strokeWidth={3} 
                dot={{ r: 6, fill: "#2ECC71", strokeWidth: 2, stroke: "#fff" }} 
                name="Alimentação"
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="absolute top-2 right-4 bg-[#001F3F] text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
            75 Calorias
          </div>
        </div>
      </div>

      {/* Calorias por Alimento */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Calorias por Alimento</h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={caloriesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} domain={[0, 300]} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend verticalAlign="right" layout="vertical" align="right" iconType="square" />
              <Bar dataKey="massa" stackId="a" fill="#001F3F" name="Massa" barSize={40} />
              <Bar dataKey="carbs" stackId="a" fill="#F39C12" name="Carbs" />
              <Bar dataKey="calorias" stackId="a" fill="#E74C3C" name="Calorias" />
              <Bar dataKey="weekly" stackId="a" fill="#2ECC71" name="Weekly" />
              <Bar dataKey="meta" stackId="a" fill="#3498DB" name="Meta" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-center text-[10px] text-slate-500 mt-2">
          ■ 1965 Calorias consumidas durante 7 semanas
        </p>
      </div>

      {/* Composição da Dieta */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Composição da Dieta</h3>
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
              <Tooltip />
              <Legend 
                verticalAlign="bottom" 
                align="center" 
                layout="vertical"
                formatter={(value, entry: any) => (
                  <span className="text-xs text-slate-600">
                    {value} ({entry.payload.value}%)
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
