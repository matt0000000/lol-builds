/**
 * Regions and ranks the stats source accepts. Every value here was verified
 * against the API — it rejects anything it doesn't recognise with a 422, so a
 * typo fails loudly rather than silently serving the wrong data.
 */

export const REGIONS = [
	{ id: 'global', label: 'World' },
	{ id: 'kr', label: 'Korea' },
	{ id: 'na', label: 'North America' },
	{ id: 'euw', label: 'EU West' },
	{ id: 'eune', label: 'EU Nordic & East' },
	{ id: 'br', label: 'Brazil' },
	{ id: 'jp', label: 'Japan' },
	{ id: 'oce', label: 'Oceania' },
	{ id: 'las', label: 'LAS' },
	{ id: 'lan', label: 'LAN' },
	{ id: 'ru', label: 'Russia' },
	{ id: 'tr', label: 'Türkiye' },
	{ id: 'vn', label: 'Vietnam' },
	{ id: 'tw', label: 'Taiwan' },
	{ id: 'sg', label: 'Singapore' },
	{ id: 'ph', label: 'Philippines' },
	{ id: 'th', label: 'Thailand' },
	{ id: 'sea', label: 'SEA' },
	{ id: 'me', label: 'Middle East' }
] as const;

export const TIERS = [
	{ id: 'all', label: 'All ranks' },
	{ id: 'iron', label: 'Iron' },
	{ id: 'bronze', label: 'Bronze' },
	{ id: 'silver', label: 'Silver' },
	{ id: 'gold', label: 'Gold' },
	{ id: 'platinum', label: 'Platinum' },
	{ id: 'emerald', label: 'Emerald' },
	{ id: 'diamond', label: 'Diamond' },
	{ id: 'master', label: 'Master' },
	{ id: 'grandmaster', label: 'Grandmaster' },
	{ id: 'challenger', label: 'Challenger' },
	{ id: 'gold_plus', label: 'Gold+' },
	{ id: 'platinum_plus', label: 'Platinum+' },
	{ id: 'emerald_plus', label: 'Emerald+' },
	{ id: 'diamond_plus', label: 'Diamond+' },
	{ id: 'master_plus', label: 'Master+' }
] as const;

export type Region = (typeof REGIONS)[number]['id'];
export type Tier = (typeof TIERS)[number]['id'];

export const DEFAULT_REGION: Region = 'global';
export const DEFAULT_TIER: Tier = 'emerald_plus';

export function toRegion(value: string | null | undefined): Region {
	return REGIONS.some((r) => r.id === value) ? (value as Region) : DEFAULT_REGION;
}

export function toTier(value: string | null | undefined): Tier {
	return TIERS.some((t) => t.id === value) ? (value as Tier) : DEFAULT_TIER;
}

export function regionLabel(id: Region): string {
	return REGIONS.find((r) => r.id === id)?.label ?? id;
}

export function tierLabel(id: Tier): string {
	return TIERS.find((t) => t.id === id)?.label ?? id;
}
