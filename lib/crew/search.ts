import type { Member } from './types';
import { fullName, hostOf, placeCountry, regionKey, standing, classLabel } from './util';

/**
 * Offline "semantic-ish" search: synonym expansion + stemming + fuzzy
 * matching over weighted fields. No models, no network, no cost.
 *
 * The first entry of each group is the canonical token. Multi-word phrases are
 * collapsed into that token before tokenising, so "machine learning" and "ml"
 * meet in the middle.
 */
export const SYNONYMS: string[][] = [
    ['cs', 'computer science', 'compsci', 'comp sci', 'swe', 'software', 'software engineering', 'programming', 'coding', 'developer', 'dev', 'engineer', 'engineering'],
    ['ml', 'machine learning', 'ai', 'artificial intelligence', 'deep learning', 'llm', 'llms', 'large language models', 'genai', 'generative ai', 'agentic ai', 'agents', 'voice agents', 'computer vision', 'nlp'],
    ['aisafety', 'ai safety', 'alignment', 'effective altruism', 'ea', 'metr'],
    ['hotel', 'hospitality', 'hotel management', 'hotel administration', 'hotelie', 'hotel school'],
    ['crypto', 'blockchain', 'solana', 'web3', 'on chain', 'onchain', 'defi', 'tokenized', 'altcoins', 'ethereum'],
    ['finance', 'fintech', 'quant', 'trading', 'prediction markets', 'markets', 'investing', 'vc', 'venture capital', 'ventures'],
    ['realestate', 'real estate', 'realty', 'housing', 'property'],
    ['startup', 'startups', 'founder', 'founders', 'yc', 'y combinator', 'company', 'business', 'entrepreneurship'],
    ['climate', 'climatetech', 'climate tech', 'clean tech', 'sustainability', 'climate change', 'energy'],
    ['agritech', 'agriculture', 'farming', 'gardening', 'agtech'],
    ['design', 'ui', 'ux', 'product design', 'graphic design', 'sticker design', 'figma'],
    ['web', 'web dev', 'web development', 'frontend', 'front end', 'full stack', 'fullstack', 'backend'],
    ['mobile', 'ios', 'app', 'apps', 'app development', 'mobile app development', 'swift', 'android'],
    ['security', 'cybersecurity', 'infosec', 'hacking'],
    ['policy', 'politics', 'government', 'pam', 'policy analysis and management', 'law'],
    ['music', 'musician', 'band', 'producer', 'guitar', 'piano'],
    ['fitness', 'exercise', 'gym', 'lifting', 'longevity', 'health', 'self improvement'],
    ['languages', 'linguistics', 'language learning', 'translation', 'localization', 'i18n', 'polyglot'],
    ['games', 'gaming', 'video games', 'board games', 'game dev', 'chess'],
    ['sports', 'basketball', 'tennis', 'soccer', 'football', 'hockey', 'golf', 'skiing', 'table tennis', 'bjj', 'biking', 'cycling', 'f1', 'running', 'climbing'],
    ['food', 'cooking', 'cook', 'chef', 'food & bev', 'restaurant', 'bistro', 'asian food', 'baking'],
    ['data', 'data science', 'analytics', 'geospatial', 'geospatial data science', 'gis', 'statistics', 'stats', 'geography'],
    ['math', 'mathematics', 'maths'],
    ['infosci', 'information science', 'info sci', 'is'],
    ['architecture', 'architect', 'arch', 'urban planning'],
    ['hardware', 'robotics', 'deeptech', 'deep tech', 'embedded', 'watches'],
    ['reading', 'books', 'literature', 'writing', 'history', 'philosophy'],
    ['travel', 'traveling', 'travelling'],
    ['psychology', 'perception psychology', 'cognitive science', 'neuroscience'],
    ['volunteering', 'nonprofit', 'non profit', 'social impact', 'samaritan'],
    ['cars', 'automotive', 'f1'],
    ['nature', 'outdoors', 'hiking', 'camping'],
    ['recruiting', 'hiring', 'jobs', 'careers'],
    ['freshman', 'freshmen', 'first year', 'frosh'],
    ['sophomore', 'sophomores', 'second year'],
    ['junior', 'juniors', 'third year'],
    ['senior', 'seniors', 'fourth year'],
    ['alum', 'alumni', 'alumnus', 'alumna', 'graduated', 'grad'],
    ['dropout', 'dropped out', 'dropouts', 'left', 'leave'],
    ['nyc', 'new york city', 'new york', 'manhattan', 'brooklyn', 'long island'],
    ['bayarea', 'bay area', 'sf', 'san francisco', 'silicon valley', 'palo alto', 'san jose'],
    ['la', 'los angeles', 'socal', 'southern california', 'irvine', 'orange county'],
    ['jersey', 'new jersey', 'nj'],
    ['usa', 'united states', 'us', 'america', 'american'],
    ['international', 'abroad', 'overseas'],
    ['ithaca', 'cornell', 'campus'],
];

const STOP = new Set([
    'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'from', 'with', 'who', 'whom',
    'that', 'which', 'is', 'are', 'was', 'were', 'be', 'do', 'does', 'did', 'like', 'likes', 'into',
    'people', 'person', 'members', 'member', 'anyone', 'someone', 'everyone', 'folks', 'guys',
    'find', 'show', 'me', 'my', 'i', 'we', 'you', 'our', 'their', 'them', 'they', 'it', 'its',
    'about', 'by', 'as', 'has', 'have', 'had', 'works', 'working', 'work', 'studying', 'studies',
    'study', 'building', 'builds', 'built', 'interested', 'majoring', 'major', 'majors',
]);

const phraseToCanon: [string, string][] = [];
const tokenToCanon = new Map<string, string>();
for (const group of SYNONYMS) {
    const canon = group[0];
    for (const term of group) {
        if (term.includes(' ') || term.includes('&')) phraseToCanon.push([term, canon]);
        else tokenToCanon.set(term, canon);
    }
}
phraseToCanon.sort((a, b) => b[0].length - a[0].length);

export function norm(s: string): string {
    return s
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/['’]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function stem(t: string): string {
    if (t.length > 4 && t.endsWith('ies')) return t.slice(0, -3) + 'y';
    if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1);
    return t;
}

function collapsePhrases(s: string): string {
    let out = ` ${s} `;
    for (const [phrase, canon] of phraseToCanon) {
        out = out.split(` ${phrase} `).join(` ${canon} `);
    }
    return out.trim();
}

/** Canonical token: synonym group head if known, else the stemmed token. */
export function canon(token: string): string {
    const t = norm(token);
    return tokenToCanon.get(t) ?? tokenToCanon.get(stem(t)) ?? stem(t);
}

export function tokenize(s: string, dropStop = true): string[] {
    return collapsePhrases(norm(s))
        .split(/[^a-z0-9]+/)
        .filter((t) => t && (!dropStop || !STOP.has(t)));
}

export function canonTokens(s: string): string[] {
    return tokenize(s, false).map(canon);
}

function editDistance(a: string, b: string, max: number): number {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    const prev = new Array(b.length + 1).fill(0).map((_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const cur = [i];
        let rowMin = i;
        for (let j = 1; j <= b.length; j++) {
            const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
            cur.push(v);
            rowMin = Math.min(rowMin, v);
        }
        if (rowMin > max) return max + 1;
        prev.splice(0, prev.length, ...cur);
    }
    return prev[b.length];
}

type Field = {
    key: string;
    label: string;
    weight: number;
    get: (m: Member, now: Date) => string[];
};

const FIELDS: Field[] = [
    { key: 'name', label: 'name', weight: 10, get: (m) => [fullName(m)] },
    { key: 'nickname', label: 'aka', weight: 8, get: (m) => (m.nickname ? [m.nickname] : []) },
    { key: 'role', label: 'role', weight: 3, get: (m) => (m.role ? [m.role] : []) },
    {
        key: 'year',
        label: 'year',
        weight: 5,
        get: (m, now) => {
            const out = [m.status, classLabel(m)];
            const s = standing(m, now);
            if (s) out.push(s);
            if (m.degree) out.push(m.degree);
            if (m.gradYear) out.push(String(m.gradYear), `'${String(m.gradYear).slice(-2)}`);
            return out;
        },
    },
    { key: 'majors', label: 'major', weight: 6, get: (m) => m.majors },
    { key: 'minors', label: 'minor', weight: 4, get: (m) => m.minors },
    { key: 'projects', label: 'project', weight: 7, get: (m) => m.projects.map((v) => v.name) },
    { key: 'company', label: 'works at', weight: 7, get: (m) => (m.company ? [m.company.name, ...(m.company.role ? [m.company.role] : [])] : []) },
    { key: 'interests', label: 'interest', weight: 5, get: (m) => m.interests },
    {
        key: 'hometown',
        label: 'from',
        weight: 4,
        get: (m) => (m.hometown?.name ? [m.hometown.name, regionKey(m.hometown), placeCountry(m.hometown)] : []),
    },
    {
        key: 'location',
        label: 'now in',
        weight: 4,
        get: (m) => (m.location?.name ? [m.location.name, regionKey(m.location), placeCountry(m.location)] : []),
    },
    {
        key: 'links',
        label: 'link',
        weight: 2,
        get: (m) => [m.website, m.linkedin, m.x, m.github, m.company?.url, ...m.projects.map((v) => v.url)].filter(Boolean).map((u) => hostOf(u!)),
    },
    { key: 'email', label: 'email', weight: 3, get: (m) => (m.email ? [m.email, m.email.split('@')[0]] : []) },
    { key: 'bio', label: 'bio', weight: 2, get: (m) => (m.bio ? [m.bio] : []) },
];

export type Hit = {
    member: Member;
    score: number;
    /** Human-readable reasons, e.g. "interest: Machine learning". */
    why: string[];
    /** Field keys that matched, for highlighting. */
    fields: Set<string>;
};

type Indexed = {
    member: Member;
    docs: { field: Field; value: string; tokens: string[]; canon: string[]; text: string }[];
};

function index(members: Member[], now: Date): Indexed[] {
    return members.map((member) => ({
        member,
        docs: FIELDS.flatMap((field) =>
            field.get(member, now).filter(Boolean).map((value) => ({
                field,
                value,
                tokens: tokenize(value, false).map(stem),
                canon: canonTokens(value),
                text: norm(value),
            })),
        ),
    }));
}

function matchTerm(term: string, termCanon: string, doc: Indexed['docs'][number]): number {
    if (doc.tokens.includes(term)) return 1;
    if (doc.text.includes(term) && term.length >= 3) return 0.9;
    if (doc.canon.includes(termCanon)) return 0.85;
    if (term.length >= 3 && doc.tokens.some((t) => t.startsWith(term))) return 0.8;
    const maxEd = term.length >= 8 ? 2 : term.length >= 5 ? 1 : 0;
    if (maxEd && doc.tokens.some((t) => t.length >= 4 && editDistance(term, t, maxEd) <= maxEd)) return 0.55;
    return 0;
}

/**
 * Rank members for a free-text query. Every meaningful query term must land
 * somewhere (AND semantics); synonyms and typos are forgiven.
 */
export function search(members: Member[], query: string, now: Date = new Date()): Hit[] {
    const terms = tokenize(query).map(stem);
    if (!terms.length) {
        return members.map((member) => ({ member, score: 0, why: [], fields: new Set() }));
    }
    const termCanons = terms.map(canon);
    const hits: Hit[] = [];
    for (const item of index(members, now)) {
        let total = 0;
        const why: string[] = [];
        const fields = new Set<string>();
        let allMatched = true;
        for (let i = 0; i < terms.length; i++) {
            let best = 0;
            let bestDoc: Indexed['docs'][number] | null = null;
            for (const doc of item.docs) {
                const s = matchTerm(terms[i], termCanons[i], doc) * doc.field.weight;
                if (s > best) {
                    best = s;
                    bestDoc = doc;
                }
            }
            if (!bestDoc) {
                allMatched = false;
                break;
            }
            total += best;
            fields.add(bestDoc.field.key);
            const reason = `${bestDoc.field.label}: ${bestDoc.value}`;
            if (!why.includes(reason)) why.push(reason);
        }
        if (allMatched) hits.push({ member: item.member, score: total, why, fields });
    }
    hits.sort((a, b) => b.score - a.score || fullName(a.member).localeCompare(fullName(b.member)));
    return hits;
}
