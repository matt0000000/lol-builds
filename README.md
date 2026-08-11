# LoL Builds

Pick a champion and a role, get the highest win rate starting items, core items,
boots and runes. That's the whole site.

```bash
npm install
npm run dev      # development, also reachable from the LAN
```

## Running it for real

```bash
npm run build
npm start        # http://<your-lan-ip>:3100
```

`npm start` binds to `0.0.0.0`, so anything on the same network can reach it.
Override the port with `PORT=8000 npm start` if 3100 is taken.

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

If nothing clears the bar (an off-meta champion in an off-role), it falls back
to the most-played option so the page shows something rather than nothing.

Items shown as situational last items are filtered to finished, buyable
Summoner's Rift legendaries — otherwise op.gg's feed recommends B. F. Sword as a
final purchase.

## Deploying

Uses `@sveltejs/adapter-node`, so `npm run build` produces a plain Node server
in `build/` that runs anywhere with `node build`. For a serverless host, swap in
that platform's adapter (`adapter-vercel`, `adapter-netlify`, …).
