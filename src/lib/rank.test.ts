import { describe, expect, it } from 'vitest';
import {
	best,
	bestN,
	meetsFloor,
	MIN_GAMES,
	MIN_PICK_RATE,
	mostPlayed,
	wilsonLowerBound
} from './rank';

/** Shorthand for a candidate build: wins out of games, at a given pick rate. */
const row = (win: number, play: number, pick_rate = 1) => ({ win, play, pick_rate });

describe('wilsonLowerBound', () => {
	it('is zero when nothing has been played', () => {
		expect(wilsonLowerBound(0, 0)).toBe(0);
	});

	it('sits below the observed rate, since it is a lower bound', () => {
		expect(wilsonLowerBound(60, 100)).toBeLessThan(0.6);
	});

	it('punishes small samples harder than large ones at the same rate', () => {
		// Both are 75% wins; the 8-game version should be trusted far less.
		expect(wilsonLowerBound(6, 8)).toBeLessThan(wilsonLowerBound(750, 1000));
	});

	it('approaches the true rate as the sample grows', () => {
		expect(wilsonLowerBound(55_000, 100_000)).toBeCloseTo(0.55, 2);
	});
});

describe('best', () => {
	it('returns null for missing or empty input', () => {
		expect(best(undefined)).toBeNull();
		expect(best([])).toBeNull();
	});

	it('ignores a high win rate built on too few games', () => {
		const fluke = row(MIN_GAMES - 1, MIN_GAMES - 1); // 100%, under the floor
		const real = row(520, 1000);
		expect(best([fluke, real])).toBe(real);
	});

	it('ignores builds that almost nobody plays, however well they do', () => {
		// Clears MIN_GAMES comfortably but is only 1% of games — the Kled case.
		const rare = row(174, 266, 0.011);
		const common = row(1405, 2496, 0.103);
		expect(best([rare, common])).toBe(common);
	});

	it('prefers the higher win rate when both are credible', () => {
		const good = row(600, 1000, 0.3);
		const okay = row(510, 1000, 0.3);
		expect(best([okay, good])).toBe(good);
	});

	it('falls back to the most played option when nothing clears the floors', () => {
		// An off-meta champion in an off-role: everything is thin.
		const thin = row(3, 5, 0.01);
		const lessThin = row(4, 10, 0.02);
		expect(best([thin, lessThin])).toBe(lessThin);
	});

	it('treats the pick rate floor as inclusive', () => {
		const exactly = row(60, 100, MIN_PICK_RATE);
		const below = row(90, 100, MIN_PICK_RATE - 0.001);
		expect(best([exactly, below])).toBe(exactly);
	});
});

describe('meetsFloor', () => {
	it('accepts an entry clearing both floors', () => {
		expect(meetsFloor(row(60, 100, 0.2))).toBe(true);
	});

	it('rejects a thin sample even at a huge pick rate', () => {
		// The fresh-patch case: op.gg resets and everything has a handful of games.
		expect(meetsFloor(row(9, 15, 0.9))).toBe(false);
	});

	it('rejects a well-played build that almost nobody picks', () => {
		expect(meetsFloor(row(500, 1000, 0.01))).toBe(false);
	});
});

describe('mostPlayed', () => {
	it('ignores win rate entirely', () => {
		const popular = row(500, 1000, 0.5);
		const winning = row(90, 100, 0.5);
		expect(mostPlayed([winning, popular])).toBe(popular);
	});

	it('returns null for missing input', () => {
		expect(mostPlayed(undefined)).toBeNull();
	});
});

describe('bestN', () => {
	it('returns at most n entries, ranked', () => {
		const rows = [row(600, 1000, 0.3), row(700, 1000, 0.3), row(650, 1000, 0.3)];
		const top = bestN(rows, 2);
		expect(top).toHaveLength(2);
		expect(top[0]).toBe(rows[1]);
	});

	it('returns nothing rather than noise when no entry is credible', () => {
		expect(bestN([row(5, 5, 0.001)], 3)).toEqual([]);
	});
});
