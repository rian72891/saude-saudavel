import { useEffect, useRef } from "react";
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
  /** Quando true, ajusta o zoom para mostrar usuário + marcadores mais próximos. */
  autoFit?: boolean;
  /** Raio de precisão (em metros) para desenhar círculo ao redor do usuário. */
  accuracy?: number | null;
};

/**
 * Mapa real com Leaflet + OpenStreetMap.
 * - Renderização exclusivamente no cliente (Leaflet usa `window`).
 * - Cleanup completo no unmount para evitar memory leaks.
 * - Recentra automaticamente quando o usuário se move, mas respeita seleção manual.
 */
export function LocationMap({
  center,
  markers,
  selectedId,
  onMarkerClick,
  showUserLocation = true,
  autoFit = true,
  accuracy = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRefs = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const userMarkerRef = useRef<import("leaflet").Marker | null>(null);
  const accuracyCircleRef = useRef<import("leaflet").Circle | null>(null);
  const didInitialFitRef = useRef(false);
  const onMarkerClickRef = useRef(onMarkerClick);

  // Mantém a ref do callback estável (evita recriar marcadores).
  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  // Inicialização única do mapa
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [center.lat, center.lng],
        zoom: 13,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      // Força recálculo do tamanho após render
      setTimeout(() => map.invalidateSize(), 100);
    })();

    return () => {
      cancelled = true;
      markerRefs.current.forEach((m) => m.remove());
      markerRefs.current.clear();
      accuracyCircleRef.current?.remove();
      accuracyCircleRef.current = null;
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      didInitialFitRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualizar marker do usuário + círculo de precisão
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;

      if (showUserLocation) {
        const icon = L.divIcon({
          className: "",
          html: `<div class="saude-pin-user"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([center.lat, center.lng]);
        } else {
          userMarkerRef.current = L.marker([center.lat, center.lng], { icon, zIndexOffset: 500 })
            .bindPopup("📍 Você está aqui")
            .addTo(mapRef.current);
        }

        // Círculo de precisão (apenas se accuracy razoável)
        if (accuracy && accuracy > 0 && accuracy < 5000) {
          if (accuracyCircleRef.current) {
            accuracyCircleRef.current.setLatLng([center.lat, center.lng]);
            accuracyCircleRef.current.setRadius(accuracy);
          } else {
            accuracyCircleRef.current = L.circle([center.lat, center.lng], {
              radius: accuracy,
              color: "#06b6d4",
              fillColor: "#06b6d4",
              fillOpacity: 0.08,
              weight: 1,
            }).addTo(mapRef.current);
          }
        } else if (accuracyCircleRef.current) {
          accuracyCircleRef.current.remove();
          accuracyCircleRef.current = null;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [center.lat, center.lng, showUserLocation, accuracy]);

  // Auto-fit: enquadra usuário + até 5 marcadores mais próximos (uma vez por mudança grande)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current || !autoFit) return;
      const map = mapRef.current;

      if (markers.length === 0) {
        map.setView([center.lat, center.lng], 14);
        return;
      }

      // 5 marcadores mais próximos do centro
      const nearest = [...markers]
        .map((m) => ({
          m,
          d: Math.hypot(m.lat - center.lat, m.lng - center.lng),
        }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 5)
        .map((x) => x.m);

      const points: [number, number][] = [
        [center.lat, center.lng],
        ...nearest.map((m) => [m.lat, m.lng] as [number, number]),
      ];
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      didInitialFitRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [center.lat, center.lng, markers, autoFit]);

  // Sincronizar marcadores de POIs
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;
      const map = mapRef.current;

      const ids = new Set(markers.map((m) => m.id));
      markerRefs.current.forEach((m, id) => {
        if (!ids.has(id)) {
          m.remove();
          markerRefs.current.delete(id);
        }
      });

      markers.forEach((mk) => {
        const variant = mk.variant ?? "green";
        const icon = L.divIcon({
          className: "",
          html: `<div class="saude-pin ${variant === "navy" ? "navy" : ""}"><span>${mk.emoji}</span></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -28],
        });

        const existing = markerRefs.current.get(mk.id);
        if (existing) {
          existing.setLatLng([mk.lat, mk.lng]);
          existing.setIcon(icon);
        } else {
          const marker = L.marker([mk.lat, mk.lng], { icon })
            .bindPopup(
              `<strong>${mk.title}</strong>${mk.description ? `<br/><span style="color:#64748b;font-size:12px">${mk.description}</span>` : ""}`
            )
            .addTo(map);
          marker.on("click", () => onMarkerClickRef.current?.(mk.id));
          markerRefs.current.set(mk.id, marker);
        }
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [markers]);

  // Centralizar marcador selecionado
  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const marker = markerRefs.current.get(selectedId);
    if (marker) {
      mapRef.current.setView(marker.getLatLng(), 16, { animate: true });
      marker.openPopup();
    }
  }, [selectedId]);

  return <div ref={containerRef} className="w-full h-full min-h-[480px] rounded-lg overflow-hidden" />;
}
