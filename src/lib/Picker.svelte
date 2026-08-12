<script lang="ts">
	import { REGIONS, TIERS, type Region, type Tier } from '$lib/config';
	import { ROLES, type Champion, type Role } from '$lib/types';

	interface Props {
		champions: Champion[];
		champ?: string;
		role?: Role;
		region: Region;
		tier: Tier;
	}

	let { champions, champ = '', role = 'top', region, tier }: Props = $props();
</script>

<!-- Plain GET form: the server redirects to /[champion]/[role], so this works
     with JavaScript disabled and every build stays linkable. -->
<form method="GET" action="/">
	<label for="champ">Champion</label>
	<input
		id="champ"
		name="champ"
		list="champion-list"
		value={champ}
		placeholder="Type a name…"
		autocomplete="off"
		required
	/>
	<datalist id="champion-list">
		{#each champions as champion (champion.id)}
			<option value={champion.name}></option>
		{/each}
	</datalist>

	<label for="role">Role</label>
	<select id="role" name="role">
		{#each ROLES as option (option.id)}
			<option value={option.id} selected={option.id === role}>{option.label}</option>
		{/each}
	</select>

	<label for="region">Region</label>
	<select id="region" name="region">
		{#each REGIONS as option (option.id)}
			<option value={option.id} selected={option.id === region}>{option.label}</option>
		{/each}
	</select>

	<label for="tier">Rank</label>
	<select id="tier" name="tier">
		{#each TIERS as option (option.id)}
			<option value={option.id} selected={option.id === tier}>{option.label}</option>
		{/each}
	</select>

	<button type="submit">Show build</button>
</form>
