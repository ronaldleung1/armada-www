// Envelope encryption for the crew manifest. Runs unchanged in the browser
// (WebCrypto) and in Node >= 20 (globalThis.crypto).
//
// Layout of a vault file:
//   { v: 1,
//     keys: [{ iv, k }, ...],   // the random data key, AES-GCM-wrapped under a
//                                // PBKDF2 key derived from each accepted passphrase
//     iv, ct }                   // AES-GCM(dataKey, JSON payload)
//
// Any accepted spelling of the passphrase unlocks the same data key, so the
// payload is encrypted exactly once and re-encrypting on save never touches
// the wrapped keys.

const subtle = globalThis.crypto.subtle;
const te = new TextEncoder();
const td = new TextDecoder();

export const VAULT_VERSION = 1;
const KDF_SALT = 'armada-crew-vault-v1';
const KDF_ITERATIONS = 150_000;
const GATE_PREFIX = 'armada-crew-gate|';

/** Lower-case, strip accents and everything that isn't a letter or digit. */
export function normalizePass(input) {
    return String(input)
        .normalize('NFKD')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function randomBytes(n) {
    const b = new Uint8Array(n);
    globalThis.crypto.getRandomValues(b);
    return b;
}

export function toB64(bytes) {
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) {
        s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    }
    return btoa(s);
}

export function fromB64(s) {
    const bin = atob(s);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
}

async function deriveKek(pass) {
    const base = await subtle.importKey(
        'raw',
        te.encode(normalizePass(pass)),
        'PBKDF2',
        false,
        ['deriveKey'],
    );
    return subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: te.encode(KDF_SALT),
            iterations: KDF_ITERATIONS,
            hash: 'SHA-256',
        },
        base,
        { name: 'AES-GCM', length: 256 },
        false,
        ['wrapKey', 'unwrapKey'],
    );
}

/** Encrypt a payload under a data key. */
export async function seal(dataKey, payload) {
    const iv = randomBytes(12);
    const ct = await subtle.encrypt(
        { name: 'AES-GCM', iv },
        dataKey,
        te.encode(JSON.stringify(payload)),
    );
    return { iv: toB64(iv), ct: toB64(ct) };
}

/** Decrypt a vault's payload with a data key. Throws on a bad key. */
export async function open(dataKey, vault) {
    const pt = await subtle.decrypt(
        { name: 'AES-GCM', iv: fromB64(vault.iv) },
        dataKey,
        fromB64(vault.ct),
    );
    return JSON.parse(td.decode(pt));
}

/** Build a brand-new vault that opens with any of `passes`. */
export async function createVault(passes, payload) {
    if (!passes.length) throw new Error('need at least one passphrase');
    const dataKey = await subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt'],
    );
    const keys = [];
    for (const pass of passes) keys.push(await wrapDataKey(dataKey, pass));
    return { v: VAULT_VERSION, keys, ...(await seal(dataKey, payload)) };
}

/** Wrap the data key under a passphrase: one more keyhole for the vault. */
export async function wrapDataKey(dataKey, pass) {
    const kek = await deriveKek(pass);
    const iv = randomBytes(12);
    const wrapped = await subtle.wrapKey('raw', dataKey, kek, { name: 'AES-GCM', iv });
    return { iv: toB64(iv), k: toB64(wrapped) };
}

/**
 * Try to recover the data key with a passphrase.
 * Resolves to a CryptoKey, or null when nothing unwraps.
 */
export async function unlock(vault, pass) {
    const kek = await deriveKek(pass);
    for (const entry of vault.keys ?? []) {
        try {
            return await subtle.unwrapKey(
                'raw',
                fromB64(entry.k),
                kek,
                { name: 'AES-GCM', iv: fromB64(entry.iv) },
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt'],
            );
        } catch {
            // wrong keyhole, try the next one
        }
    }
    return null;
}

/** Re-encrypt a payload into an existing vault, keeping its wrapped keys. */
export async function reseal(vault, dataKey, payload) {
    return { v: VAULT_VERSION, keys: vault.keys, ...(await seal(dataKey, payload)) };
}

export async function exportDataKey(dataKey) {
    return toB64(await subtle.exportKey('raw', dataKey));
}

export async function importDataKey(b64) {
    return subtle.importKey('raw', fromB64(b64), { name: 'AES-GCM' }, true, [
        'encrypt',
        'decrypt',
    ]);
}

/**
 * Bearer token the worker checks before accepting a write. Derived from the
 * passphrase with a different prefix than the KDF so the two never collide.
 */
export async function gateToken(pass) {
    const digest = await subtle.digest(
        'SHA-256',
        te.encode(GATE_PREFIX + normalizePass(pass)),
    );
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}
