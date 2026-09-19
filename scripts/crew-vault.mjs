#!/usr/bin/env node
// Maintenance CLI for the encrypted crew manifest.
//
//   node scripts/crew-vault.mjs encrypt --pass "..." [--pass "..."] [--in data/crew.seed.json] [--out data/crew.enc.json] [--rekey]
//   node scripts/crew-vault.mjs decrypt --pass "..." [--in data/crew.enc.json] [--out data/crew.seed.json]
//   node scripts/crew-vault.mjs gate-tokens --pass "..." [--pass "..."]
//   node scripts/crew-vault.mjs stage        # copy data/crew.enc.json -> public/ for local dev (runs on `npm run dev`)
//   node scripts/crew-vault.mjs push --api https://armada-crew.<acct>.workers.dev --pass "..." [--force] [--admin <token>]
//                                            # upload data/crew.enc.json to the worker (seeding, or restoring a backup)
//   node scripts/crew-vault.mjs pull --api https://... --pass "..." [--out data/crew.enc.json]
//                                            # download the worker's current vault (backup; commit it if you like)
//   node scripts/crew-vault.mjs versions --api https://... --pass "..."
//                                            # list the worker's kept versions (newest first)
//   node scripts/crew-vault.mjs restore --api https://... --pass "..." --sha <version>
//                                            # re-publish an old version (the replaced one is kept too)
//   node scripts/crew-vault.mjs forget --api https://... --pass "..." (--sha a,b,c | --since <version> | --all)
//                                            # permanently drop archived versions (--since: that version and everything newer)
//
// `encrypt` keeps the existing data key when the vault already exists and a
// --pass opens it, so browsers that are unlocked stay unlocked. Pass --rekey to
// force a fresh key (e.g. when the passphrase changes).
//
// Pass every accepted spelling of the passphrase with repeated --pass flags.
// Passphrases can also come from CREW_PASSPHRASES (comma-separated).
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import {
    createVault,
    gateToken,
    open,
    reseal,
    unlock,
    wrapDataKey,
} from '../lib/crew/vault.mjs';

const [, , cmd, ...rest] = process.argv;

function parseArgs(argv) {
    const out = { pass: [] };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (!a.startsWith('--')) continue;
        const key = a.slice(2);
        const val = argv[i + 1];
        if (val === undefined || val.startsWith('--')) out[key] = true;
        else if (key === 'pass') out.pass.push(val), i++;
        else out[key] = val, i++;
    }
    const env = process.env.CREW_PASSPHRASES;
    if (env) out.pass.push(...env.split(',').map((s) => s.trim()).filter(Boolean));
    return out;
}

const args = parseArgs(rest);
const IN_PLAIN = args.in ?? 'data/crew.seed.json';
const IN_ENC = args.in ?? 'data/crew.enc.json';
const ENC_DEFAULT = 'data/crew.enc.json';
const STAGED = 'public/crew.enc.json';

async function main() {
    switch (cmd) {
        case 'encrypt': {
            if (!args.pass.length) fail('pass at least one --pass');
            const payload = JSON.parse(await readFile(IN_PLAIN, 'utf8'));
            payload.updatedAt ??= new Date().toISOString();
            const out = args.out ?? ENC_DEFAULT;
            let vault = null;
            if (!args.rekey) {
                let existing = null;
                try {
                    existing = JSON.parse(await readFile(out, 'utf8'));
                } catch {}
                if (existing) {
                    let key = null;
                    for (const pass of args.pass) key ??= await unlock(existing, pass);
                    if (key) {
                        let added = 0;
                        for (const pass of args.pass) {
                            if (!(await unlock(existing, pass))) {
                                existing.keys.push(await wrapDataKey(key, pass));
                                added++;
                            }
                        }
                        if (added) console.log(`added ${added} keyhole${added === 1 ? '' : 's'}`);
                        vault = await reseal(existing, key, payload);
                    }
                }
            }
            const kept = !!vault;
            vault ??= await createVault(args.pass, payload);
            await writeFile(out, JSON.stringify(vault) + '\n');
            console.log(
                `sealed ${payload.members?.length ?? 0} members into ${out} (${vault.keys.length} keyhole${vault.keys.length === 1 ? '' : 's'}, ${kept ? 'kept existing data key' : 'new data key'})`,
            );
            break;
        }
        case 'decrypt': {
            if (!args.pass.length) fail('pass one --pass');
            const vault = JSON.parse(await readFile(IN_ENC, 'utf8'));
            const key = await unlock(vault, args.pass[0]);
            if (!key) fail('that passphrase does not open this vault');
            const payload = await open(key, vault);
            const text = JSON.stringify(payload, null, 2) + '\n';
            if (args.out) {
                await writeFile(args.out, text);
                console.log(`wrote ${args.out}`);
            } else {
                process.stdout.write(text);
            }
            break;
        }
        case 'gate-tokens': {
            if (!args.pass.length) fail('pass at least one --pass');
            const tokens = await Promise.all(args.pass.map(gateToken));
            console.log(tokens.join(','));
            break;
        }
        case 'push': {
            const api = requireApi();
            const token = args.admin ?? (await gateToken(requirePass()));
            const vault = JSON.parse(await readFile(IN_ENC, 'utf8'));
            const current = await apiGet(api, token);
            if (current && !args.force) {
                fail(`the worker already holds a vault (${current.sha}). Run "pull" to back it up first, then push --force to overwrite.`);
            }
            const res = await fetch(`${api}/vault`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ sha: current?.sha ?? null, vault, message: `crew-vault push from ${IN_ENC}` }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) fail(`push failed (${res.status}): ${body.error ?? ''}${res.status === 403 ? ' — pass --admin <CREW_ADMIN_TOKEN> to change the vault keys' : ''}`);
            console.log(`pushed ${IN_ENC} to ${api} (version ${body.sha})`);
            break;
        }
        case 'pull': {
            const api = requireApi();
            const token = args.admin ?? (await gateToken(requirePass()));
            const current = await apiGet(api, token);
            if (!current) fail('the worker holds no vault yet');
            const out = args.out ?? ENC_DEFAULT;
            await writeFile(out, JSON.stringify(current.vault) + '\n');
            console.log(`pulled version ${current.sha} into ${out}`);
            break;
        }
        case 'versions': {
            const api = requireApi();
            const token = args.admin ?? (await gateToken(requirePass()));
            const res = await fetch(`${api}/vault/history`, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) fail(`worker returned ${res.status}`);
            const { current, versions } = await res.json();
            console.log(`current: ${current}`);
            for (const v of versions) console.log(`${v.sha}  ${v.at.replace('T', ' ').slice(0, 19)}  ${v.message}`);
            if (!versions.length) console.log('(no earlier versions)');
            break;
        }
        case 'restore': {
            const api = requireApi();
            if (!args.sha) fail('pass --sha <version> (see "versions")');
            const token = args.admin ?? (await gateToken(requirePass()));
            const res = await fetch(`${api}/vault/restore`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ sha: args.sha }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) fail(`restore failed (${res.status}): ${body.error ?? ''}`);
            console.log(`restored ${args.sha}; now at version ${body.sha}`);
            break;
        }
        case 'forget': {
            const api = requireApi();
            const token = args.admin ?? (await gateToken(requirePass()));
            let body;
            if (args.all === true) body = { all: true };
            else if (args.sha) body = { shas: String(args.sha).split(',').map((s) => s.trim()).filter(Boolean) };
            else if (args.since) {
                const res = await fetch(`${api}/vault/history`, { headers: { Authorization: `Bearer ${token}` } });
                if (!res.ok) fail(`worker returned ${res.status}`);
                const { versions } = await res.json(); // newest first
                const i = versions.findIndex((v) => v.sha === args.since);
                if (i === -1) fail(`version ${args.since} is not in the history`);
                body = { shas: versions.slice(0, i + 1).map((v) => v.sha) };
            } else fail('pass --sha a,b,c, --since <version>, or --all');
            const res = await fetch(`${api}/vault/forget`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const out = await res.json().catch(() => ({}));
            if (!res.ok) fail(`forget failed (${res.status}): ${out.error ?? ''}`);
            console.log(`forgot ${out.removed} archived version${out.removed === 1 ? '' : 's'}`);
            break;
        }
        case 'stage': {
            try {
                await copyFile(ENC_DEFAULT, STAGED);
                console.log(`staged ${ENC_DEFAULT} -> ${STAGED} for local dev`);
            } catch {
                console.log(`no ${ENC_DEFAULT} to stage; /crew will need the sync worker`);
            }
            break;
        }
        default:
            fail('usage: crew-vault.mjs <encrypt|decrypt|gate-tokens|stage|push|pull|versions|restore|forget> [--pass ...]');
    }
}

function requireApi() {
    const api = (args.api ?? process.env.CREW_API_URL ?? '').replace(/\/$/, '');
    if (!api) fail('pass --api <worker url> (or set CREW_API_URL)');
    return api;
}

function requirePass() {
    if (!args.pass.length) fail('pass one --pass (or --admin <token>)');
    return args.pass[0];
}

async function apiGet(api, token) {
    const res = await fetch(`${api}/vault`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 404) return null;
    if (res.status === 401) fail('the worker rejected that passphrase (is CREW_GATE_TOKENS set for this spelling?)');
    if (!res.ok) fail(`worker returned ${res.status}`);
    return res.json();
}

function fail(msg) {
    console.error(msg);
    process.exit(1);
}

main().catch((e) => fail(e.message));
