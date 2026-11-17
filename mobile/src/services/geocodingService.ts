// Nominatim geocoding – subject to OSM usage policy (1 req/s, add user-agent).
// https://nominatim.openstreetmap.org/search

interface NominatimResult {
  lat: string;
  lon: string;
}

export async function geocodeLocation(
  query: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    const response = await fetch(url.toString(), {
      headers: { "Accept-Language": "vi,en" },
    });

    if (!response.ok) return null;
    const results: NominatimResult[] = await response.json();
    if (results.length === 0) return null;

    return {
      lat: Number.parseFloat(results[0].lat),
      lng: Number.parseFloat(results[0].lon),
    };
  } catch {
    return null;
  }
}

/** Haversine distance between two lat/lng points in kilometres. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
