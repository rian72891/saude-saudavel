import { useEffect, useRef, useState } from "react";
import type { Coords } from "@/lib/useGeolocation";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  emoji: string;
  variant?: "navy" | "green";
  description?: string;
};

type Props = {
  center: Coords;
  markers: MapMarker[];
  selectedId?: string | null;
  onMarkerClick?: (id: string) => void;
  showUserLocation?: boolean;
  autoFit?: boolean;
  accuracy?: number | null;
  showLocateButton?: boolean;
  onLocateClick?: () => void;
};

type RouteInfo = {
  destId: string;
  destTitle: string;
  distanceM: number;
  durationS: number;
  mode: "foot" | "driving";
};

/**
 * Mapa Leaflet + OpenStreetMap com:
 * - Blue dot pulsante (posição do usuário)
 * - Navegação NATIVA via OSRM público (gratuito) — desenha rota na própria tela.
 * - Sem redirecionamento para Google Maps.
 */
export function LocationMap({
  center,
  markers,
  selectedId,
  onMarkerClick,
  showUserLocation = true,
  autoFit = true,
  accuracy = null,
  showLocateButton = true,
  onLocateClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRefs = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const userMarkerRef = useRef<import("leaflet").Marker | null>(null);
  const accuracyCircleRef = useRef<import("leaflet").Circle | null>(null);
  const routeLayerRef = useRef<import("leaflet").Polyline | null>(null);
  const routeHaloRef = useRef<import("leaflet").Polyline | null>(null);
  const didInitialFitRef = useRef(false);
  const onMarkerClickRef = useRef(onMarkerClick);
  const centerRef = useRef(center);
  const [centeredOnUser, setCenteredOnUser] = useState(false);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  useEffect(() => { onMarkerClickRef.current = onMarkerClick; }, [onMarkerClick]);
  useEffect(() => { centerRef.current = center; }, [center]);

  // Init mapa
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, {
        center: [center.lat, center.lng], zoom: 13, scrollWheelZoom: true, zoomControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      map.on("dragstart", () => setCenteredOnUser(false));
      map.on("zoomstart", () => setCenteredOnUser(false));
      mapRef.current = map;
      setTimeout(() => { if (!cancelled) { map.invalidateSize(); map.setView([center.lat, center.lng], 13); } }, 250);
    })();
    return () => {
      cancelled = true;
      markerRefs.current.forEach((m) => m.remove());
      markerRefs.current.clear();
      accuracyCircleRef.current?.remove(); accuracyCircleRef.current = null;
      userMarkerRef.current?.remove(); userMarkerRef.current = null;
      routeLayerRef.current?.remove(); routeLayerRef.current = null;
      routeHaloRef.current?.remove(); routeHaloRef.current = null;
      mapRef.current?.remove(); mapRef.current = null;
      didInitialFitRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Blue dot + accuracy
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;
      if (!showUserLocation) return;
      const icon = L.divIcon({ className: "", html: `<div class="saude-pin-user"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] });
      if (userMarkerRef.current) userMarkerRef.current.setLatLng([center.lat, center.lng]);
      else userMarkerRef.current = L.marker([center.lat, center.lng], { icon, zIndexOffset: 500, interactive: false }).addTo(mapRef.current);

      if (accuracy && accuracy > 0 && accuracy < 5000) {
        if (accuracyCircleRef.current) {
          accuracyCircleRef.current.setLatLng([center.lat, center.lng]);
          accuracyCircleRef.current.setRadius(accuracy);
        } else {
          accuracyCircleRef.current = L.circle([center.lat, center.lng], {
            radius: accuracy, color: "#4285F4", fillColor: "#4285F4", fillOpacity: 0.08, weight: 1,
          }).addTo(mapRef.current);
        }
      } else if (accuracyCircleRef.current) {
        accuracyCircleRef.current.remove(); accuracyCircleRef.current = null;
      }
    })();
    return () => { cancelled = true; };
  }, [center.lat, center.lng, showUserLocation, accuracy]);

  // Auto-fit
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current || !autoFit) return;
      const map = mapRef.current;
      if (markers.length === 0) { map.setView([center.lat, center.lng], 14); return; }
      const nearest = [...markers]
        .map((m) => ({ m, d: Math.hypot(m.lat - center.lat, m.lng - center.lng) }))
        .sort((a, b) => a.d - b.d).slice(0, 5).map((x) => x.m);
      const bounds = L.latLngBounds([[center.lat, center.lng], ...nearest.map((m) => [m.lat, m.lng] as [number, number])]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      didInitialFitRef.current = true;
    })();
    return () => { cancelled = true; };
  }, [center.lat, center.lng, markers, autoFit]);

  // POI markers with NATIVE directions button
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;
      const map = mapRef.current;

      const ids = new Set(markers.map((m) => m.id));
      markerRefs.current.forEach((m, id) => { if (!ids.has(id)) { m.remove(); markerRefs.current.delete(id); } });

      markers.forEach((mk) => {
        const variant = mk.variant ?? "green";
        const icon = L.divIcon({
          className: "",
          html: `<div class="saude-pin ${variant === "navy" ? "navy" : ""}"><span>${mk.emoji}</span></div>`,
          iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -28],
        });

        const safeTitle = escapeHtml(mk.title);
        const safeDesc = mk.description ? escapeHtml(mk.description) : "";
        const popupHtml = `
          <div class="saude-popup">
            <h4>${mk.emoji} ${safeTitle}</h4>
            ${safeDesc ? `<p>${safeDesc}</p>` : ""}
            <div class="saude-popup-actions">
              <button type="button" class="directions" data-mode="foot">🚶 A pé</button>
              <button type="button" class="directions secondary" data-mode="driving">🚗 De carro</button>
            </div>
          </div>`;

        const existing = markerRefs.current.get(mk.id);
        const bindActions = (marker: import("leaflet").Marker) => {
          marker.off("popupopen");
          marker.on("popupopen", (e) => {
            const el = (e as unknown as { popup: { getElement: () => HTMLElement | null } }).popup.getElement();
            el?.querySelectorAll<HTMLButtonElement>("button.directions").forEach((btn) => {
              btn.addEventListener("click", () => {
                const mode = (btn.dataset.mode as "foot" | "driving") ?? "foot";
                void fetchRoute(mk, mode);
                map.closePopup();
              }, { once: true });
            });
          });
        };

        if (existing) {
          existing.setLatLng([mk.lat, mk.lng]);
          existing.setIcon(icon);
          existing.setPopupContent(popupHtml);
          bindActions(existing);
        } else {
          const marker = L.marker([mk.lat, mk.lng], { icon })
            .bindPopup(popupHtml, { closeButton: true, autoPan: true })
            .addTo(map);
          marker.on("click", () => onMarkerClickRef.current?.(mk.id));
          bindActions(marker);
          markerRefs.current.set(mk.id, marker);
        }
      });
    })();
    return () => { cancelled = true; };
  }, [markers]);

  // Selected → flyTo
  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const marker = markerRefs.current.get(selectedId);
    if (marker) {
      mapRef.current.flyTo(marker.getLatLng(), 16, { animate: true, duration: 0.8 });
      marker.openPopup();
      setCenteredOnUser(false);
    }
  }, [selectedId]);

  // ============== OSRM: native routing (free public demo server) ==============
  async function fetchRoute(dest: MapMarker, mode: "foot" | "driving") {
    const map = mapRef.current;
    if (!map) return;
    setRouting(true); setRouteError(null);
    try {
      const c = centerRef.current;
      const url = `https://router.project-osrm.org/route/v1/${mode}/${c.lng},${c.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Falha no serviço de rotas");
      const json = await res.json();
      const r = json.routes?.[0];
      if (!r) throw new Error("Rota não encontrada");
      const coords: [number, number][] = r.geometry.coordinates.map((p: [number, number]) => [p[1], p[0]]);

      const L = (await import("leaflet")).default;
      routeLayerRef.current?.remove();
      routeHaloRef.current?.remove();
      routeHaloRef.current = L.polyline(coords, { color: "#1a73e8", weight: 9, opacity: 0.25, lineCap: "round", lineJoin: "round" }).addTo(map);
      routeLayerRef.current = L.polyline(coords, { color: "#1a73e8", weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round" }).addTo(map);
      map.fitBounds(L.latLngBounds(coords), { padding: [60, 60] });

      setRoute({ destId: dest.id, destTitle: dest.title, distanceM: r.distance, durationS: r.duration, mode });
    } catch (e) {
      setRouteError(e instanceof Error ? e.message : "Erro ao traçar rota");
    } finally {
      setRouting(false);
    }
  }

  function clearRoute() {
    routeLayerRef.current?.remove(); routeLayerRef.current = null;
    routeHaloRef.current?.remove(); routeHaloRef.current = null;
    setRoute(null); setRouteError(null);
  }

  const handleLocate = () => {
    onLocateClick?.();
    if (!mapRef.current) return;
    mapRef.current.flyTo([center.lat, center.lng], 16, { animate: true, duration: 1 });
    setCenteredOnUser(true);
  };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full min-h-[480px] rounded-lg overflow-hidden" />

      {showLocateButton && (
        <button type="button" onClick={handleLocate} aria-label="Minha localização" title="Minha localização"
          className={`gmaps-locate-btn ${centeredOnUser ? "active" : ""}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="9" />
            <line x1="12" y1="1" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="23" />
            <line x1="1" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="23" y2="12" />
          </svg>
        </button>
      )}

      {(routing || route || routeError) && (
        <div className="route-panel">
          {routing && <div className="route-panel-line">📡 Calculando rota...</div>}
          {routeError && <div className="route-panel-line text-red-600">⚠️ {routeError}</div>}
          {route && !routing && (
            <>
              <div className="route-panel-head">
                <span className="route-panel-mode">{route.mode === "foot" ? "🚶 A pé" : "🚗 De carro"}</span>
                <button type="button" className="route-panel-close" onClick={clearRoute} aria-label="Fechar rota">✕</button>
              </div>
              <div className="route-panel-dest">{route.destTitle}</div>
              <div className="route-panel-stats">
                <strong>{formatDuration(route.durationS)}</strong>
                <span>•</span>
                <span>{formatDistance(route.distanceM)}</span>
              </div>
              <div className="route-panel-credit">Rotas por OSRM/OSM (gratuito)</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function formatDistance(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km` : `${Math.round(m)} m`;
}
function formatDuration(s: number) {
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60); const r = min % 60;
  return `${h}h${r ? ` ${r}min` : ""}`;
}
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
