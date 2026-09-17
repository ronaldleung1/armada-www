import { abbrevState, canonCountry } from './util';

/**
 * Free, keyless geocoding via OpenStreetMap's Nominatim. Called when a member
 * pins a place or saves a profile with an un-pinned place, so usage stays well
 * inside their fair-use policy (1 request/second).
 */

type NominatimRow = {
    lat: string;
    lon: string;
    display_name: string;
    addresstype?: string;
    type?: string;
    address?: Record<string, string>;
};

export type Geocoded = {
    lat: number;
    lng: number;
    display: string;
    /** Normalised name: "Boston, MA", "Prague, Czechia", "Hong Kong". */
    name: string;
};

function titleCase(s: string): string {
    return s.replace(/\b[\p{L}]/gu, (c) => c.toUpperCase());
}

/**
 * Keep what the member typed for the city, then append the state (US) or the
 * country so "Boston" becomes "Boston, MA" and "Prague" becomes "Prague, Czechia".
 * Countries and city-states come back unchanged.
 */
export function formatPlaceName(typed: string, row: NominatimRow): string {
    const typedCity = titleCase(typed.split(',')[0].trim());
    const a = row.address ?? {};
    const kind = row.addresstype ?? row.type ?? '';
    const country = canonCountry(a.country ?? '');
    if (kind === 'country' || (country && country.toLowerCase() === typedCity.toLowerCase())) return country || typedCity;
    if ((a.country_code ?? '').toLowerCase() === 'us') {
        const iso = a['ISO3166-2-lvl4'];
        const state = iso?.startsWith('US-') ? iso.slice(3) : a.state ? abbrevState(a.state) : '';
        return state ? `${typedCity}, ${state}` : typedCity;
    }
    return country ? `${typedCity}, ${country}` : typedCity;
}

export async function geocode(query: string): Promise<Geocoded | null> {
    const q = query.trim();
    if (!q) return null;
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&accept-language=en&q=${encodeURIComponent(q)}`;
    // Nominatim refuses anonymous clients. Browsers ignore this header (they send their own).
    const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'armada-crew/1.0 (https://armada.build)' } });
    if (!res.ok) return null;
    const rows = (await res.json()) as NominatimRow[];
    if (!rows.length) return null;
    const row = rows[0];
    return { lat: parseFloat(row.lat), lng: parseFloat(row.lon), display: row.display_name, name: formatPlaceName(q, row) };
}

/** True when a place still needs a pin or a state/country suffix. */
export function placeNeedsLookup(p?: { name?: string; lat?: number; lng?: number }): boolean {
    if (!p?.name?.trim()) return false;
    return typeof p.lat !== 'number' || typeof p.lng !== 'number' || !p.name.includes(',');
}
