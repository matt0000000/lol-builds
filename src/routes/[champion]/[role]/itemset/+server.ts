import { error, json } from '@sveltejs/kit';
import { buildPage } from '$lib/server/opgg';
import { toItemSet } from '$lib/itemset';
import { toRegion, toTier } from '$lib/config';
import { ROLES, type Role } from '$lib/types';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
	if (!ROLES.some((r) => r.id === params.role)) {
		error(404, `Unknown role "${params.role}".`);
	}

	const build = await buildPage(
		params.champion,
		params.role as Role,
		toRegion(url.searchParams.get('region')),
		toTier(url.searchParams.get('tier'))
	);

	if (!build) error(404, `No champion called "${params.champion}".`);

	return json(toItemSet(build), {
		headers: {
			// Prompt a download rather than rendering the JSON in the tab.
			'content-disposition': `attachment; filename="${build.champion.key}-${build.role}.json"`
		}
	});
};
