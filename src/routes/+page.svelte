<script lang="ts">
	import { ROLES, type Entry, type ItemSet, type Stats } from '$lib/types';
	import { MIN_GAMES, MIN_PICK_RATE } from '$lib/rank';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const build = $derived(data.build);

	// Writable deriveds: typing overwrites them, and they resync when a
	// navigation replaces `data`, so the box always reflects what's on screen.
	let role = $derived(data.role);
	let query = $derived(data.build?.champion.name ?? data.champ ?? '');

	const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

	/**
	 * Substring matching on a punctuation-stripped name, so "sa" finds Kai'Sa and
	 * "leesin"/"lee sin" both work. Names starting with the query rank first.
	 */
	const matches = $derived.by(() => {
		const q = normalize(query);
		if (!q) return [];
		// Nothing to suggest once the typed name is the build already on screen.
		if (build && normalize(build.champion.name) === q) return [];

		const starts = [];
		const contains = [];
		for (const champion of data.champions) {
			const name = normalize(champion.name);
			if (name.startsWith(q)) starts.push(champion);
			else if (name.includes(q)) contains.push(champion);
		}
		return [...starts, ...contains].slice(0, 8);
	});

	const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
	const games = (n: number) => n.toLocaleString('en-US');
</script>

{#snippet entry(item: Entry, extraClass = '')}
	<span class="item {extraClass}" title={item.name}>
		{#if item.icon}
			<img src={item.icon} alt="" loading="lazy" />
		{/if}
		{item.name}
	</span>
{/snippet}

{#snippet stats(s: Stats)}
	<p class="stat">
		<b>{pct(s.winRate)}</b> win rate &middot; {games(s.play)} games &middot; {pct(s.pickRate)} of
		games
	</p>
{/snippet}

{#snippet itemRow(set: ItemSet, arrows = false)}
	<div class="row">
		{#each set.items as item, i (`${item.id}-${i}`)}
			{#if arrows && i > 0}<span class="arrow">&rarr;</span>{/if}
			{@render entry(item)}
		{/each}
	</div>
	{@render stats(set)}
{/snippet}

<svelte:head>
	<title>
		{build ? `${build.champion.name} ${build.role} build` : 'LoL Builds'}
	</title>
	<meta
		name="description"
		content="Highest win rate League of Legends item builds and runes, by champion and role."
	/>
</svelte:head>

<h1><a href="/">LoL Builds</a></h1>
<p class="tagline">Highest win rate items and runes. Nothing else.</p>

<form method="GET" action="/">
	<label for="champ">Champion</label>
	<input
		id="champ"
		name="champ"
		bind:value={query}
		placeholder="Search…"
		autocomplete="off"
		required
	/>

	<label for="role">Role</label>
	<select id="role" name="role" bind:value={role}>
		{#each ROLES as option (option.id)}
			<option value={option.id}>{option.label}</option>
		{/each}
	</select>

	<button type="submit">Show build</button>
</form>

{#if matches.length}
	<!-- Suggestions are plain links, so picking one is a single click and the
	     keyboard still works: type a name and press Enter to submit the form. -->
	<div class="matches">
		{#each matches as champion (champion.id)}
			<a class="item" href="/?champ={champion.key}&role={role}">
				<img src={champion.icon} alt="" loading="lazy" />
				{champion.name}
			</a>
		{/each}
	</div>
{/if}

{#if data.error}
	<p class="error">{data.error}</p>
{/if}

{#if build}
	<div class="headline">
		<img src={build.champion.icon} alt="" />
		<div>
			<h2>{build.champion.name} &middot; {build.role}</h2>
			{#if build.roleRecord}
				<p class="stat">
					<b>{pct(build.roleRecord.winRate)}</b> win rate in this role &middot;
					{pct(build.roleRecord.pickRate)} pick rate
				</p>
			{/if}
		</div>
	</div>

	{#if build.playedRoles.length > 1}
		<p class="note">
			Also played:
			{#each build.playedRoles.filter((r) => r.role !== build.role) as other (other.role)}
				<a href="/?champ={build.champion.key}&role={other.role}">{other.role}</a>
				({pct(other.winRate)})&nbsp;
			{/each}
		</p>
	{/if}

	{#if build.runes}
		<h2>Runes</h2>
		<div class="row">
			{@render entry(build.runes.primaryTree)}
			{#each build.runes.primary as rune (rune.id)}{@render entry(rune)}{/each}
		</div>
		<div class="row">
			{@render entry(build.runes.secondaryTree)}
			{#each build.runes.secondary as rune (rune.id)}{@render entry(rune)}{/each}
		</div>
		<div class="row">
			{#each build.runes.shards as shard, i (`${shard.id}-${i}`)}
				{@render entry(shard, 'shard')}
			{/each}
		</div>
		{@render stats(build.runes)}
	{/if}

	{#if build.starters}
		<h2>Starting items</h2>
		{@render itemRow(build.starters)}
	{/if}

	{#if build.core}
		<h2>Core build</h2>
		{@render itemRow(build.core, true)}
	{/if}

	{#if build.boots}
		<h2>Boots</h2>
		{@render itemRow(build.boots)}
	{/if}

	{#if build.situational.length}
		<h2>Situational last items</h2>
		<table>
			<thead>
				<tr><th>Item</th><th>Win rate</th><th>Games</th></tr>
			</thead>
			<tbody>
				{#each build.situational as set (set.items[0]?.id)}
					<tr>
						<td>{set.items.map((i) => i.name).join(', ')}</td>
						<td>{pct(set.winRate)}</td>
						<td>{games(set.play)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}

	{#if build.spells}
		<h2>Summoner spells</h2>
		{@render itemRow(build.spells)}
	{/if}

	{#if build.skills}
		<h2>Skill order</h2>
		<p class="skills">{build.skills.order.join(' ')}</p>
		{@render stats(build.skills)}
	{/if}

	<footer>
		Patch {build.patch} &middot; ranked solo queue, world, Emerald+ &middot; stats from op.gg, icons from
		Riot Data Dragon. Builds are ranked by the lower bound of a 95% Wilson interval, and must have
		at least {MIN_GAMES} games and account for {MIN_PICK_RATE * 100}% of all games &mdash; so a rare
		fluke with a huge win rate can't top the list.
	</footer>
{:else if !data.error}
	<p class="note">Search for a champion.</p>
{/if}
