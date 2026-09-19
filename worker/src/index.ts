/**
 * armada-crew: the pen for the encrypted crew manifest.
 *
 * A small Cloudflare Worker that stores one encrypted file and lets the static
 * site read and write it. It never sees plaintext: the browser encrypts before
 * sending, and this worker only checks a bearer token derived from the club
 * passphrase before touching storage.
 *
 * Storage is a Durable Object (free plan, SQLite-backed, strongly consistent)
 * that also keeps the last MAX_HISTORY versions so any edit can be undone.
 * A GitHub-backed store is available as an alternative (see wrangler.toml).
 *
 *   GET  /vault            -> { sha, vault }                 404 { error: "empty" } if nothing is stored
 *   PUT  /vault            <- { sha, vault, message }        -> { sha }
 *                                                            409 { error: "conflict", sha, vault } on a stale sha
 *   GET  /vault/history    -> { current, versions: [{ sha, at, message, bytes }] }
 *   POST /vault/restore    <- { sha }                        -> { sha }   (re-publishes an old version)
 *   POST /vault/forget     <- { shas: [...] } | { all: true } -> { removed } (drops archived versions for good)
 *   GET  /                 -> { ok: true }                   (unauthenticated health check)
 *
 * Guard rails:
 *   - body size checked from Content-Length before reading, and again after
 *   - per-IP and global rate limits, with a separate tighter limit on failed auth
 *   - the wrapped keys of the stored vault are immutable through the API unless
 *     the request carries CREW_ADMIN_TOKEN, so a leaked passphrase cannot re-key
 *     the vault and lock everyone out
 */

export interface Env {
    /** Comma-separated output of `node scripts/crew-vault.mjs gate-tokens --pass ...`. */
    CREW_GATE_TOKENS: string;
    /** Optional. Lets `crew-vault.mjs push --admin` replace the vault keys (passphrase rotation). */
    CREW_ADMIN_TOKEN?: string;
    /** Comma-separated origins, or "*". */
    ALLOWED_ORIGINS?: string;
    /** Optional Cloudflare rate-limit binding; the in-memory limiter is used when absent. */
    RATE_LIMITER?: { limit(opts: { key: string }): Promise<{ success: boolean }> };
    /** Default storage: the VaultStore Durable Object. */
    VAULT_DO?: DurableObjectNamespace;
    /** Alternative storage, used only when VAULT_DO is not bound. */
    GITHUB_TOKEN?: string;
    GITHUB_REPO?: string;
    GITHUB_BRANCH?: string;
    VAULT_PATH?: string;
}

/* Minimal Durable Object typings so this file needs no extra packages. */
interface DurableObjectNamespace {
    idFromName(name: string): unknown;
    get(id: unknown): { fetch(input: string | Request, init?: RequestInit): Promise<Response> };
}
interface DurableObjectStorage {
    get<T>(key: string): Promise<T | undefined>;
    put<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<boolean>;
}
export interface DurableObjectState {
    storage: DurableObjectStorage;
}

type Vault = { v: number; keys: { iv: string; k: string }[]; iv: string; ct: string };
type Current = { sha: string; vault: Vault; at: string; message: string };
type Version = { sha: string; at: string; message: string; bytes: number };

const MAX_BODY_BYTES = 1_000_000; // the whole club fits in ~40 KB
const MAX_KEYHOLES = 8;
const MAX_MESSAGE = 120;
const MAX_HISTORY = 60;

/** Best-effort limits per Cloudflare location. Cheap insurance, not a firewall. */
const LIMITS = {
    perIp: { limit: 60, periodMs: 60_000 },
    perIpWrite: { limit: 10, periodMs: 60_000 },
    perIpAuthFail: { limit: 8, periodMs: 60_000 },
    globalWrite: { limit: 60, periodMs: 60_000 },
};

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const origin = request.headers.get('Origin') ?? '';
        const headers = corsHeaders(origin, env);
        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

        const url = new URL(request.url);
        if (url.pathname === '/' || url.pathname === '') return json({ ok: true, service: 'armada-crew' }, 200, headers);
        if (!url.pathname.startsWith('/vault')) return json({ error: 'not found' }, 404, headers);

        const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
        if (!(await allow(env, `ip:${ip}`, LIMITS.perIp))) return tooMany(headers);
        if (!limiter.check(`authfail:${ip}`, LIMITS.perIpAuthFail)) return tooMany(headers);

        const auth = authorize(request, env);
        if (!auth.ok) {
            limiter.hit(`authfail:${ip}`);
            return json({ error: 'unauthorized' }, 401, headers);
        }

        const store = storeFor(env);
        if (!store) return json({ error: 'no storage bound' }, 500, headers);

        try {
            if (url.pathname === '/vault' && request.method === 'GET') {
                const current = await store.get();
                return current ? json({ sha: current.sha, vault: current.vault }, 200, headers) : json({ error: 'empty' }, 404, headers);
            }

            if (url.pathname === '/vault/history' && request.method === 'GET') {
                const [current, versions] = await Promise.all([store.get(), store.history()]);
                return json({ current: current?.sha ?? null, versions }, 200, headers);
            }

            if (url.pathname === '/vault/forget' && request.method === 'POST') {
                if (!limiter.hit(`write:${ip}`, LIMITS.perIpWrite)) return tooMany(headers);
                const body = await readJson(request);
                if ('error' in body) return json({ error: body.error }, body.status, headers);
                const { shas, all } = body.value as { shas?: unknown; all?: unknown };
                const list = Array.isArray(shas) ? shas.filter((x): x is string => typeof x === 'string') : [];
                if (!list.length && all !== true) return json({ error: 'pass shas or all: true' }, 400, headers);
                const result = await store.forget(all === true ? 'all' : list);
                return json(result, 200, headers);
            }

            if ((url.pathname === '/vault' && request.method === 'PUT') || (url.pathname === '/vault/restore' && request.method === 'POST')) {
                if (!limiter.hit(`write:${ip}`, LIMITS.perIpWrite) || !limiter.hit('write:*', LIMITS.globalWrite)) return tooMany(headers);
                const body = await readJson(request);
                if ('error' in body) return json({ error: body.error }, body.status, headers);

                if (url.pathname === '/vault/restore') {
                    const sha = (body.value as { sha?: unknown }).sha;
                    if (typeof sha !== 'string') return json({ error: 'sha required' }, 400, headers);
                    const result = await store.restore(sha);
                    return result.ok ? json({ sha: result.sha }, 200, headers) : json({ error: result.detail }, 404, headers);
                }

                const put = body.value as { sha?: string | null; vault?: unknown; message?: string };
                if (!isVault(put.vault)) return json({ error: 'bad vault' }, 400, headers);
                const current = await store.get();
                if (current && !auth.admin && !sameKeys(current.vault, put.vault)) {
                    return json({ error: 'keys are immutable through the api' }, 403, headers);
                }
                const result = await store.put(put.vault, put.sha ?? null, sanitizeMessage(put.message));
                if (result.ok) return json({ sha: result.sha }, 200, headers);
                if (result.conflict) {
                    const latest = result.current ?? (await store.get());
                    return json({ error: 'conflict', sha: latest?.sha ?? null, vault: latest?.vault ?? null }, 409, headers);
                }
                return json({ error: 'storage', detail: result.detail.slice(0, 300) }, 502, headers);
            }

            return json({ error: 'method not allowed' }, 405, headers);
        } catch (e) {
            return json({ error: 'worker', detail: String((e as Error).message).slice(0, 300) }, 500, headers);
        }
    },
};

/* --------------------------------------------------------- durable object */

/** One instance holds the whole manifest plus its recent versions. */
export class VaultStore {
    private state: DurableObjectState;

    constructor(state: DurableObjectState) {
        this.state = state;
    }

    async fetch(request: Request): Promise<Response> {
        const s = this.state.storage;
        const path = new URL(request.url).pathname;
        const current = (await s.get<Current>('current')) ?? null;

        if (path === '/get') return Response.json(current);
        if (path === '/history') return Response.json((await s.get<Version[]>('index')) ?? []);

        if (path === '/put') {
            const { vault, sha, message } = (await request.json()) as { vault: Vault; sha: string | null; message: string };
            if ((current?.sha ?? null) !== (sha ?? null)) return Response.json({ conflict: true, current }, { status: 409 });
            const next: Current = { sha: newSha(), vault, at: new Date().toISOString(), message };
            await this.archive(current);
            await s.put('current', next);
            return Response.json({ sha: next.sha });
        }

        if (path === '/forget') {
            const { shas } = (await request.json()) as { shas: string[] | 'all' };
            const index = (await s.get<Version[]>('index')) ?? [];
            const drop = shas === 'all' ? new Set(index.map((v) => v.sha)) : new Set(shas);
            let removed = 0;
            for (const v of index) {
                if (drop.has(v.sha)) {
                    await s.delete(`hist:${v.sha}`);
                    removed++;
                }
            }
            await s.put('index', index.filter((v) => !drop.has(v.sha)));
            return Response.json({ removed });
        }

        if (path === '/restore') {
            const { sha } = (await request.json()) as { sha: string };
            const old = await s.get<Current>(`hist:${sha}`);
            if (!old) return Response.json({ error: 'unknown version' }, { status: 404 });
            const next: Current = { sha: newSha(), vault: old.vault, at: new Date().toISOString(), message: `restored ${old.at.slice(0, 16)} (${old.message})`.slice(0, MAX_MESSAGE) };
            await this.archive(current);
            await s.put('current', next);
            return Response.json({ sha: next.sha });
        }

        return new Response('not found', { status: 404 });
    }

    private async archive(prev: Current | null): Promise<void> {
        if (!prev) return;
        const s = this.state.storage;
        await s.put(`hist:${prev.sha}`, prev);
        const index = (await s.get<Version[]>('index')) ?? [];
        index.unshift({ sha: prev.sha, at: prev.at, message: prev.message, bytes: JSON.stringify(prev.vault).length });
        while (index.length > MAX_HISTORY) {
            const dropped = index.pop()!;
            await s.delete(`hist:${dropped.sha}`);
        }
        await s.put('index', index);
    }
}

function newSha(): string {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

/* ---------------------------------------------------------------- stores */

type PutResult = { ok: true; sha: string } | { ok: false; conflict: true; current: Current | null } | { ok: false; conflict: false; detail: string };

interface Store {
    get(): Promise<Current | null>;
    put(vault: Vault, expectedSha: string | null, message: string): Promise<PutResult>;
    history(): Promise<Version[]>;
    restore(sha: string): Promise<{ ok: true; sha: string } | { ok: false; detail: string }>;
    forget(shas: string[] | 'all'): Promise<{ removed: number }>;
}

function storeFor(env: Env): Store | null {
    if (env.VAULT_DO) return durableStore(env.VAULT_DO);
    if (env.GITHUB_TOKEN && env.GITHUB_REPO) return githubStore(env);
    return null;
}

function durableStore(ns: DurableObjectNamespace): Store {
    const stub = ns.get(ns.idFromName('crew'));
    const call = (path: string, body?: unknown) =>
        stub.fetch(`https://vault${path}`, body === undefined ? undefined : { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
    return {
        async get() {
            return (await (await call('/get')).json()) as Current | null;
        },
        async put(vault, expectedSha, message) {
            const res = await call('/put', { vault, sha: expectedSha, message });
            if (res.status === 409) return { ok: false, conflict: true, current: ((await res.json()) as { current: Current | null }).current };
            if (!res.ok) return { ok: false, conflict: false, detail: await res.text() };
            return { ok: true, sha: ((await res.json()) as { sha: string }).sha };
        },
        async history() {
            return (await (await call('/history')).json()) as Version[];
        },
        async restore(sha) {
            const res = await call('/restore', { sha });
            if (!res.ok) return { ok: false, detail: 'unknown version' };
            return { ok: true, sha: ((await res.json()) as { sha: string }).sha };
        },
        async forget(shas) {
            return (await (await call('/forget', { shas })).json()) as { removed: number };
        },
    };
}

function githubStore(env: Env): Store {
    const branch = env.GITHUB_BRANCH || 'main';
    const path = (env.VAULT_PATH || 'data/crew.enc.json').replace(/^\/+/, '');
    const base = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`;
    const headers = {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'armada-crew-worker',
        'X-GitHub-Api-Version': '2022-11-28',
    };
    return {
        async get() {
            const res = await fetch(`${base}?ref=${encodeURIComponent(branch)}`, { headers });
            if (res.status === 404) return null;
            if (!res.ok) throw new Error(`github get ${res.status}`);
            const data = (await res.json()) as { sha: string; content: string };
            return { sha: data.sha, vault: JSON.parse(b64ToUtf8(data.content)) as Vault, at: '', message: '' };
        },
        async put(vault, sha, message) {
            const res = await fetch(base, {
                method: 'PUT',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    content: utf8ToB64(JSON.stringify(vault) + '\n'),
                    branch,
                    ...(sha ? { sha } : {}),
                    committer: { name: 'Armada Crew', email: 'crew@armada.build' },
                }),
            });
            if (res.ok) return { ok: true, sha: ((await res.json()) as { content: { sha: string } }).content.sha };
            // 409: sha does not match. 422: file exists but no sha was given.
            if (res.status === 409 || res.status === 422) return { ok: false, conflict: true, current: null };
            return { ok: false, conflict: false, detail: await res.text() };
        },
        async history() {
            return []; // git log is the history here
        },
        async restore() {
            return { ok: false, detail: 'restore with git when using the GitHub store' };
        },
        async forget() {
            return { removed: 0 }; // rewrite git history instead
        },
    };
}

/* ---------------------------------------------------------------- limits */

class Limiter {
    private buckets = new Map<string, number[]>();

    /** Record a hit; false when the key is over its limit. */
    hit(key: string, cfg: { limit: number; periodMs: number } = { limit: Infinity, periodMs: 60_000 }): boolean {
        const now = Date.now();
        const arr = (this.buckets.get(key) ?? []).filter((t) => now - t < cfg.periodMs);
        arr.push(now);
        this.buckets.set(key, arr);
        if (this.buckets.size > 5000) this.buckets.clear();
        return arr.length <= cfg.limit;
    }

    /** Peek without recording. */
    check(key: string, cfg: { limit: number; periodMs: number }): boolean {
        const now = Date.now();
        return (this.buckets.get(key) ?? []).filter((t) => now - t < cfg.periodMs).length < cfg.limit;
    }
}

const limiter = new Limiter();

async function allow(env: Env, key: string, cfg: { limit: number; periodMs: number }): Promise<boolean> {
    if (env.RATE_LIMITER) {
        try {
            return (await env.RATE_LIMITER.limit({ key })).success;
        } catch {
            // fall through to the in-memory limiter
        }
    }
    return limiter.hit(key, cfg);
}

function tooMany(headers: Record<string, string>): Response {
    return json({ error: 'too many requests' }, 429, { ...headers, 'Retry-After': '60' });
}

/* ------------------------------------------------------------------ auth */

function authorize(request: Request, env: Env): { ok: boolean; admin: boolean } {
    const bearer = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!bearer || bearer.length > 128) return { ok: false, admin: false };
    if (env.CREW_ADMIN_TOKEN && timingSafeEqual(env.CREW_ADMIN_TOKEN, bearer)) return { ok: true, admin: true };
    const allowed = (env.CREW_GATE_TOKENS ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    return { ok: allowed.some((t) => timingSafeEqual(t, bearer)), admin: false };
}

function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

/* ----------------------------------------------------------------- utils */

async function readJson(request: Request): Promise<{ value: unknown } | { error: string; status: number }> {
    const declared = Number(request.headers.get('Content-Length') ?? '0');
    if (declared > MAX_BODY_BYTES) return { error: 'too large', status: 413 };
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return { error: 'too large', status: 413 };
    try {
        return { value: JSON.parse(raw) };
    } catch {
        return { error: 'bad json', status: 400 };
    }
}

function isVault(v: unknown): v is Vault {
    if (!v || typeof v !== 'object') return false;
    const o = v as Record<string, unknown>;
    if (o.v !== 1 || typeof o.iv !== 'string' || typeof o.ct !== 'string') return false;
    if (!Array.isArray(o.keys) || o.keys.length === 0 || o.keys.length > MAX_KEYHOLES) return false;
    return o.keys.every((k) => k && typeof k === 'object' && typeof (k as Record<string, unknown>).iv === 'string' && typeof (k as Record<string, unknown>).k === 'string');
}

function sameKeys(a: Vault, b: Vault): boolean {
    return JSON.stringify(a.keys) === JSON.stringify(b.keys);
}

function sanitizeMessage(m?: string): string {
    const clean = (m ?? '').replace(/[\r\n]+/g, ' ').trim();
    return (clean || 'crew: update manifest').slice(0, MAX_MESSAGE);
}

function corsHeaders(origin: string, env: Env): Record<string, string> {
    const allowed = (env.ALLOWED_ORIGINS ?? '*')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const allow = allowed.includes('*') ? '*' : allowed.includes(origin) ? origin : allowed[0] ?? '';
    return {
        'Access-Control-Allow-Origin': allow,
        'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
    };
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
    });
}

function utf8ToB64(s: string): string {
    const bytes = new TextEncoder().encode(s);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin);
}

function b64ToUtf8(b64: string): string {
    const bin = atob(b64.replace(/\s+/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
}
