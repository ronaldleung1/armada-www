import { STATIC_VAULT_URL, STORAGE, resolveApiUrl } from './config';
import type { LogEntry, Member, Payload, SyncSource, VaultFile } from './types';
import { clone, deepEqual, tombstone } from './util';
import {
    exportDataKey,
    gateToken,
    importDataKey,
    open,
    reseal,
    unlock,
} from './vault.mjs';

export type SyncState = {
    source: SyncSource;
    apiConfigured: boolean;
    saving: boolean;
    savedAt?: string;
    error?: string;
    /** True when the browser holds edits that never reached the API. */
    localDraft: boolean;
};

type Fetched = { vault: VaultFile; sha: string | null; source: SyncSource };


export class UnauthorizedError extends Error {}
/** The worker could not be reached; the edit was kept as a local draft. */
export class OfflineError extends Error {}

/**
 * Client-side owner of the encrypted manifest. Talks to the worker when one
 * is configured, otherwise falls back to the static blob shipped with the site.
 */
export class CrewStore {
    private key: CryptoKey | null = null;
    private gate: string | null = null;
    private vault: VaultFile | null = null;
    private sha: string | null = null;
    /** Snapshot of the last payload known to be on the server, for merging. */
    private base: Payload | null = null;
    readonly apiUrl: string;

    constructor() {
        this.apiUrl = resolveApiUrl();
    }

    get apiConfigured(): boolean {
        return this.apiUrl.length > 0;
    }

    /** Pick up a key persisted by an earlier unlock. */
    async restore(): Promise<boolean> {
        const k = localStorage.getItem(STORAGE.key);
        const g = localStorage.getItem(STORAGE.gate);
        if (!k) return false;
        try {
            this.key = await importDataKey(k);
            this.gate = g;
            return true;
        } catch {
            this.forget();
            return false;
        }
    }

    forget(): void {
        this.key = null;
        this.gate = null;
        localStorage.removeItem(STORAGE.key);
        localStorage.removeItem(STORAGE.gate);
    }

    private async fetchStatic(): Promise<Fetched> {
        const res = await fetch(STATIC_VAULT_URL, { cache: 'no-store' });
        if (!res.ok) throw new Error('No sync worker is configured and no local vault copy was found. Deploy worker/ and set CREW_API_URL, or run `npm run dev` locally.');
        return { vault: (await res.json()) as VaultFile, sha: null, source: 'static' };
    }

    private async fetchApi(): Promise<Fetched | null> {
        const res = await fetch(`${this.apiUrl}/vault`, {
            headers: { Authorization: `Bearer ${this.gate}` },
            cache: 'no-store',
        });
        if (res.status === 401) throw new UnauthorizedError('gate rejected');
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`api ${res.status}`);
        const body = (await res.json()) as { sha: string; vault: VaultFile };
        return { vault: body.vault, sha: body.sha, source: 'api' };
    }

    private async fetchVault(): Promise<Fetched> {
        if (this.apiConfigured && this.gate) {
            try {
                const got = await this.fetchApi();
                if (got) return got;
                // The worker holds nothing yet. Locally, seed from the staged copy so the
                // first save creates it; in production, point at the CLI.
                try {
                    const seed = await this.fetchStatic();
                    return { ...seed, source: 'api', sha: null };
                } catch {
                    throw new Error('The sync worker has no vault yet. Seed it once with: node scripts/crew-vault.mjs push --api <worker url> --pass "…"');
                }
            } catch (e) {
                if (e instanceof UnauthorizedError) throw e;
                // network trouble: degrade to the static copy
            }
        }
        return this.fetchStatic();
    }

    /** Try a passphrase. Resolves true and persists the key on success. */
    async unlockWith(pass: string): Promise<boolean> {
        const gate = await gateToken(pass);
        const prevGate = this.gate;
        this.gate = gate;
        let fetched: Fetched;
        try {
            fetched = await this.fetchVault();
        } catch (e) {
            if (e instanceof UnauthorizedError) {
                this.gate = prevGate;
                return false;
            }
            throw e;
        }
        const key = await unlock(fetched.vault, pass);
        if (!key) {
            this.gate = prevGate;
            return false;
        }
        this.key = key;
        this.vault = fetched.vault;
        this.sha = fetched.sha;
        localStorage.setItem(STORAGE.key, await exportDataKey(key));
        localStorage.setItem(STORAGE.gate, gate);
        return true;
    }

    /**
     * Fetch and decrypt the latest payload. If a local draft is waiting and the
     * API is now reachable, merge it in and push it.
     */
    async load(): Promise<{ payload: Payload; source: SyncSource; sha: string | null }> {
        if (!this.key) throw new Error('locked');
        const fetched = await this.fetchVault();
        let payload: Payload;
        try {
            payload = (await open(this.key, fetched.vault)) as Payload;
        } catch {
            this.forget();
            throw new UnauthorizedError('stale key');
        }
        payload = normalizePayload(payload);
        this.vault = fetched.vault;
        this.sha = fetched.sha;
        this.base = clone(payload);

        const draft = this.readDraft();
        if (draft) {
            const merged = mergePayload(draft.base, draft.payload, payload);
            if (fetched.source === 'api') {
                const saved = await this.save(merged, 'crew: sync offline edits');
                this.clearDraft();
                return { payload: saved, source: 'api', sha: this.sha };
            }
            return { payload: merged, source: fetched.source, sha: null };
        }
        return { payload, source: fetched.source, sha: fetched.sha };
    }

    /**
     * Persist a payload. With an API: optimistic concurrency on the GitHub blob
     * sha, three-way merging and retrying on conflict. Without: local draft.
     */
    async save(next: Payload, message: string): Promise<Payload> {
        if (!this.key || !this.vault) throw new Error('locked');
        next = normalizePayload(next);
        if (!this.apiConfigured || !this.gate) {
            this.writeDraft(next);
            return next;
        }
        for (let attempt = 0; attempt < 4; attempt++) {
            const sealed = await reseal(this.vault, this.key, next);
            let res: Response;
            try {
                res = await fetch(`${this.apiUrl}/vault`, {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${this.gate}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ sha: this.sha, vault: sealed, message }),
                });
            } catch {
                this.writeDraft(next);
                throw new OfflineError('offline');
            }
            if (res.status === 401) throw new UnauthorizedError('gate rejected');
            if (res.ok) {
                const body = (await res.json()) as { sha: string };
                this.sha = body.sha;
                this.vault = sealed as VaultFile;
                this.base = clone(next);
                this.clearDraft();
                return next;
            }
            if (res.status === 409) {
                const body = (await res.json()) as { sha: string; vault: VaultFile };
                const theirs = normalizePayload((await open(this.key, body.vault)) as Payload);
                next = mergePayload(this.base ?? theirs, next, theirs);
                this.sha = body.sha;
                this.vault = body.vault;
                this.base = clone(theirs);
                continue;
            }
            if (res.status === 429) throw new Error('Too many edits from here right now. Wait a minute and try again.');
            if (res.status === 403) throw new Error('The worker refused to change the vault keys. Re-enter the passphrase.');
            const text = await res.text().catch(() => '');
            throw new Error(`save failed (${res.status}) ${text}`.trim());
        }
        throw new Error('too many concurrent edits, try again');
    }

    private readDraft(): { base: Payload; payload: Payload } | null {
        try {
            const raw = localStorage.getItem(STORAGE.draft);
            return raw ? (JSON.parse(raw) as { base: Payload; payload: Payload }) : null;
        } catch {
            return null;
        }
    }

    private writeDraft(payload: Payload): void {
        localStorage.setItem(STORAGE.draft, JSON.stringify({ base: this.base, payload }));
    }

    private clearDraft(): void {
        localStorage.removeItem(STORAGE.draft);
    }

    hasDraft(): boolean {
        return this.readDraft() !== null;
    }
}

export function normalizePayload(p: Payload): Payload {
    const forgotten = Array.from(new Set(p.forgotten ?? [])).sort();
    const gone = new Set(forgotten);
    const out: Payload = {
        members: (p.members ?? []).filter((m) => !gone.has(tombstone(m.id))).map(normalizeMember),
        log: (p.log ?? []).filter((e) => !gone.has(tombstone(e.memberId))).slice(0, 300),
        updatedAt: p.updatedAt ?? new Date().toISOString(),
    };
    if (forgotten.length) out.forgotten = forgotten;
    return out;
}

function normalizeMember(raw: Member): Member {
    // Older payloads split "ventures" from "projects"; fold them together.
    const { ventures, ...m } = raw as Member & { ventures?: Member['projects'] };
    const projects = [...(m.projects ?? [])];
    for (const v of ventures ?? []) {
        if (!projects.some((p) => p.name.trim().toLowerCase() === v.name.trim().toLowerCase())) projects.push(v);
    }
    return {
        ...m,
        majors: m.majors ?? [],
        minors: m.minors ?? [],
        projects,
        interests: m.interests ?? [],
        status: m.status ?? 'Active',
    };
}

/**
 * Field-level three-way merge. For each member, a field I changed wins over
 * the server; anything I left alone takes the server's value. Deletions only
 * stick when the other side didn't touch the record.
 */
export function mergePayload(base: Payload, mine: Payload, theirs: Payload): Payload {
    const byId = (p: Payload) => new Map(p.members.map((m) => [m.id, m]));
    const b = byId(base);
    const m = byId(mine);
    const t = byId(theirs);
    const ids = new Set([...m.keys(), ...t.keys()]);
    const members: Member[] = [];

    for (const id of ids) {
        const bm = b.get(id);
        const mm = m.get(id);
        const tm = t.get(id);
        if (mm && tm) {
            const out: Record<string, unknown> = { ...tm };
            const keys = new Set([...Object.keys(mm), ...Object.keys(tm), ...Object.keys(bm ?? {})]);
            let mineTouched = false;
            for (const k of keys) {
                const mv = (mm as Record<string, unknown>)[k];
                const bv = bm ? (bm as Record<string, unknown>)[k] : undefined;
                if (!deepEqual(mv, bv)) {
                    out[k] = mv;
                    if (k !== 'updatedAt' && k !== 'updatedBy') mineTouched = true;
                }
            }
            if (!mineTouched) {
                out.updatedAt = tm.updatedAt;
                out.updatedBy = tm.updatedBy;
            }
            members.push(out as Member);
        } else if (mm && !tm) {
            // Server no longer has it. Keep only if I added or edited it.
            if (!bm || !deepEqual(mm, bm)) members.push(mm);
        } else if (!mm && tm) {
            // I deleted it (or never had it). Keep if they added/edited it since base.
            if (!bm || !deepEqual(tm, bm)) members.push(tm);
        }
    }

    // Preserve "their" ordering where possible, then append mine.
    const order = new Map<string, number>();
    theirs.members.forEach((x, i) => order.set(x.id, i));
    mine.members.forEach((x, i) => {
        if (!order.has(x.id)) order.set(x.id, 1_000_000 + i);
    });
    members.sort((x, y) => (order.get(x.id) ?? 0) - (order.get(y.id) ?? 0));

    const logKey = (e: LogEntry) => `${e.at}|${e.by}|${e.memberId}|${e.action}`;
    const seen = new Set<string>();
    const log: LogEntry[] = [];
    for (const e of [...mine.log, ...theirs.log]) {
        const k = logKey(e);
        if (seen.has(k)) continue;
        seen.add(k);
        log.push(e);
    }
    log.sort((x, y) => y.at.localeCompare(x.at));

    // Tombstones from either side win over everything above.
    const forgotten = Array.from(new Set([...(base.forgotten ?? []), ...(mine.forgotten ?? []), ...(theirs.forgotten ?? [])])).sort();
    return normalizePayload({ members, log, updatedAt: new Date().toISOString(), forgotten });
}
