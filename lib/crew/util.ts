import type { Member, Place } from './types';

export function fullName(m: Pick<Member, 'first' | 'last'>): string {
    return `${m.first} ${m.last}`.trim();
}

export function initials(m: Pick<Member, 'first' | 'last'>): string {
    const f = m.first.trim();
    const l = m.last.trim();
    const a = f[0] ?? '';
    const b = l[0] ?? f[1] ?? '';
    return (a + b).toUpperCase();
}

export function slugify(s: string): string {
    return s
        .normalize('NFKD')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function uniqueId(base: string, taken: Set<string>): string {
    let id = base || 'member';
    let n = 2;
    while (taken.has(id)) id = `${base}-${n++}`;
    return id;
}

/** Spring in which the current academic year ends (July onward rolls over). */
export function academicYearEnd(now: Date = new Date()): number {
    return now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
}

const STANDINGS = ['Senior', 'Junior', 'Sophomore', 'Freshman'];

/** Human label for where someone is in their Cornell arc, derived from gradYear. */
export function standing(m: Member, now: Date = new Date()): string {
    if (m.status === 'Dropped out') return m.gradYear ? `Left ${m.gradYear}` : 'Dropped out';
    if (m.degree) return m.degree;
    if (!m.gradYear) return m.status === 'Alumni' ? 'Alum' : '';
    const d = m.gradYear - academicYearEnd(now);
    if (d < 0) return 'Alum';
    if (d < STANDINGS.length) return STANDINGS[d];
    return `Class of ${m.gradYear}`;
}

export function shortYear(year?: number): string {
    return year ? `'${String(year).slice(-2)}` : '';
}

/** "Class of 2027" style label used for grouping. */
export function classLabel(m: Member): string {
    if (m.status === 'Dropped out') return m.gradYear ? `Left in ${m.gradYear}` : 'Dropped out';
    if (m.gradYear) return `Class of ${m.gradYear}`;
    if (m.degree) return m.degree;
    return 'Year unknown';
}

/** Split a comma/semicolon/plus/ampersand separated list. */
export function splitList(s: string): string[] {
    return s
        .split(/[,;+&\n]|\s+and\s+/i)
        .map((x) => x.trim())
        .filter(Boolean);
}

export function joinedLabel(joined?: string): string {
    if (!joined) return '';
    const [y, mo] = joined.split('-').map(Number);
    if (!y) return joined;
    if (!mo) return String(y);
    const d = new Date(y, mo - 1, 1);
    return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

export function relTime(iso?: string, now: Date = new Date()): string {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return '';
    const s = Math.max(0, (now.getTime() - t) / 1000);
    if (s < 45) return 'just now';
    if (s < 3600) return `${Math.round(s / 60)} min ago`;
    if (s < 86400) return `${Math.round(s / 3600)} h ago`;
    if (s < 86400 * 7) return `${Math.round(s / 86400)} d ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Canonical stored form: scheme added, a bare trailing slash dropped. */
export function normalizeUrl(u?: string): string | undefined {
    const s = (u ?? '').trim();
    if (!s) return undefined;
    const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
    return withScheme.replace(/^(https?:\/\/[^/]+)\/$/i, '$1');
}

/** Editing form: no scheme, no bare trailing slash. Saving runs normalizeUrl. */
export function prettyUrl(u?: string): string | undefined {
    if (!u) return u;
    return u.trim().replace(/^https?:\/\//i, '').replace(/^([^/]+)\/$/, '$1');
}

export function hostOf(url?: string): string {
    if (!url) return '';
    try {
        return new URL(normalizeUrl(url)!).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

export function xHandle(url?: string): string {
    if (!url) return '';
    const m = url.match(/(?:x|twitter)\.com\/@?([A-Za-z0-9_]+)/i);
    return m ? `@${m[1]}` : url.replace(/^@/, '@');
}

const US_ALIASES = new Set(['united states', 'usa', 'us', 'u.s.', 'u.s.a.', 'u.s', 'america', 'united states of america']);

const COUNTRY_ALIASES: Record<string, string> = {
    uk: 'United Kingdom', 'u.k.': 'United Kingdom', england: 'United Kingdom', scotland: 'United Kingdom', wales: 'United Kingdom',
    'great britain': 'United Kingdom', britain: 'United Kingdom',
    'czech republic': 'Czechia', czechia: 'Czechia',
    prc: 'China', "people's republic of china": 'China', 'mainland china': 'China',
    hk: 'Hong Kong', 'hong kong sar': 'Hong Kong', 'hong kong, china': 'Hong Kong',
    korea: 'South Korea', 'republic of korea': 'South Korea', 'korea, south': 'South Korea', rok: 'South Korea', 's. korea': 'South Korea',
    uae: 'United Arab Emirates', holland: 'Netherlands', 'the netherlands': 'Netherlands', deutschland: 'Germany',
    roc: 'Taiwan', 'taiwan (roc)': 'Taiwan', 'republic of china': 'Taiwan',
    ksa: 'Saudi Arabia', 'kingdom of saudi arabia': 'Saudi Arabia',
};

/** Places that are their own country for our purposes; never given a ", Country" suffix. */
export const CITY_STATES = new Set(['hong kong', 'macau', 'macao', 'singapore', 'monaco', 'vatican city']);

const STATE_ABBR: Record<string, string> = {
    alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO',
    connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID',
    illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA',
    maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
    mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR',
    pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD',
    tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA',
    'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC',
};
const STATE_BY_ABBR: Record<string, string> = Object.fromEntries(Object.entries(STATE_ABBR).map(([name, ab]) => [ab.toLowerCase(), name]));

function titleCase(s: string): string {
    return s.replace(/\b\w+/g, (w) => (w === 'of' ? w : w[0].toUpperCase() + w.slice(1)));
}

function isUS(segment: string): boolean {
    return US_ALIASES.has(segment.trim().toLowerCase());
}

/** "MA", "ma.", "Massachusetts" -> "Massachusetts"; null when it isn't a US state. */
export function canonState(segment: string): string | null {
    const n = segment.trim().toLowerCase().replace(/\.$/, '');
    if (STATE_ABBR[n]) return titleCase(n);
    if (STATE_BY_ABBR[n]) return titleCase(STATE_BY_ABBR[n]);
    return null;
}

/** "USA" -> "United States", "England" -> "United Kingdom", otherwise trimmed as written. */
export function canonCountry(segment: string): string {
    const t = segment.trim();
    const n = t.toLowerCase();
    if (US_ALIASES.has(n)) return 'United States';
    return COUNTRY_ALIASES[n] ?? t;
}

function segments(p?: Place): string[] {
    return (p?.name ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

/** Canonical country of a free-text place. "Boston, MA" is the United States. */
export function placeCountry(p?: Place): string {
    const parts = segments(p);
    if (!parts.length) return '';
    if (CITY_STATES.has(parts[0].toLowerCase())) return titleCase(parts[0].toLowerCase());
    const last = parts[parts.length - 1];
    if (isUS(last) || canonState(last)) return 'United States';
    return canonCountry(last);
}

/**
 * Grouping key for the Roots lens: a canonical US state when the place is in
 * the US ("Boston, MA" and "Boston, Massachusetts, USA" both give
 * "Massachusetts"), otherwise the canonical country.
 */
export function regionKey(p?: Place): string {
    const parts = segments(p);
    if (!parts.length) return '';
    if (CITY_STATES.has(parts[0].toLowerCase())) return titleCase(parts[0].toLowerCase());
    const last = parts[parts.length - 1];
    if (isUS(last)) {
        if (parts.length < 2) return 'United States';
        return canonState(parts[parts.length - 2]) ?? parts[parts.length - 2];
    }
    return canonState(last) ?? canonCountry(last);
}

/** Short display for a place: "Prague, Czechia" or "Boston, MA". */
export function placeShort(p?: Place): string {
    const parts = segments(p);
    if (!parts.length) return '';
    const last = parts[parts.length - 1];
    if (parts.length >= 3 && isUS(last)) return `${parts[0]}, ${abbrevState(parts[parts.length - 2])}`;
    if (parts.length === 2 && canonState(last)) return `${parts[0]}, ${abbrevState(last)}`;
    if (parts.length > 1) return `${parts[0]}, ${canonCountry(last)}`;
    return parts[0];
}

export function abbrevState(s: string): string {
    const n = s.trim().toLowerCase().replace(/\.$/, '');
    if (STATE_BY_ABBR[n]) return n.toUpperCase();
    return STATE_ABBR[n] ?? s.trim();
}

export function hasCoords(p?: Place): p is Place & { lat: number; lng: number } {
    return !!p && typeof p.lat === 'number' && typeof p.lng === 'number' && !Number.isNaN(p.lat) && !Number.isNaN(p.lng);
}

export function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b || a === null || b === null) return false;
    if (typeof a !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a as object).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
    const kb = Object.keys(b as object).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

export function clone<T>(v: T): T {
    return JSON.parse(JSON.stringify(v)) as T;
}

/** Fields worth listing in the changelog when they differ. */
export function changedFields(a: Member, b: Member): string[] {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof Member>;
    const out: string[] = [];
    for (const k of keys) {
        if (k === 'updatedAt' || k === 'updatedBy') continue;
        if (!deepEqual(a[k], b[k])) out.push(k);
    }
    return out;
}

export function formatPhone(p?: string): string {
    if (!p) return '';
    const d = p.replace(/\D/g, '');
    if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    if (d.length === 11 && d[0] === '1') return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
    return p.trim();
}

function parseBirthday(b?: string): { m: number; d: number } | null {
    const match = b?.match(/^(?:\d{4})?-?-?(\d{2})-(\d{2})$/);
    return match ? { m: Number(match[1]), d: Number(match[2]) } : null;
}

/** "Oct 27" from "2005-10-27". */
export function birthdayLabel(b?: string): string {
    const p = parseBirthday(b);
    if (!p) return b ?? '';
    return new Date(2000, p.m - 1, p.d).toLocaleString('en-US', { month: 'short', day: 'numeric' });
}

/** Days until the next occurrence of a birthday; 0 means today. */
export function daysUntilBirthday(b?: string, now: Date = new Date()): number | null {
    const p = parseBirthday(b);
    if (!p) return null;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let next = new Date(today.getFullYear(), p.m - 1, p.d);
    if (next < today) next = new Date(today.getFullYear() + 1, p.m - 1, p.d);
    return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}
