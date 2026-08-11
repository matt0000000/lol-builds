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

export interface Champion {
	id: number;
	key: string;
	name: string;
	icon: string;
}

export interface BuildPage {
	champion: Champion;
	role: Role;
	patch: string;
	roleRecord: Stats | null;
	/** Roles this champion is actually played in, best first. */
	playedRoles: { role: Role; winRate: number; pickRate: number }[];
	starters: ItemSet | null;
	core: ItemSet | null;
	boots: ItemSet | null;
	situational: ItemSet[];
	runes: RuneSet | null;
	spells: ItemSet | null;
	skills: SkillOrder | null;
}
