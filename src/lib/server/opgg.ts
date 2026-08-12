import { cached, HOUR } from './cache';
import { lookup, normalizeName, staticData } from './static-data';
import { best, bestN, meetsFloor, mostPlayed } from '$lib/rank';
import type { Region, Tier } from '$lib/config';
import type {
	BuildPage,
	Choice,
	GameLength,
	ItemSet,
	Matchup,
	Role,
	RuneSet,
	SkillOrder,
	Stats,
	TrendPoint
} from '$lib/types';

/**
 * op.gg's own front end reads these JSON endpoints, so we take the same feed
 * rather than parsing rendered HTML — stable shape, no markup churn.
 */
const API = 'https://lol-api-champion.op.gg/api';

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
interface MasteryRow extends Sample {
	ids: string[];
}

interface ChampionResponse {
	data: {
		summary: {
			average_stats?: { kda?: number; ban_rate?: number; tier?: number; rank?: number };
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
		skill_masteries?: MasteryRow[];
		counters?: { champion_id: number; play: number; win: number }[];
		game_lengths?: { game_length: number; rate: number; average: number }[];
		trends?: { win?: { version: string; rate: number }[] };
	};
}

function raw(
	championId: number,
	role: Role,
	region: Region,
	tier: Tier
): Promise<ChampionResponse> {
	return cached(`opgg:${region}:${tier}:${championId}:${role}`, 6 * HOUR, async () => {
		const url = `${API}/${region}/champions/ranked/${championId}/${role}?tier=${tier}`;
		const res = await fetch(url, { headers: { accept: 'application/json' } });
		if (!res.ok) throw new Error(`op.gg responded ${res.status} for ${championId}/${role}`);
		return res.json() as Promise<ChampionResponse>;
	});
}

function record(sample: Sample): Stats {
	return {
		play: sample.play,
		win: sample.win,
		winRate: sample.play ? sample.win / sample.play : 0,
		pickRate: sample.pick_rate
	};
}

/** Build a best/popular pair, dropping `popular` when it's the same option. */
function choose<Row extends Sample, T>(
	rows: Row[] | undefined,
	same: (a: Row, b: Row) => boolean,
	map: (row: Row) => T
): Choice<T> {
	const top = best(rows);
	const common = mostPlayed(rows);
	return {
		best: top ? map(top) : null,
		popular: common && top && !same(common, top) ? map(common) : null,
		provisional: top ? !meetsFloor(top) : false
	};
}

const sameIds = (a: { ids: number[] }, b: { ids: number[] }) => a.ids.join() === b.ids.join();

export async function buildPage(
	championKey: string,
	role: Role,
	region: Region,
	tier: Tier
): Promise<BuildPage | null> {
	const data = await staticData();
	const champion =
		data.championByKey.get(championKey.toLowerCase()) ??
		data.championByKey.get(normalizeName(championKey));
	if (!champion) return null;

	const { data: d } = await raw(champion.id, role, region, tier);

	const toItems = (row: ItemRow): ItemSet => ({
		...record(row),
		items: lookup(data.items, row.ids)
	});

	const toRunes = (row: RuneRow): RuneSet => ({
		...record(row),
		primaryTree: data.perkTrees.get(row.primary_page_id) ?? {
			id: row.primary_page_id,
			name: 'Primary',
			icon: ''
		},
		primary: lookup(data.perks, row.primary_rune_ids),
		secondaryTree: data.perkTrees.get(row.secondary_page_id) ?? {
			id: row.secondary_page_id,
			name: 'Secondary',
			icon: ''
		},
		secondary: lookup(data.perks, row.secondary_rune_ids),
		shards: lookup(data.perks, row.stat_mod_ids)
	});

	const toSkills = (row: SkillRow): SkillOrder => ({ ...record(row), order: row.order });

	const rolePosition = d.summary.positions.find((p) => p.name.toLowerCase() === role);
	const avg = d.summary.average_stats;

	// `win` in the counters feed counts this champion's wins in the matchup, not
	// the opponent's — verified by aggregating it back to the role win rate.
	// Rare matchups swing wildly, so require a real sample before calling one bad.
	const worstMatchups: Matchup[] = (d.counters ?? [])
		.filter((c) => c.play >= 100 && data.championById.has(c.champion_id))
		.map((c) => ({
			champion: data.championById.get(c.champion_id)!,
			play: c.play,
			win: c.win,
			winRate: c.win / c.play
		}))
		.sort((a, b) => a.winRate - b.winRate)
		.slice(0, 6);

	const gameLengths: GameLength[] = (d.game_lengths ?? []).map((g, i, all) => ({
		from: g.game_length,
		label: bucketLabel(g.game_length, i, all.length),
		winRate: g.rate,
		average: g.average
	}));

	const trend: TrendPoint[] = (d.trends?.win ?? [])
		.slice(0, 6)
		.map((t) => ({ patch: t.version, winRate: t.rate }));

	const starters = choose(d.starter_items, sameIds, toItems);
	const core = choose(d.core_items, sameIds, toItems);
	const boots = choose(d.boots, sameIds, toItems);
	const runes = choose(
		d.runes,
		(a, b) =>
			a.primary_rune_ids.join() === b.primary_rune_ids.join() &&
			a.secondary_rune_ids.join() === b.secondary_rune_ids.join(),
		toRunes
	);

	return {
		champion,
		role,
		region,
		tier,
		patch: data.patch,
		roleRecord: rolePosition
			? {
					play: rolePosition.stats.play ?? 0,
					win: rolePosition.stats.win ?? 0,
					winRate: rolePosition.stats.win_rate,
					pickRate: rolePosition.stats.pick_rate
				}
			: null,
		standing: avg
			? {
					tier: avg.tier ?? 0,
					rank: avg.rank ?? 0,
					kda: avg.kda ?? 0,
					banRate: avg.ban_rate ?? 0
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
		starters,
		core,
		boots,
		situational: bestN(
			d.last_items?.filter((row) => row.ids.every((id) => data.legendaryItems.has(id))),
			5
		).map(toItems),
		runes,
		spells: choose(d.summoner_spells, sameIds, (row) => ({
			...record(row),
			items: lookup(data.spells, row.ids)
		})),
		skills: choose(d.skills, (a, b) => a.order.join() === b.order.join(), toSkills),
		skillMax: mostPlayed(d.skill_masteries)?.ids ?? null,
		worstMatchups,
		gameLengths,
		trend,
		provisional:
			starters.provisional || core.provisional || boots.provisional || runes.provisional
	};
}

/** Buckets arrive as lower bounds: 0, 25, 30, 35, 40 minutes. */
function bucketLabel(from: number, index: number, total: number): string {
	if (index === 0) return '< 25 min';
	if (index === total - 1) return `${from}+ min`;
	return `${from}–${from + 5} min`;
}

function positionToRole(name: string): Role | null {
	const slug = name.toLowerCase();
	return (['top', 'jungle', 'mid', 'adc', 'support'] as Role[]).find((r) => r === slug) ?? null;
}

export async function championList() {
	return (await staticData()).champions;
}
