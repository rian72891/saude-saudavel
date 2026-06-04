import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { LocationMap, type MapMarker } from "@/components/maps/LocationMap";
import { DEFAULT_CENTER, useGeolocation } from "@/lib/useGeolocation";
import { distanceKm } from "@/lib/distance";
import { searchNearbyPlaces } from "@/lib/places.functions";
import { PlaceNewsPanel } from "@/components/places/PlaceNewsPanel";

export const Route = createFileRoute("/clinicas")({
  head: () => ({
    meta: [
      { title: "Clínicas e Hospitais perto de você | Saúde + Saudável" },
      { name: "description", content: "Unidades de saúde reais próximas via Google Maps." },
    ],
  }),
  component: ClinicasPage,
});

const RADIUS_OPTIONS = [2, 5, 10, 25, 50] as const;

function emojiForTypes(types: string[]): string {
  if (types.includes("hospital")) return "🏥";
  if (types.includes("pharmacy")) return "💊";
  if (types.includes("medical_lab")) return "🧪";
  return "🩺";
}
function labelForTypes(types: string[]): string {
  if (types.includes("hospital")) return "Hospital";
  if (types.includes("pharmacy")) return "Farmácia";
  if (types.includes("medical_lab")) return "Laboratório";
  if (types.includes("doctor")) return "Consultório";
  return "Clínica";
}

function ClinicasPage() {
  const { coords, accuracy, status, error, retry } = useGeolocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [radius, setRadius] = useState<number>(5);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["nearby-clinics", coords.lat.toFixed(3), coords.lng.toFixed(3), radius],
    queryFn: () =>
      searchNearbyPlaces({
        data: { lat: coords.lat, lng: coords.lng, radiusM: radius * 1000, kind: "clinic" },
      }),
    staleTime: 60_000,
  });

  const places = data?.places ?? [];
  const apiError = data?.error ?? null;

  const sorted = useMemo(
    () => places.map((p) => ({
      ...p,
      distance: distanceKm(coords, p),
      emoji: emojiForTypes(p.types),
      label: labelForTypes(p.types),
    })).sort((a, b) => a.distance - b.distance),
    [places, coords]
  );

  const markers: MapMarker[] = sorted.map((c) => ({
    id: c.id, lat: c.lat, lng: c.lng, title: c.name, emoji: c.emoji,
    variant: "green", description: `${c.address} • ${c.distance.toFixed(1)} km`,
  }));

  return (
    <section className="px-4 sm:px-8 py-7">
      <SectionHeader title="🏥 Clínicas e Hospitais" subtitle="Unidades de saúde reais via Google Maps." />
      <GeoStatusBanner status={status} error={error} accuracy={accuracy} onRetry={retry} nearestKm={sorted[0]?.distance} />

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <span className="text-xs font-semibold text-navy/70 uppercase tracking-wider">Raio:</span>
        {RADIUS_OPTIONS.map((r) => (
          <button key={r} onClick={() => setRadius(r)}
            className={["px-3 py-1.5 rounded-full text-xs font-semibold border transition",
              radius === r ? "bg-navy text-white border-navy" : "bg-white text-navy border-border hover:border-navy/40"].join(" ")}>
            {r} km
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">
          {isFetching ? "Buscando..." : `${sorted.length} resultados`}
        </span>
      </div>

      {apiError && (
        <div className="mt-3 text-xs px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700">
          ⚠️ {apiError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start mt-4">
        <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
          {isLoading && <div className="text-muted-foreground text-sm">Carregando...</div>}
          {!isLoading && sorted.length === 0 && !apiError && (
            <div className="text-sm text-muted-foreground bg-white p-4 rounded-lg shadow-[var(--shadow-soft)]">
              Nenhuma unidade neste raio. Tente ampliar o filtro.
            </div>
          )}
          {sorted.map((c) => (
            <button key={c.id} type="button" onClick={() => setSelectedId(c.id)}
              className={["text-left bg-white rounded-lg shadow-[var(--shadow-soft)] p-4 border-l-4 transition",
                selectedId === c.id ? "border-l-green shadow-[var(--shadow-card)]" : "border-l-transparent hover:border-l-green/60"].join(" ")}>
              <h3 className="text-navy font-bold text-sm">{c.emoji} {c.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{c.address}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs font-bold text-navy bg-[oklch(0.94_0.04_245)] px-2 py-0.5 rounded-full">{c.label}</span>
                <span className="text-xs text-muted-foreground">📍 {c.distance.toFixed(1)} km</span>
                {c.rating !== null && (
                  <span className="text-xs font-bold text-amber-700">⭐ {c.rating.toFixed(1)}</span>
                )}
                {c.openNow !== null && (
                  <span className={`text-xs font-semibold ${c.openNow ? "text-green-dark" : "text-red-600"}`}>
                    {c.openNow ? "🟢 Aberto" : "🔴 Fechado"}
                  </span>
                )}
              </div>
              {c.phone && <p className="text-xs text-green-dark mt-1 font-semibold">📞 {c.phone}</p>}
            </button>
          ))}
          <PlaceNewsPanel placeName={sorted.find((c) => c.id === selectedId)?.name ?? sorted[0]?.name ?? null} placeType="clinic" category={sorted.find((c) => c.id === selectedId)?.label} />
        </div>

        <div className="bg-white rounded-lg shadow-[var(--shadow-card)] overflow-hidden h-[560px]">
          <LocationMap center={coords} markers={markers} selectedId={selectedId} onMarkerClick={setSelectedId} accuracy={accuracy} />
        </div>
      </div>
    </section>
  );
}

function GeoStatusBanner({ status, error, accuracy, onRetry, nearestKm }:
  { status: string; error: string | null; accuracy: number | null; onRetry: () => void; nearestKm?: number }) {
  if (status === "granted") {
    return (
      <div className="mt-3 text-xs px-3 py-2 rounded-md bg-green-light border border-green/30 text-green-dark flex items-center gap-2 flex-wrap">
        <span>✅ Localização ativa</span>
        {accuracy !== null && <span className="opacity-70">• precisão ~{Math.round(accuracy)}m</span>}
        {nearestKm !== undefined && <span className="opacity-70">• mais próximo: {nearestKm.toFixed(1)} km</span>}
        <button onClick={onRetry} className="ml-auto underline hover:opacity-80">Atualizar</button>
      </div>
    );
  }
  const msg =
    status === "loading" ? "📡 Solicitando sua localização..." :
    status === "denied" ? "🚫 Permissão negada. Usando centro padrão (Av. Paulista, SP)." :
    status === "unsupported" ? "Geolocalização não suportada." :
    status === "error" ? `⚠️ Erro: ${error ?? ""}` : "";
  if (!msg) return null;
  return (
    <div className="mt-3 text-xs px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2 flex-wrap">
      <span>{msg}</span>
      <span className="opacity-70">Padrão: {DEFAULT_CENTER.lat.toFixed(4)}, {DEFAULT_CENTER.lng.toFixed(4)}</span>
      <button onClick={onRetry} className="ml-auto underline hover:opacity-80 font-semibold">Tentar novamente</button>
    </div>
  );
}
