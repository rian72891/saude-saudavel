import { useEffect, useState } from "react";

export type Coords = { lat: number; lng: number };
// Centro padrão: Av. Paulista, São Paulo
export const DEFAULT_CENTER: Coords = { lat: -23.561414, lng: -46.655881 };

export function useGeolocation() {
  const [coords, setCoords] = useState<Coords>(DEFAULT_CENTER);
  const [status, setStatus] = useState<"idle" | "loading" | "granted" | "denied" | "unsupported">("idle");

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    setStatus("loading");
    const watcher = navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("granted");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
    return () => {
      // getCurrentPosition não retorna id, mas garantimos cleanup defensivo
      void watcher;
    };
  }, []);

  return { coords, status };
}
