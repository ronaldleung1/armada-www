# armada-crew worker

The only door to the crew manifest in production. It stores one encrypted file
in a Durable Object, checks a bearer token derived from the club passphrase,
and keeps the last 60 versions so anyone can undo anything. It never sees
plaintext or the encryption key.

No GitHub token, no database, nothing from Ronald. Just a free Cloudflare
account.

## Cost and accounts

- **Use a free Cloudflare account.** The free Workers plan has a hard cap
  (100k requests/day, 100k Durable Object requests/day): over it, the worker
  returns errors until midnight UTC and never bills. A club of ~70 uses a few
  hundred requests on a busy day. **Do not deploy under a paid Workers
  account**: the paid plan has no cap, and a flood costs $0.30 per million
  requests (a 100M-request attack ≈ $27). If you only have a paid account, make
  a second free one for this (an email address; `npx wrangler login` in a
  private browser window).
- Durable Objects on the free plan must be SQLite-backed, which is what
  `wrangler.toml` declares. Storage is 5 GB; the manifest is ~40 KB.

## Setup (about five minutes)

From the repo root, with all accepted spellings of the passphrase:

```sh
node scripts/crew-vault.mjs gate-tokens --pass "spelling 1" --pass "spelling 2" --pass "…"
```

It prints one comma-separated line of hashes (not the passphrase). Then:

```sh
cd worker
npm install
npx wrangler login                          # the FREE account
npx wrangler secret put CREW_GATE_TOKENS    # paste the line from above
npx wrangler deploy
```

Wrangler prints a URL like `https://armada-crew.<account>.workers.dev`.
`curl` it: you should get `{"ok":true,"service":"armada-crew"}`.

Seed it with the encrypted roster committed in this repo, then tell the site:

```sh
cd ..
node scripts/crew-vault.mjs push --api https://armada-crew.<account>.workers.dev --pass "any accepted spelling"
```

GitHub repo → Settings → Secrets and variables → Actions → Variables → new
repository variable `CREW_API_URL` = that URL. Push anything (or re-run the
Pages workflow). The badge on `/crew` switches from "Local copy" to "Synced".

For local testing without a rebuild, in the browser console on
`localhost:3000/crew`: `localStorage.setItem('crew:api', 'https://armada-crew.<account>.workers.dev')`.

## Day to day

- **Undo.** Every save archives the version it replaced (last 60 kept). The UI
  only shows the log; to roll back, `node scripts/crew-vault.mjs versions --api …
  --pass …` then `restore --sha <version>`. Restoring archives the current one
  too, so nothing is ever lost.
- **Backup.** `node scripts/crew-vault.mjs pull --api … --pass …` writes the
  live vault to `data/crew.enc.json`; commit it whenever you feel like it.
- **Passphrase change.** Re-encrypt (`encrypt --rekey --pass …` for each new
  spelling), update `CREW_GATE_TOKENS`, then `push --force --admin <token>`
  where the token is a random string you set once with
  `npx wrangler secret put CREW_ADMIN_TOKEN`. Without the admin token the API
  refuses to change the vault's keys, by design.

## Guard rails built in

- Passphrase guessing is throttled inside the Durable Object, which is a single
  instance worldwide, so the count is exact: 5 wrong tokens in 10 minutes locks
  the IP for 15 minutes, doubling with each repeat up to a day. More than 40
  wrong tokens an hour from anywhere pauses unlocks for IPs that have never
  unlocked before, so rotating addresses does not help. `crew-vault.mjs abuse`
  lists lockouts; `unlock-ip` lifts one early. (The in-memory per-request limits
  are only burst protection; Cloudflare runs many short-lived worker instances.)
- Bodies over 1 MB are refused before being read.
- The vault's wrapped keys are immutable through the API without
  `CREW_ADMIN_TOKEN`, so a leaked passphrase cannot lock everyone out. And if someone with the passphrase vandalizes the
  roster, `crew-vault.mjs restore` undoes it.
- Optimistic concurrency: writes carry the version they were based on; a stale
  one gets a 409 and the browser merges field-by-field and retries.

## GitHub instead of a Durable Object

If you'd rather have every edit as a git commit, the worker also speaks the
GitHub Contents API. See the commented block at the bottom of `wrangler.toml`;
it needs a fine-grained token from the repo owner with Contents read/write, and
history/undo then live in `git log`.
