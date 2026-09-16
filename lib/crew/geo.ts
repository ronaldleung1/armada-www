import type { Place } from './types';

/**
 * Free, keyless geocoding via OpenStreetMap's Nominatim. Used only when a
 * member clicks "Find" while editing a place, so usage stays well inside
 * their fair-use policy (1 request/second).
 */
export async function geocode(query: string): Promise<Pick<Place, 'lat' | 'lng'> & { display: string } | null> {
    const q = query.trim();
    if (!q) return null;
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const rows = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    if (!rows.length) return null;
    return { lat: parseFloat(rows[0].lat), lng: parseFloat(rows[0].lon), display: rows[0].display_name };
}
