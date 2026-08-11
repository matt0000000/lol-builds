import { buildPage, championList } from '$lib/server/opgg';
import { ROLES, type Role } from '$lib/types';
import type { PageServerLoad } from './$types';

const isRole = (value: string | null): value is Role =>
	ROLES.some((r) => r.id === value);

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const champions = await championList();

	const champ = url.searchParams.get('champ');
	const roleParam = url.searchParams.get('role');
	const role: Role = isRole(roleParam) ? roleParam : 'top';

	if (!champ) {
		return { champions, champ: null, role, build: null, error: null };
	}

	setHeaders({ 'cache-control': 'public, max-age=1800' });

	try {
		const build = await buildPage(champ, role);
		return {
			champions,
			champ,
			role,
			build,
			error: build ? null : `No champion called "${champ}".`
		};
	} catch (e) {
		return {
			champions,
			champ,
			role,
			build: null,
			error: e instanceof Error ? e.message : 'Could not reach the stats source.'
		};
	}
};
