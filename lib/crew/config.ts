/**
 * Base URL of the deployed Cloudflare Worker (see worker/README.md).
 *
 * Set NEXT_PUBLIC_CREW_API_URL at build time (the Pages workflow reads the
 * CREW_API_URL repository variable). While empty, the manifest reads the
 * dev-only local copy and edits are kept as a local draft in this browser.
 *
 * For local testing you can also drop a URL into localStorage under
 * "crew:api" without rebuilding.
 */
export const CREW_API_URL = (process.env.NEXT_PUBLIC_CREW_API_URL ?? '').replace(/\/$/, '');

/**
 * Dev-only copy of the vault, staged into public/ by `npm run dev`. It is
 * gitignored, so production never serves ciphertext; the worker is the only
 * read path there.
 */
export const STATIC_VAULT_URL = '/crew.enc.json';

export const STORAGE = {
    key: 'crew:key',
    gate: 'crew:gate',
    editor: 'crew:editor',
    view: 'crew:view',
    draft: 'crew:draft',
    api: 'crew:api',
} as const;

export function resolveApiUrl(): string {
    if (typeof window !== 'undefined') {
        const override = window.localStorage.getItem(STORAGE.api);
        if (override) return override.replace(/\/$/, '');
    }
    return CREW_API_URL;
}
