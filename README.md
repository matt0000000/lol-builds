# LoL Builds

Pick a champion and a role, get the highest win rate starting items, core items,
boots and runes — plus hardest matchups, win rate by game length, and how the
champion has trended over recent patches.

```bash
npm install
npm run dev      # development, also reachable from the LAN
npm test         # ranking and item set logic
```

Builds live at `/[champion]/[role]`, e.g. `/LeeSin/jungle?tier=all`. Region and
rank are query parameters, defaulting to worldwide Emerald+.

## Running it for real

With Docker, which is how it's deployed:

```bash
docker compose up -d --build   # http://<your-lan-ip>:3100
docker compose logs -f
docker compose down
```

The container listens on 3000 internally and is published on host port 3100,
bound to `0.0.0.0` so anything on the same network can reach it. Change the host
port in `compose.yaml` if 3100 is taken. `restart: unless-stopped` brings it back
after a reboot or a daemon restart.

Without Docker:

```bash
npm run build
npm start        # http://<your-lan-ip>:3100, override with PORT=8000
```

## How it works

Everything renders on the server. The champion/role picker is a plain `<form
method="GET">`, so the page works with JavaScript disabled and every build has a
shareable URL: `/?champ=Aatrox&role=top`.

## Data

Two sources, no HTML scraping:

- **Build stats** — `lol-api-champion.op.gg`, the JSON API op.gg's own front end
  reads. Stable shape, no markup to break. Ranked solo queue, worldwide,
  Emerald+ — both set as constants at the top of `src/lib/server/opgg.ts`.
- **Names and icons** — Riot's Data Dragon (champions, items, summoner spells)
  and Community Dragon (runes and stat shards, which Data Dragon doesn't cover
  in one file).

Both are cached in memory per patch, so a warm server does no upstream work.
See `src/lib/server/cache.ts`.

Note that the op.gg endpoint is undocumented and could change without warning.
If builds stop loading, that's the first place to look — `src/lib/server/opgg.ts`.

All 19 regions and 16 ranks the endpoint accepts are listed in `src/lib/config.ts`
and selectable in the UI. Values were verified against the API, which rejects
anything unrecognised with a 422 rather than silently returning the wrong slice.

The counters feed counts *this champion's* wins in each matchup, not the
opponent's — confirmed by aggregating it back to the champion's overall role win
rate. Getting that backwards would invert the matchup table.

## Item set export

Each build page links to `/[champion]/[role]/itemset`, which returns the JSON
format the League client imports. Save it under
`Config/Champions/<Name>/Recommended/` and restart the client to see the build
in the in-game shop.

## Picking the "best" build

Ranking by raw win rate does not work. A start played 32 times with 25 wins
shows 78% and beats the one played 19,000 times, and it isn't a real build.

Two guards, both in `src/lib/rank.ts`:

1. **Wilson score lower bound** (95%) instead of raw win rate — small samples
   get pulled toward the mean in proportion to how little we know about them.
2. **A relevance floor** — a build needs at least 50 games *and* must account
   for 10% of all games for that champion and role. Wilson alone still lets rare
   oddities through: a 266-game core build at 65% clears any fixed game count
   while only 1.1% of players actually build it.

   This is a strict bar for core items, which fragment across many possible
   orders. Often only the single most popular core build clears it, which means
   that section is closer to "most popular" than "highest win rate". Lower
   `MIN_PICK_RATE` in `src/lib/rank.ts` to trade steadiness for more choice.

Because no threshold settles the "best versus most common" question on its own,
the page shows the most-played option alongside the highest win rate one
whenever they differ. Garen's highest win rate start is Doran's Blade while most
players open Doran's Shield; both are worth knowing.

When nothing clears the floors — which happens for a few days after every patch,
when the source resets its sample — the page falls back to the most-played
option and says so, rather than presenting a fifteen-game build as authoritative.

`src/lib/rank.ts` is covered by tests; run `npm test`.

If nothing clears the bar (an off-meta champion in an off-role), it falls back
to the most-played option so the page shows something rather than nothing.

Items shown as situational last items are filtered to finished, buyable
Summoner's Rift legendaries — otherwise op.gg's feed recommends B. F. Sword as a
final purchase.

## Deploying

Uses `@sveltejs/adapter-node`, so `npm run build` produces a plain Node server
in `build/` that runs anywhere with `node build`. The `Dockerfile` wraps that in
a two-stage build — dev dependencies compile the app, then only `build/` and
pruned production `node_modules` are copied into the runtime image, which runs
as the unprivileged `node` user.

Because the image is a plain Node server, the same `compose.yaml` works on any
Docker host, not just this machine. For a serverless host instead, swap in that
platform's adapter (`adapter-vercel`, `adapter-netlify`, …).
