import { describe, expect, it } from 'vitest';
import { toItemSet } from './itemset';
import type { BuildPage, ItemSet } from './types';

const item = (id: number, name: string) => ({ id, name, icon: '' });

const set = (items: { id: number; name: string; icon: string }[], winRate = 0.55): ItemSet => ({
	items,
	play: 1000,
	win: Math.round(1000 * winRate),
	winRate,
	pickRate: 0.5
});

const build = (overrides: Partial<BuildPage> = {}): BuildPage =>
	({
		champion: { id: 240, key: 'Kled', name: 'Kled', icon: '' },
		role: 'top',
		region: 'global',
		tier: 'emerald_plus',
		patch: '16.16.1',
		roleRecord: null,
		standing: null,
		playedRoles: [],
		starters: { best: set([item(1055, "Doran's Blade"), item(2003, 'Health Potion')]), popular: null, provisional: false },
		core: { best: set([item(6631, 'Titanic Hydra'), item(3071, 'Black Cleaver')]), popular: null, provisional: false },
		boots: { best: set([item(3111, "Mercury's Treads")]), popular: null, provisional: false },
		situational: [set([item(3053, "Sterak's Gage")])],
		runes: { best: null, popular: null, provisional: false },
		spells: { best: null, popular: null, provisional: false },
		skills: { best: null, popular: null, provisional: false },
		skillMax: null,
		worstMatchups: [],
		gameLengths: [],
		trend: [],
		provisional: false,
		...overrides
	}) as BuildPage;

describe('toItemSet', () => {
	it('names the set after the champion, role and patch', () => {
		expect(toItemSet(build()).title).toBe('Kled top — 16.16.1');
	});

	it('associates the set with the champion so the client shows it', () => {
		expect(toItemSet(build()).associatedChampions).toEqual([240]);
	});

	it('emits string ids, as the client format requires', () => {
		const [starting] = toItemSet(build()).blocks;
		expect(starting.items[0]).toEqual({ id: '1055', count: 1 });
	});

	it('collapses duplicate items into a count', () => {
		const potions = set([item(2003, 'Health Potion'), item(2003, 'Health Potion')]);
		const result = toItemSet(build({ starters: { best: potions, popular: null, provisional: false } }));
		expect(result.blocks[0].items).toEqual([{ id: '2003', count: 2 }]);
	});

	it('labels each block with its win rate and sample size', () => {
		expect(toItemSet(build()).blocks[0].type).toContain('55.0% WR');
		expect(toItemSet(build()).blocks[0].type).toContain('1,000 games');
	});

	it('skips sections that have no data instead of emitting empty blocks', () => {
		const result = toItemSet(
			build({
				boots: { best: null, popular: null, provisional: false },
				situational: []
			})
		);
		expect(result.blocks.map((b) => b.type.split(' —')[0])).toEqual([
			'Starting items',
			'Core build'
		]);
	});
});
