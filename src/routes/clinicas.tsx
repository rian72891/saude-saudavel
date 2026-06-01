import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { LocationMap, type MapMarker } from "@/components/maps/LocationMap";
import { useGeolocation } from "@/lib/useGeolocation";
import { distanceKm } from "@/lib/distance";

export const Route = createFileRoute("/clinicas")({
  head: () => ({
    meta: [
      { title: "Clínicas e UBS perto de você | Saúde + Saudável" },
      { name: "description", content: "Unidades de saúde próximas com endereço, especialidade e contato." },
    ],
  }),
  component: ClinicasPage,
});

type Clinic = {
  id: string; name: string; address: string; lat: number; lng: number;
  clinic_type: string; specialty: string | null; phone: string | null; emoji: string;
};

function ClinicasPage() {
  const { coords } = useGeolocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: clinics = [], isLoading } = useQuery({
    queryKey: ["clinics"],
    queryFn: async (): Promise<Clinic[]> => {
      const { data, error } = await supabase.from("clinics").select("*");
      if (error) throw error;
      return (data ?? []).map((c) => ({ ...c, lat: Number(c.lat), lng: Number(c.lng) }));
    },
  });

  const sorted = useMemo(
    () => [...clinics].map((c) => ({ ...c, distance: distanceKm(coords, c) })).sort((a, b) => a.distance - b.distance),
    [clinics, coords]
  );

  const markers: MapMarker[] = sorted.map((c) => ({
    id: c.id, lat: c.lat, lng: c.lng, title: c.name, emoji: c.emoji,
    variant: "green", description: c.address,
  }));

  return (
    <section className="px-4 sm:px-8 py-7">
      <SectionHeader title="🏥 Clínicas e Postos de Saúde" subtitle="Unidades de saúde próximas à sua localização." />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start mt-4">
        <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
          {isLoading && <div className="text-muted-foreground text-sm">Carregando...</div>}
          {sorted.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={[
                "text-left bg-white rounded-lg shadow-[var(--shadow-soft)] p-4 border-l-4 transition",
                selectedId === c.id ? "border-l-green shadow-[var(--shadow-card)]" : "border-l-transparent hover:border-l-green/60",
              ].join(" ")}
            >
              <h3 className="text-navy font-bold text-sm">{c.emoji} {c.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{c.address}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs font-bold text-navy bg-[oklch(0.94_0.04_245)] px-2 py-0.5 rounded-full">{c.clinic_type}</span>
                <span className="text-xs text-muted-foreground">📍 {c.distance.toFixed(1)} km</span>
              </div>
              {c.specialty && <p className="text-xs text-navy/70 mt-1.5">{c.specialty}</p>}
              {c.phone && <p className="text-xs text-green-dark mt-1 font-semibold">📞 {c.phone}</p>}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-[var(--shadow-card)] overflow-hidden h-[560px]">
          <LocationMap
            center={coords}
            markers={markers}
            selectedId={selectedId}
            onMarkerClick={setSelectedId}
          />
        </div>
      </div>
    </section>
  );
}
