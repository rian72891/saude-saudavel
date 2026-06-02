import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getProfile, updateProfile } from "@/lib/profile.functions";
import { SectionHeader } from "@/components/ui/SectionHeader";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Meu Perfil | Saúde + Saudável" },
      { name: "description", content: "Atualize seus dados pessoais e veja seu IMC." },
    ],
  }),
  component: PerfilPage,
});

type Form = {
  full_name: string;
  age: string;
  weight_kg: string;
  height_cm: string;
  city: string;
  weekly_goal_cal: string;
};

const empty: Form = { full_name: "", age: "", weight_kg: "", height_cm: "", city: "", weekly_goal_cal: "900" };

function PerfilPage() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(getProfile);
  const updateFn = useServerFn(updateProfile);

  const { data, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchFn(),
  });

  const [form, setForm] = useState<Form>(empty);

  useEffect(() => {
    if (data) {
      setForm({
        full_name: data.full_name ?? "",
        age: data.age?.toString() ?? "",
        weight_kg: data.weight_kg?.toString() ?? "",
        height_cm: data.height_cm?.toString() ?? "",
        city: data.city ?? "",
        weekly_goal_cal: (data.weekly_goal_cal ?? 900).toString(),
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => updateFn({
      data: {
        full_name: form.full_name.trim(),
        age: form.age ? Number(form.age) : null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        city: form.city.trim() || null,
        weekly_goal_cal: Number(form.weekly_goal_cal) || 900,
      },
    }),
    onSuccess: () => {
      toast.success("Perfil atualizado!");
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const weight = Number(form.weight_kg);
  const heightM = Number(form.height_cm) / 100;
  const bmi = weight > 0 && heightM > 0 ? weight / (heightM * heightM) : null;
  const bmiInfo = classifyBMI(bmi);

  if (isLoading) return <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>;

  return (
    <section className="px-4 sm:px-8 py-7 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <SectionHeader title="👤 Meu Perfil" subtitle="Mantenha seus dados atualizados para recomendações mais precisas." />
        <Link to="/dashboard" className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-muted/30 text-navy font-medium">← Dashboard</Link>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
        className="rounded-xl bg-white shadow-[var(--shadow-card)] p-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <Field label="Nome completo" required>
          <input
            type="text" required value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="input" placeholder="Como devemos chamar você?"
          />
        </Field>
        <Field label="Cidade">
          <input
            type="text" value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="input" placeholder="Ex.: São Paulo"
          />
        </Field>
        <Field label="Idade">
          <input
            type="number" min={1} max={120} value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
            className="input" placeholder="anos"
          />
        </Field>
        <Field label="Peso (kg)">
          <input
            type="number" step="0.1" min={20} max={400} value={form.weight_kg}
            onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
            className="input" placeholder="ex.: 72.5"
          />
        </Field>
        <Field label="Altura (cm)">
          <input
            type="number" step="0.1" min={80} max={260} value={form.height_cm}
            onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
            className="input" placeholder="ex.: 175"
          />
        </Field>
        <Field label="Meta semanal de calorias">
          <input
            type="number" min={100} max={20000} value={form.weekly_goal_cal}
            onChange={(e) => setForm({ ...form, weekly_goal_cal: e.target.value })}
            className="input"
          />
        </Field>

        <div className="sm:col-span-2 flex items-center justify-between gap-4 pt-2 flex-wrap">
          <BMICard bmi={bmi} info={bmiInfo} />
          <button
            type="submit" disabled={save.isPending}
            className="px-5 py-2.5 rounded-lg bg-navy text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50"
          >
            {save.isPending ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>

      <style>{`
        .input {
          width: 100%;
          margin-top: 6px;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: white;
          font-size: 14px;
          outline: none;
          transition: border-color .15s, box-shadow .15s;
        }
        .input:focus { border-color: var(--green); box-shadow: 0 0 0 3px color-mix(in oklab, var(--green) 20%, transparent); }
      `}</style>
    </section>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-navy">
      {label}{required && <span className="text-destructive ml-0.5">*</span>}
      {children}
    </label>
  );
}

function BMICard({ bmi, info }: { bmi: number | null; info: { label: string; color: string } | null }) {
  return (
    <div className="rounded-lg bg-muted/40 p-4 flex items-center gap-4 flex-1 min-w-[220px]">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">IMC</div>
        <div className="text-2xl font-extrabold text-navy mt-0.5">{bmi ? bmi.toFixed(1) : "—"}</div>
      </div>
      {info && (
        <div className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: info.color, color: "white" }}>
          {info.label}
        </div>
      )}
    </div>
  );
}

function classifyBMI(bmi: number | null): { label: string; color: string } | null {
  if (!bmi) return null;
  if (bmi < 18.5) return { label: "Abaixo do peso", color: "oklch(0.65 0.15 240)" };
  if (bmi < 25) return { label: "Peso saudável", color: "oklch(0.62 0.16 162)" };
  if (bmi < 30) return { label: "Sobrepeso", color: "oklch(0.72 0.16 70)" };
  if (bmi < 35) return { label: "Obesidade I", color: "oklch(0.65 0.20 40)" };
  return { label: "Obesidade II+", color: "oklch(0.55 0.22 27)" };
}
