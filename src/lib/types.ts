import type { Region, Tier } from './config';

export type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support';

export const ROLES: { id: Role; label: string }[] = [
	{ id: 'top', label: 'Top' },
	{ id: 'jungle', label: 'Jungle' },
	{ id: 'mid', label: 'Mid' },
	{ id: 'adc', label: 'ADC' },
	{ id: 'support', label: 'Support' }
];

/** A thing we can show an icon and a name for. */
export interface Entry {
	id: number;
	name: string;
	icon: string;
}

/** Win/play record attached to any recommendation. */
export interface Stats {
	play: number;
	win: number;
	winRate: number;
	pickRate: number;
}

export interface ItemSet extends Stats {
	items: Entry[];
}

export interface RuneSet extends Stats {
	primaryTree: Entry;
	primary: Entry[];
	secondaryTree: Entry;
	secondary: Entry[];
	shards: Entry[];
}

export interface SkillOrder extends Stats {
	order: string[];
}

/**
 * The highest-win-rate option plus the most-played one. `popular` is null when
 * they're the same, so the page only shows a second line when it adds something.
 */
export interface Choice<T> {
	best: T | null;
	popular: T | null;
	/**
	 * True when `best` did not clear the sample floors and we fell back to the
	 * most-played option — normal in the first days of a new patch, when the
	 * source has barely any games. Surfaced so the page never implies a
	 * confidence the data doesn't support.
	 */
	provisional: boolean;
}

export interface Champion {
	id: number;
	key: string;
	name: string;
	icon: string;
}

export interface Matchup {
	champion: Champion;
	play: number;
	win: number;
	winRate: number;
}

export interface GameLength {
	/** Lower bound of the bucket in minutes; 0 means "shorter than the next". */
	from: number;
	label: string;
	winRate: number;
	/** Average win rate across all champions in this bucket, for comparison. */
	average: number;
}

export interface TrendPoint {
	patch: string;
	winRate: number;
}

export interface BuildPage {
	champion: Champion;
	role: Role;
	region: Region;
	tier: Tier;
	patch: string;
	roleRecord: Stats | null;
	/** Overall standing for the champion: op.gg tier, rank, KDA, ban rate. */
	standing: { tier: number; rank: number; kda: number; banRate: number } | null;
	/** Roles this champion is actually played in, best first. */
	playedRoles: { role: Role; winRate: number; pickRate: number }[];
	starters: Choice<ItemSet>;
	core: Choice<ItemSet>;
	boots: Choice<ItemSet>;
	situational: ItemSet[];
	runes: Choice<RuneSet>;
	spells: Choice<ItemSet>;
	skills: Choice<SkillOrder>;
	/** Which abilities to max, in order, e.g. Q > W > E. */
	skillMax: string[] | null;
	worstMatchups: Matchup[];
	gameLengths: GameLength[];
	trend: TrendPoint[];
	/** True when any headline section had to fall back for lack of games. */
	provisional: boolean;
}
