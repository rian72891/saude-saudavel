import { useCallback, useEffect, useRef, useState } from "react";

export type Coords = { lat: number; lng: number };
export type GeoStatus = "idle" | "loading" | "granted" | "denied" | "unsupported" | "error";

// Centro padrão: Av. Paulista, São Paulo (fallback quando geolocalização falha)
export const DEFAULT_CENTER: Coords = { lat: -23.561414, lng: -46.655881 };

type Options = {
  /** Se true, mantém a posição atualizada via watchPosition. */
  watch?: boolean;
};

/**
 * Hook de geolocalização do navegador.
 * - Alta precisão habilitada por padrão (usa GPS quando disponível).
 * - Permite acompanhar o usuário em tempo real (watch).
 * - Expõe accuracy (metros) e função de retry.
 */
export function useGeolocation({ watch = true }: Options = {}) {
  const [coords, setCoords] = useState<Coords>(DEFAULT_CENTER);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    setAccuracy(pos.coords.accuracy);
    setStatus("granted");
    setError(null);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    setError(err.message);
    if (err.code === err.PERMISSION_DENIED) setStatus("denied");
    else setStatus("error");
  }, []);

  const request = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    setStatus("loading");

    const opts: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30_000,
    };

    // Primeira leitura rápida
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, opts);

    // Limpar watch anterior
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (watch) {
      watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, opts);
    }
  }, [handleSuccess, handleError, watch]);

  useEffect(() => {
    request();
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [request]);

  return { coords, accuracy, status, error, retry: request, isDefault: status !== "granted" };
}
