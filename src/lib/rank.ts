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
 * A build must also be played at least this often relative to the most popular
 * option in its category. Wilson alone still lets long-tail oddities through:
 * a 32-game start at 78% clears any fixed game count, yet nobody actually
 * builds it. Requiring a real share of the pick distribution keeps the answer
 * to builds people genuinely run.
 */
export const MIN_SHARE_OF_LEADER = 0.1;

export interface Sample {
	play: number;
	win: number;
}

/** Entries with enough games, in absolute and relative terms. */
function credible<T extends Sample>(entries: T[]): T[] {
	const mostPlayed = Math.max(...entries.map((e) => e.play));
	const floor = Math.max(MIN_GAMES, mostPlayed * MIN_SHARE_OF_LEADER);
	return entries.filter((e) => e.play >= floor);
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
