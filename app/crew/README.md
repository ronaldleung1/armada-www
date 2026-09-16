# Crew manifest (`/crew`)

Members-only directory of everyone in Armada, linked from the footer. One
encrypted JSON blob, no database, no ongoing costs.

- **Gate.** The page asks for Armada's official beverage. Any accepted spelling
  (singular or plural) derives a key that unwraps the manifest
  (`lib/crew/vault.mjs`). The encrypted blob is *not* in the repo and *not*
  deployed with the site: production reads it only through the worker, which
  rate-limits guesses. `npm run dev` stages a gitignored local copy into
  `public/` so development works without the worker.
- **Edits.** Anyone can edit anyone. Saves go through a tiny Cloudflare Worker
  with its own storage (a free Durable Object) that keeps the last 60 versions;
  the UI shows the signed edit log, and `scripts/crew-vault.mjs versions` /
  `restore` roll back when needed. See
  [`worker/README.md`](../../worker/README.md) for setup and why it must live
  on a *free* Cloudflare account. Concurrent edits merge field-by-field.
- **Views.** Manifest (sortable list), Graph (force layout with switchable
  lenses: who invited whom, projects, majors, interests, roots, class year),
  Chart (world map of hometowns, current locations and the arcs between).
- **Search.** Fuzzy, synonym-expanded, weighted search over every field, all
  in the browser. No models are called.

## Where things live

| Path | What |
| --- | --- |
| `app/crew/page.tsx` | route; renders `components/crew/CrewApp` |
| `components/crew/` | Gate, Manifest, Graph, Chart, Profile, LogPanel |
| `lib/crew/` | types, search, graph lenses, sync store + merge, crypto |
| `scripts/crew-vault.mjs` | encrypt / decrypt / gate-tokens / stage / push / pull |
| `worker/` | Cloudflare Worker + Durable Object; the only production read/write path |
| `data/crew.seed.json`, `data/crew.enc.json` | plaintext seed and encrypted copy; both gitignored, local only |

## Maintaining the roster by hand

```sh
node scripts/crew-vault.mjs pull --api <worker url> --pass "…"            # live vault -> data/crew.enc.json
node scripts/crew-vault.mjs decrypt --pass "…" --out data/crew.seed.json  # -> plaintext (gitignored)
# edit data/crew.seed.json, then
node scripts/crew-vault.mjs encrypt --pass "…" --pass "…"                 # one --pass per accepted spelling
node scripts/crew-vault.mjs push --api <worker url> --pass "…" --force    # back to the worker
```

`encrypt` keeps the existing data key (and adds keyholes for any new spelling),
so unlocked browsers stay unlocked. `--rekey` rotates the key; pushing a rotated
vault needs `--admin <CREW_ADMIN_TOKEN>`.

Never commit the passphrase, the seed, the encrypted blob, gate tokens or the
admin token. This repo is public.
