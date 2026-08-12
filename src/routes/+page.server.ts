import { redirect } from '@sveltejs/kit';
import { championList } from '$lib/server/opgg';
import { normalizeName } from '$lib/server/static-data';
import { DEFAULT_REGION, DEFAULT_TIER, toRegion, toTier } from '$lib/config';
import { ROLES, type Role } from '$lib/types';
import type { PageServerLoad } from './$types';

const toRole = (value: string | null): Role =>
	ROLES.some((r) => r.id === value) ? (value as Role) : 'top';

export const load: PageServerLoad = async ({ url }) => {
	const champions = await championList();
	const champ = url.searchParams.get('champ');

	// The picker submits here; send it on to the canonical /[champion]/[role].
	if (champ) {
		const match = champions.find(
			(c) => normalizeName(c.name) === normalizeName(champ) || normalizeName(c.key) === normalizeName(champ)
		);

		if (match) {
			const role = toRole(url.searchParams.get('role'));
			const region = toRegion(url.searchParams.get('region'));
			const tier = toTier(url.searchParams.get('tier'));
			const query = new URLSearchParams();
			if (region !== DEFAULT_REGION) query.set('region', region);
			if (tier !== DEFAULT_TIER) query.set('tier', tier);
			const suffix = query.size ? `?${query}` : '';
			redirect(303, `/${match.key}/${role}${suffix}`);
		}

		return {
			champions,
			champ,
			role: toRole(url.searchParams.get('role')),
			region: toRegion(url.searchParams.get('region')),
			tier: toTier(url.searchParams.get('tier')),
			error: `No champion called "${champ}".`
		};
	}

	return {
		champions,
		champ: '',
		role: 'top' as Role,
		region: toRegion(url.searchParams.get('region')),
		tier: toTier(url.searchParams.get('tier')),
		error: null
	};
};
