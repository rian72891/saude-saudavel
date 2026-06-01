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
};

/**
 * Mapa real com Leaflet + OpenStreetMap.
 * Carregamento client-side apenas (Leaflet usa `window`).
 * Cleanup completo na desmontagem para evitar memory leaks.
 */
export function LocationMap({ center, markers, selectedId, onMarkerClick, showUserLocation = true }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRefs = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const userMarkerRef = useRef<import("leaflet").Marker | null>(null);

  // Inicialização do mapa (uma vez)
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [center.lat, center.lng],
        zoom: 14,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      markerRefs.current.forEach((m) => m.remove());
      markerRefs.current.clear();
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualizar centro + user marker
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;
      mapRef.current.setView([center.lat, center.lng], mapRef.current.getZoom() || 14);

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
            .bindPopup("Você está aqui")
            .addTo(mapRef.current);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [center.lat, center.lng, showUserLocation]);

  // Sincronizar marcadores
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;
      const map = mapRef.current;

      // Remover marcadores obsoletos
      const ids = new Set(markers.map((m) => m.id));
      markerRefs.current.forEach((m, id) => {
        if (!ids.has(id)) {
          m.remove();
          markerRefs.current.delete(id);
        }
      });

      // Adicionar / atualizar
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
          if (onMarkerClick) marker.on("click", () => onMarkerClick(mk.id));
          markerRefs.current.set(mk.id, marker);
        }
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [markers, onMarkerClick]);

  // Selecionar e centralizar marcador
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
