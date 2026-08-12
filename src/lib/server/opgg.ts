import { cached, HOUR } from './cache';
import { lookup, normalizeName, staticData } from './static-data';
import { best, bestN } from '$lib/rank';
import type { BuildPage, ItemSet, Role, RuneSet, SkillOrder } from '$lib/types';

/**
 * op.gg's own front end reads these JSON endpoints, so we take the same feed
 * rather than parsing rendered HTML — stable shape, no markup churn.
 */
/** `global` is op.gg's worldwide aggregate, not a specific server. */
const REGION = 'global';
/** Emerald and above. The endpoint's own default is a different slice, so set it explicitly. */
const TIER = 'emerald_plus';
const API = `https://lol-api-champion.op.gg/api/${REGION}/champions/ranked`;

interface Sample {
	play: number;
	win: number;
	pick_rate: number;
}
interface ItemRow extends Sample {
	ids: number[];
}
interface RuneRow extends Sample {
	primary_page_id: number;
	primary_rune_ids: number[];
	secondary_page_id: number;
	secondary_rune_ids: number[];
	stat_mod_ids: number[];
}
interface SkillRow extends Sample {
	order: string[];
}

interface ChampionResponse {
	data: {
		summary: {
			positions: {
				name: string;
				stats: { win_rate: number; pick_rate: number; play?: number; win?: number };
			}[];
		};
		summoner_spells?: ItemRow[];
		core_items?: ItemRow[];
		boots?: ItemRow[];
		starter_items?: ItemRow[];
		last_items?: ItemRow[];
		runes?: RuneRow[];
		skills?: SkillRow[];
	};
}

function raw(championId: number, role: Role): Promise<ChampionResponse> {
	return cached(`opgg:${REGION}:${TIER}:${championId}:${role}`, 6 * HOUR, async () => {
		const res = await fetch(`${API}/${championId}/${role}?tier=${TIER}`, {
			headers: { accept: 'application/json' }
		});
		if (!res.ok) throw new Error(`op.gg responded ${res.status} for ${championId}/${role}`);
		return res.json() as Promise<ChampionResponse>;
	});
}

function record(sample: Sample) {
	return {
		play: sample.play,
		win: sample.win,
		winRate: sample.play ? sample.win / sample.play : 0,
		pickRate: sample.pick_rate
	};
}

export async function buildPage(championKey: string, role: Role): Promise<BuildPage | null> {
	const data = await staticData();
	const champion =
		data.championByKey.get(championKey.toLowerCase()) ??
		data.championByKey.get(normalizeName(championKey));
	if (!champion) return null;

	const { data: d } = await raw(champion.id, role);

	const itemSet = (row: ItemRow | null): ItemSet | null =>
		row ? { ...record(row), items: lookup(data.items, row.ids) } : null;

	const runeRow = best(d.runes);
	const runes: RuneSet | null = runeRow
		? {
				...record(runeRow),
				primaryTree: data.perkTrees.get(runeRow.primary_page_id) ?? {
					id: runeRow.primary_page_id,
					name: 'Primary',
					icon: ''
				},
				primary: lookup(data.perks, runeRow.primary_rune_ids),
				secondaryTree: data.perkTrees.get(runeRow.secondary_page_id) ?? {
					id: runeRow.secondary_page_id,
					name: 'Secondary',
					icon: ''
				},
				secondary: lookup(data.perks, runeRow.secondary_rune_ids),
				shards: lookup(data.perks, runeRow.stat_mod_ids)
			}
		: null;

	const spellRow = best(d.summoner_spells);
	const skillRow = best(d.skills);
	const skills: SkillOrder | null = skillRow
		? { ...record(skillRow), order: skillRow.order }
		: null;

	const rolePosition = d.summary.positions.find((p) => p.name.toLowerCase() === roleToPosition(role));

	return {
		champion,
		role,
		patch: data.patch,
		roleRecord: rolePosition
			? {
					play: rolePosition.stats.play ?? 0,
					win: rolePosition.stats.win ?? 0,
					winRate: rolePosition.stats.win_rate,
					pickRate: rolePosition.stats.pick_rate
				}
			: null,
		playedRoles: d.summary.positions
			.map((p) => ({
				role: positionToRole(p.name),
				winRate: p.stats.win_rate,
				pickRate: p.stats.pick_rate
			}))
			.filter((p): p is { role: Role; winRate: number; pickRate: number } => p.role !== null)
			.sort((a, b) => b.pickRate - a.pickRate),
		starters: itemSet(best(d.starter_items)),
		core: itemSet(best(d.core_items)),
		boots: itemSet(best(d.boots)),
		situational: bestN(
			d.last_items?.filter((row) => row.ids.every((id) => data.legendaryItems.has(id))),
			5
		)
			.map(itemSet)
			.filter((s): s is ItemSet => s !== null),
		runes,
		spells: spellRow ? { ...record(spellRow), items: lookup(data.spells, spellRow.ids) } : null,
		skills
	};
}

/** op.gg names positions TOP/JUNGLE/MID/ADC/SUPPORT — same slugs we use. */
function roleToPosition(role: Role): string {
	return role;
}

function positionToRole(name: string): Role | null {
	const slug = name.toLowerCase();
	return (['top', 'jungle', 'mid', 'adc', 'support'] as Role[]).find((r) => r === slug) ?? null;
}

export async function championList() {
	return (await staticData()).champions;
}
