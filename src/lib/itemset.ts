import type { BuildPage, ItemSet } from './types';

/**
 * The League client's item set format. Saving one of these into
 * `Config/Champions/<Name>/Recommended/` makes the build show up in the shop.
 */
export interface RiotItemSet {
	title: string;
	type: 'custom';
	map: 'any';
	mode: 'any';
	priority: boolean;
	sortrank: number;
	associatedMaps: number[];
	associatedChampions: number[];
	blocks: RiotBlock[];
}

interface RiotBlock {
	type: string;
	items: { id: string; count: number }[];
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function block(label: string, set: ItemSet | null): RiotBlock | null {
	if (!set?.items.length) return null;
	return {
		type: `${label} — ${pct(set.winRate)} WR, ${set.play.toLocaleString('en-US')} games`,
		// The client wants string ids and collapses duplicates into a count.
		items: countItems(set.items.map((i) => String(i.id)))
	};
}

function countItems(ids: string[]): { id: string; count: number }[] {
	const counts = new Map<string, number>();
	for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
	return [...counts].map(([id, count]) => ({ id, count }));
}

export function toItemSet(build: BuildPage): RiotItemSet {
	const blocks = [
		block('Starting items', build.starters.best),
		block('Core build', build.core.best),
		block('Boots', build.boots.best),
		build.situational.length
			? {
					type: 'Situational',
					items: countItems(
						build.situational.flatMap((s) => s.items.map((i) => String(i.id)))
					)
				}
			: null
	].filter((b): b is RiotBlock => b !== null);

	return {
		title: `${build.champion.name} ${build.role} — ${build.patch}`,
		type: 'custom',
		map: 'any',
		mode: 'any',
		priority: false,
		sortrank: 1,
		associatedMaps: [11, 12],
		associatedChampions: [build.champion.id],
		blocks
	};
}
