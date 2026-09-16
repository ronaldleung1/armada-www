/**
 * Base URL of the deployed Cloudflare Worker (see worker/README.md).
 *
 * The deployed worker URL is baked in below; NEXT_PUBLIC_CREW_API_URL (from
 * the CREW_API_URL repository variable) overrides it at build time. Set it to
 * "off" to run without a worker: the manifest then reads the dev-only local
 * copy and edits are kept as a local draft in this browser.
 *
 * For local testing you can also drop a URL into localStorage under
 * "crew:api" without rebuilding.
 */
/** Deployed worker (free Cloudflare account). Public URL, not a secret; override with the env var. */
const DEFAULT_CREW_API_URL = 'https://armada-crew.armada-crew-worker.workers.dev';

export const CREW_API_URL = (process.env.NEXT_PUBLIC_CREW_API_URL || DEFAULT_CREW_API_URL).replace(/\/$/, '');

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
        if (override) return override === 'off' ? '' : override.replace(/\/$/, '');
    }
    return CREW_API_URL === 'off' ? '' : CREW_API_URL;
}
