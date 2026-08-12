<script lang="ts">
	import Picker from '$lib/Picker.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>LoL Builds</title>
	<meta
		name="description"
		content="Highest win rate League of Legends item builds and runes, by champion and role."
	/>
</svelte:head>

<h1><a href="/">LoL Builds</a></h1>
<p class="tagline">Highest win rate items and runes. Nothing else.</p>

<Picker
	champions={data.champions}
	champ={data.champ}
	role={data.role}
	region={data.region}
	tier={data.tier}
/>

{#if data.error}
	<p class="error">{data.error}</p>
{/if}

<p class="note">Pick a champion and a role.</p>
