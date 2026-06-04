import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

const InputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusM: z.number().min(100).max(50000).default(5000),
  kind: z.enum(["gym", "clinic"]),
});

export type NearbyPlace = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  userRatingCount: number | null;
  priceLevel: string | null;
  phone: string | null;
  types: string[];
  openNow: boolean | null;
  googleMapsUri: string | null;
};

const KIND_TYPES: Record<"gym" | "clinic", string[]> = {
  gym: ["gym", "fitness_center"],
  clinic: ["hospital", "doctor", "medical_lab", "pharmacy"],
};

export const searchNearbyPlaces = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<{ places: NearbyPlace[]; error: string | null }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    const connKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey || !connKey) {
      return { places: [], error: "Google Maps connector not configured" };
    }

    try {
      const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchNearby`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "X-Connection-Api-Key": connKey,
          "Content-Type": "application/json",
          "X-Goog-FieldMask": [
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.location",
            "places.rating",
            "places.userRatingCount",
            "places.priceLevel",
            "places.nationalPhoneNumber",
            "places.types",
            "places.currentOpeningHours.openNow",
            "places.googleMapsUri",
          ].join(","),
        },
        body: JSON.stringify({
          includedTypes: KIND_TYPES[data.kind],
          maxResultCount: 20,
          rankPreference: "DISTANCE",
          locationRestriction: {
            circle: {
              center: { latitude: data.lat, longitude: data.lng },
              radius: data.radiusM,
            },
          },
          languageCode: "pt-BR",
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error("Places API error", res.status, body);
        return { places: [], error: `Places API ${res.status}` };
      }

      const json = (await res.json()) as {
        places?: Array<{
          id: string;
          displayName?: { text?: string };
          formattedAddress?: string;
          location?: { latitude: number; longitude: number };
          rating?: number;
          userRatingCount?: number;
          priceLevel?: string;
          nationalPhoneNumber?: string;
          types?: string[];
          currentOpeningHours?: { openNow?: boolean };
          googleMapsUri?: string;
        }>;
      };

      const places: NearbyPlace[] = (json.places ?? [])
        .filter((p) => p.location)
        .map((p) => ({
          id: p.id,
          name: p.displayName?.text ?? "Sem nome",
          address: p.formattedAddress ?? "",
          lat: p.location!.latitude,
          lng: p.location!.longitude,
          rating: p.rating ?? null,
          userRatingCount: p.userRatingCount ?? null,
          priceLevel: p.priceLevel ?? null,
          phone: p.nationalPhoneNumber ?? null,
          types: p.types ?? [],
          openNow: p.currentOpeningHours?.openNow ?? null,
          googleMapsUri: p.googleMapsUri ?? null,
        }));

      return { places, error: null };
    } catch (e) {
      console.error("searchNearbyPlaces failed", e);
      return { places: [], error: e instanceof Error ? e.message : "Unknown error" };
    }
  });
