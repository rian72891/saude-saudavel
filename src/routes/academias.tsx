import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { LocationMap, type MapMarker } from "@/components/maps/LocationMap";
import { DEFAULT_CENTER, useGeolocation } from "@/lib/useGeolocation";
import { distanceKm } from "@/lib/distance";

export const Route = createFileRoute("/academias")({
  head: () => ({
    meta: [
      { title: "Academias perto de você | Saúde + Saudável" },
      { name: "description", content: "Encontre academias próximas com mapa real, avaliações e faixa de preço." },
    ],
  }),
  component: AcademiasPage,
});

type Gym = {
  id: string; name: string; address: string; lat: number; lng: number;
  rating: number; price_range: string; specialty: string | null; emoji: string;
};

function AcademiasPage() {
  const { coords, status } = useGeolocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: gyms = [], isLoading } = useQuery({
    queryKey: ["gyms"],
    queryFn: async (): Promise<Gym[]> => {
      const { data, error } = await supabase.from("gyms").select("*");
      if (error) throw error;
      return (data ?? []).map((g) => ({ ...g, lat: Number(g.lat), lng: Number(g.lng), rating: Number(g.rating) }));
    },
  });

  const sorted = useMemo(() => {
    return [...gyms]
      .map((g) => ({ ...g, distance: distanceKm(coords, g) }))
      .sort((a, b) => a.distance - b.distance);
  }, [gyms, coords]);

  const markers: MapMarker[] = sorted.map((g) => ({
    id: g.id, lat: g.lat, lng: g.lng, title: g.name, emoji: g.emoji,
    variant: "navy", description: g.address,
  }));

  return (
    <section className="px-4 sm:px-8 py-7">
      <SectionHeader title="🏋️ Academias Perto de Você" subtitle="Encontre a academia ideal para o seu estilo de vida." />
      <GeoStatusBanner status={status} />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start mt-4">
        <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
          {isLoading && <div className="text-muted-foreground text-sm">Carregando...</div>}
          {sorted.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelectedId(g.id)}
              className={[
                "text-left bg-white rounded-lg shadow-[var(--shadow-soft)] p-4 border-l-4 transition",
                selectedId === g.id ? "border-l-green shadow-[var(--shadow-card)]" : "border-l-transparent hover:border-l-green/60",
              ].join(" ")}
            >
              <h3 className="text-navy font-bold text-sm">{g.emoji} {g.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{g.address}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-amber-500 text-xs font-semibold">⭐ {g.rating.toFixed(1)}</span>
                <span className="text-xs font-bold text-green-dark bg-green-light px-2 py-0.5 rounded-full">{g.price_range}</span>
                <span className="text-xs text-muted-foreground">📍 {g.distance.toFixed(1)} km</span>
              </div>
              {g.specialty && <p className="text-xs text-navy/70 mt-1.5">{g.specialty}</p>}
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

function GeoStatusBanner({ status }: { status: string }) {
  if (status === "granted" || status === "idle") return null;
  const msg =
    status === "loading" ? "Solicitando sua localização..." :
    status === "denied" ? `Permissão negada. Mostrando o centro de referência (Av. Paulista, SP).` :
    status === "unsupported" ? "Geolocalização não suportada neste navegador." : "";
  if (!msg) return null;
  return (
    <div className="mb-3 text-xs px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
      {msg} <span className="text-amber-700/80">Coordenadas padrão: {DEFAULT_CENTER.lat.toFixed(4)}, {DEFAULT_CENTER.lng.toFixed(4)}</span>
    </div>
  );
}
