import { cached, HOUR } from './cache';
import type { Champion, Entry } from '$lib/types';

const DDRAGON = 'https://ddragon.leagueoflegends.com';
const CDRAGON =
	'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default';

async function json<T>(url: string): Promise<T> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
	return res.json() as Promise<T>;
}

/** Community Dragon icon paths are absolute game-data paths; rebase to the CDN. */
function cdragonIcon(iconPath: string): string {
	return CDRAGON + iconPath.toLowerCase().replace('/lol-game-data/assets', '');
}

interface DDragonItem {
	name: string;
	gold?: { total: number; purchasable: boolean };
	into?: string[];
	tags?: string[];
	maps?: Record<string, boolean>;
	requiredChampion?: string;
}

/**
 * op.gg's "last items" feed mixes components in with finished items, which is
 * how you end up recommending B. F. Sword as a final purchase. An item counts
 * as finished when nothing builds out of it and it costs real gold.
 */
function isLegendary(item: DDragonItem): boolean {
	if (!item.gold?.purchasable) return false;
	if (item.gold.total < 1500) return false;
	if (item.into?.length) return false;
	if (item.requiredChampion) return false;
	if (item.tags?.includes('Consumable') || item.tags?.includes('Trinket')) return false;
	// Map 11 is Summoner's Rift; absent `maps` means available everywhere.
	return item.maps?.['11'] !== false;
}

export function patch(): Promise<string> {
	return cached('patch', 6 * HOUR, async () => {
		const versions = await json<string[]>(`${DDRAGON}/api/versions.json`);
		return versions[0];
	});
}

export interface StaticData {
	patch: string;
	champions: Champion[];
	championById: Map<number, Champion>;
	/** Keyed by Data Dragon id, display name and a punctuation-stripped form. */
	championByKey: Map<string, Champion>;
	items: Map<number, Entry>;
	/** Finished, buyable Summoner's Rift items — no components, no consumables. */
	legendaryItems: Set<number>;
	spells: Map<number, Entry>;
	perks: Map<number, Entry>;
	perkTrees: Map<number, Entry>;
}

export function staticData(): Promise<StaticData> {
	return cached('static-data', 6 * HOUR, async () => {
		const version = await patch();

		const [champRes, itemRes, spellRes, perkRes, treeRes] = await Promise.all([
			json<{ data: Record<string, { key: string; id: string; name: string }> }>(
				`${DDRAGON}/cdn/${version}/data/en_US/champion.json`
			),
			json<{ data: Record<string, DDragonItem> }>(
				`${DDRAGON}/cdn/${version}/data/en_US/item.json`
			),
			json<{ data: Record<string, { key: string; id: string; name: string }> }>(
				`${DDRAGON}/cdn/${version}/data/en_US/summoner.json`
			),
			json<{ id: number; name: string; iconPath: string }[]>(`${CDRAGON}/v1/perks.json`),
			json<{ styles: { id: number; name: string; iconPath: string }[] }>(
				`${CDRAGON}/v1/perkstyles.json`
			)
		]);

		const champions: Champion[] = Object.values(champRes.data)
			.map((c) => ({
				id: Number(c.key),
				key: c.id,
				name: c.name,
				icon: `${DDRAGON}/cdn/${version}/img/champion/${c.id}.png`
			}))
			.sort((a, b) => a.name.localeCompare(b.name));

		const items = new Map<number, Entry>();
		const legendaryItems = new Set<number>();
		for (const [id, item] of Object.entries(itemRes.data)) {
			const numericId = Number(id);
			items.set(numericId, {
				id: numericId,
				name: item.name,
				icon: `${DDRAGON}/cdn/${version}/img/item/${id}.png`
			});
			if (isLegendary(item)) legendaryItems.add(numericId);
		}

		const spells = new Map<number, Entry>();
		for (const spell of Object.values(spellRes.data)) {
			spells.set(Number(spell.key), {
				id: Number(spell.key),
				name: spell.name,
				icon: `${DDRAGON}/cdn/${version}/img/spell/${spell.id}.png`
			});
		}

		// perks.json carries keystones, minor runes and stat shards alike.
		const perks = new Map<number, Entry>();
		for (const perk of perkRes) {
			perks.set(perk.id, { id: perk.id, name: perk.name, icon: cdragonIcon(perk.iconPath) });
		}

		const perkTrees = new Map<number, Entry>();
		for (const style of treeRes.styles) {
			perkTrees.set(style.id, {
				id: style.id,
				name: style.name,
				icon: cdragonIcon(style.iconPath)
			});
		}

		return {
			patch: version,
			champions,
			championById: new Map(champions.map((c) => [c.id, c])),
			championByKey: buildLookup(champions),
			items,
			legendaryItems,
			spells,
			perks,
			perkTrees
		};
	});
}

/** Strip case, spaces and punctuation, so "Kai'Sa" and "kaisa" both resolve. */
export function normalizeName(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * The search box lets people type a display name, while URLs carry the Data
 * Dragon key. Index both, plus a normalized form, so all of them resolve.
 */
function buildLookup(champions: Champion[]): Map<string, Champion> {
	const map = new Map<string, Champion>();
	for (const champion of champions) {
		map.set(champion.key.toLowerCase(), champion);
		map.set(normalizeName(champion.key), champion);
		map.set(normalizeName(champion.name), champion);
	}
	return map;
}

const UNKNOWN = (id: number): Entry => ({ id, name: `#${id}`, icon: '' });

export function lookup(map: Map<number, Entry>, ids: number[] | undefined): Entry[] {
	return (ids ?? []).map((id) => map.get(id) ?? UNKNOWN(id));
}
