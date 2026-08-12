import { error } from '@sveltejs/kit';
import { buildPage, championList } from '$lib/server/opgg';
import { toRegion, toTier } from '$lib/config';
import { ROLES, type Role } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
	if (!ROLES.some((r) => r.id === params.role)) {
		error(404, `Unknown role "${params.role}".`);
	}

	const region = toRegion(url.searchParams.get('region'));
	const tier = toTier(url.searchParams.get('tier'));
	const champions = await championList();

	// Deliberately no browser caching. Upstream responses are already cached in
	// memory, so a revalidation is cheap, and caching the rendered page meant a
	// change to region/rank/ranking wouldn't show up in an open tab for half an
	// hour — which reads as the site being broken.
	setHeaders({ 'cache-control': 'no-cache' });

	let build;
	try {
		build = await buildPage(params.champion, params.role as Role, region, tier);
	} catch (e) {
		return {
			champions,
			region,
			tier,
			role: params.role as Role,
			champ: params.champion,
			build: null,
			error: e instanceof Error ? e.message : 'Could not reach the stats source.'
		};
	}

	if (!build) error(404, `No champion called "${params.champion}".`);

	return {
		champions,
		region,
		tier,
		role: build.role,
		champ: build.champion.name,
		build,
		error: null
	};
};
