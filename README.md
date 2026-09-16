:o  just keep shipping your skippers

## Crew manifest (`/crew`)

Members-only directory of everyone in Armada, linked from the footer. One
encrypted JSON file, no database, no ongoing costs.

- **Gate.** The page asks for Armada's official beverage. Any accepted spelling
  (singular or plural) derives a key that unwraps the manifest
  (`lib/crew/vault.mjs`). The roster lives in the repo as ciphertext at
  `data/crew.enc.json`. It is *not* deployed: production reads it only through
  the worker, which rate-limits guesses. `npm run dev` stages a gitignored copy
  into `public/` so local development works without the worker.
- **Edits.** Anyone can edit anyone. Saves go through a tiny Cloudflare Worker
  with its own storage (a free Durable Object) that keeps the last 60 versions,
  so anything can be undone from Log → Versions. See
  [`worker/README.md`](worker/README.md) for the five-minute setup and why it
  must live on a *free* Cloudflare account. Until the worker is configured,
  edits are kept as a local draft in the browser and the badge says so.
  Concurrent edits merge field-by-field. `data/crew.enc.json` is the seed and
  an occasional backup (`crew-vault.mjs pull`), not the live copy.
- **Views.** Manifest (sortable list), Graph (force layout with switchable
  lenses: who invited whom, projects, majors, interests, roots, class year),
  Chart (world map of hometowns, current locations and the arcs between).
- **Search.** Fuzzy, synonym-expanded, weighted search over every field, all
  in the browser. No models are called.

### Maintaining the seed

The plaintext roster is gitignored (`data/crew.seed.json`). To edit it by hand:

```sh
node scripts/crew-vault.mjs decrypt --pass "…" --out data/crew.seed.json
# edit, then
node scripts/crew-vault.mjs encrypt --pass "…" --pass "…" --pass "…"   # one --pass per accepted spelling
```

`encrypt` keeps the existing data key (and adds keyholes for any new spelling),
so unlocked browsers stay unlocked. Pass `--rekey` to rotate the key, which
asks everyone for the passphrase again.
