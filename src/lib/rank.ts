/**
 * Picking a build by raw win rate is a trap: a set played 4 times with 3 wins
 * shows 75% and beats every real build. We rank by the lower bound of the
 * Wilson score interval instead, which asks "how good is this build at worst,
 * given how often we've seen it?" — small samples get pulled toward the mean
 * on their own, no arbitrary cutoff required.
 */
export function wilsonLowerBound(win: number, play: number, z = 1.96): number {
	if (play <= 0) return 0;
	const p = win / play;
	const z2 = z * z;
	const denominator = 1 + z2 / play;
	const centre = p + z2 / (2 * play);
	const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * play)) / play);
	return (centre - margin) / denominator;
}

/** Below this many games a build is noise no matter what its win rate says. */
export const MIN_GAMES = 50;

/**
 * A build must account for at least this share of all games played, not just a
 * share of the leading option. Wilson alone still lets long-tail oddities
 * through: a 266-game core build at 65% clears any fixed game count, yet only
 * 1.1% of players build it. Measuring against the whole population keeps the
 * answer to builds people genuinely run.
 *
 * Note this is a strict bar for core items, which fragment across many orders —
 * often only the single most popular one qualifies.
 */
export const MIN_PICK_RATE = 0.1;

export interface Sample {
	play: number;
	win: number;
	/** Share of all games for this champion/role, as op.gg reports it. */
	pick_rate: number;
}

/** Entries played often enough, in absolute and population terms. */
function credible<T extends Sample>(entries: T[]): T[] {
	return entries.filter((e) => e.play >= MIN_GAMES && e.pick_rate >= MIN_PICK_RATE);
}

/**
 * Best entry by Wilson lower bound among credible entries. Falls back to the
 * most-played entry when nothing clears the bar, so an unpopular champion or
 * role still renders something rather than nothing.
 */
export function best<T extends Sample>(entries: T[] | undefined): T | null {
	if (!entries?.length) return null;

	const pool = credible(entries);
	if (!pool.length) {
		return entries.reduce((a, b) => (b.play > a.play ? b : a));
	}

	return pool.reduce((a, b) =>
		wilsonLowerBound(b.win, b.play) > wilsonLowerBound(a.win, a.play) ? b : a
	);
}

/** Top N by Wilson lower bound, for lists like situational items. */
export function bestN<T extends Sample>(entries: T[] | undefined, n: number): T[] {
	if (!entries?.length) return [];

	const pool = credible(entries);
	if (!pool.length) return [];

	return [...pool]
		.sort((a, b) => wilsonLowerBound(b.win, b.play) - wilsonLowerBound(a.win, a.play))
		.slice(0, n);
}
