<script lang="ts">
	import Picker from '$lib/Picker.svelte';
	import { MIN_GAMES, MIN_PICK_RATE } from '$lib/rank';
	import { regionLabel, tierLabel } from '$lib/config';
	import type { Entry, ItemSet, RuneSet, Stats } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const build = $derived(data.build!);
	const query = $derived(
		(() => {
			const q = new URLSearchParams();
			if (data.region !== 'global') q.set('region', data.region);
			if (data.tier !== 'emerald_plus') q.set('tier', data.tier);
			return q.size ? `?${q}` : '';
		})()
	);

	const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
	const games = (n: number) => n.toLocaleString('en-US');
	const signed = (n: number) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}`;
</script>

{#snippet entry(item: Entry, extraClass = '')}
	<span class="item {extraClass}" title={item.name}>
		{#if item.icon}<img src={item.icon} alt="" loading="lazy" />{/if}
		{item.name}
	</span>
{/snippet}

{#snippet stats(s: Stats)}
	<p class="stat">
		<b>{pct(s.winRate)}</b> win rate &middot; {games(s.play)} games &middot; {pct(s.pickRate)} of games
	</p>
{/snippet}

{#snippet itemRow(set: ItemSet, arrows = false)}
	<div class="row">
		{#each set.items as item, i (`${item.id}-${i}`)}
			{#if arrows && i > 0}<span class="arrow">&rarr;</span>{/if}
			{@render entry(item)}
		{/each}
	</div>
{/snippet}

{#snippet runeRow(set: RuneSet)}
	<div class="row">
		{@render entry(set.primaryTree)}
		{#each set.primary as rune (rune.id)}{@render entry(rune)}{/each}
	</div>
	<div class="row">
		{@render entry(set.secondaryTree)}
		{#each set.secondary as rune (rune.id)}{@render entry(rune)}{/each}
	</div>
	<div class="row">
		{#each set.shards as shard, i (`${shard.id}-${i}`)}{@render entry(shard, 'shard')}{/each}
	</div>
{/snippet}

<svelte:head>
	<title>{build.champion.name} {build.role} build</title>
	<meta
		name="description"
		content="Highest win rate {build.champion.name} {build.role} build: items, runes and skill order."
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
{:else}
	<div class="headline">
		<img src={build.champion.icon} alt="" />
		<div>
			<h2>{build.champion.name} &middot; {build.role}</h2>
			{#if build.roleRecord}
				<p class="stat">
					<b>{pct(build.roleRecord.winRate)}</b> win rate &middot;
					{pct(build.roleRecord.pickRate)} pick rate
					{#if build.standing}
						&middot; {build.standing.kda.toFixed(2)} KDA &middot;
						{pct(build.standing.banRate)} banned
					{/if}
				</p>
			{/if}
		</div>
	</div>

	{#if build.provisional}
		<p class="warning">
			Not enough games yet on patch {build.patch} for this region and rank{#if build.roleRecord}
				&nbsp;({games(build.roleRecord.play)} recorded){/if}. The builds below fall back to whatever
			is most played, so treat the win rates as provisional &mdash; they'll settle as the patch beds
			in. Widening the rank filter to All ranks usually helps.
		</p>
	{/if}

	{#if build.playedRoles.length > 1}
		<p class="note">
			Also played:
			{#each build.playedRoles.filter((r) => r.role !== build.role) as other (other.role)}
				<a href="/{build.champion.key}/{other.role}{query}">{other.role}</a>
				({pct(other.winRate)})&nbsp;
			{/each}
		</p>
	{/if}

	{#if build.runes.best}
		<h2>Runes</h2>
		{@render runeRow(build.runes.best)}
		{@render stats(build.runes.best)}
		{#if build.runes.popular}
			<details>
				<summary>Most popular runes instead ({pct(build.runes.popular.winRate)})</summary>
				{@render runeRow(build.runes.popular)}
				{@render stats(build.runes.popular)}
			</details>
		{/if}
	{/if}

	{#if build.starters.best}
		<h2>Starting items</h2>
		{@render itemRow(build.starters.best)}
		{@render stats(build.starters.best)}
		{#if build.starters.popular}
			<p class="alt">
				Most popular: {build.starters.popular.items.map((i) => i.name).join(', ')} &mdash;
				{pct(build.starters.popular.winRate)} over {games(build.starters.popular.play)} games
			</p>
		{/if}
	{/if}

	{#if build.core.best}
		<h2>Core build</h2>
		{@render itemRow(build.core.best, true)}
		{@render stats(build.core.best)}
		{#if build.core.popular}
			<p class="alt">
				Most popular: {build.core.popular.items.map((i) => i.name).join(' → ')} &mdash;
				{pct(build.core.popular.winRate)} over {games(build.core.popular.play)} games
			</p>
		{/if}
	{/if}

	{#if build.boots.best}
		<h2>Boots</h2>
		{@render itemRow(build.boots.best)}
		{@render stats(build.boots.best)}
		{#if build.boots.popular}
			<p class="alt">
				Most popular: {build.boots.popular.items.map((i) => i.name).join(', ')} &mdash;
				{pct(build.boots.popular.winRate)} over {games(build.boots.popular.play)} games
			</p>
		{/if}
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

	{#if build.spells.best}
		<h2>Summoner spells</h2>
		{@render itemRow(build.spells.best)}
		{@render stats(build.spells.best)}
	{/if}

	{#if build.skills.best}
		<h2>Skill order</h2>
		{#if build.skillMax}
			<p class="skills">Max: {build.skillMax.join(' > ')}</p>
		{/if}
		<p class="skills">{build.skills.best.order.join(' ')}</p>
		{@render stats(build.skills.best)}
	{/if}

	{#if build.worstMatchups.length}
		<h2>Hardest matchups</h2>
		<table>
			<thead>
				<tr><th>Opponent</th><th>Win rate</th><th>Games</th></tr>
			</thead>
			<tbody>
				{#each build.worstMatchups as matchup (matchup.champion.id)}
					<tr>
						<td>
							<span class="item">
								<img src={matchup.champion.icon} alt="" loading="lazy" />
								{matchup.champion.name}
							</span>
						</td>
						<td>{pct(matchup.winRate)}</td>
						<td>{games(matchup.play)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<p class="note">Win rate for {build.champion.name} against each opponent.</p>
	{/if}

	{#if build.gameLengths.length}
		<h2>Win rate by game length</h2>
		<table>
			<thead>
				<tr><th>Game length</th><th>Win rate</th><th>vs average</th></tr>
			</thead>
			<tbody>
				{#each build.gameLengths as bucket (bucket.from)}
					<tr>
						<td>{bucket.label}</td>
						<td>{pct(bucket.winRate)}</td>
						<td class={bucket.winRate >= bucket.average ? 'up' : 'down'}>
							{signed(bucket.winRate - bucket.average)}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}

	{#if build.trend.length}
		<h2>Recent patches</h2>
		<table>
			<thead>
				<tr><th>Patch</th><th>Win rate</th></tr>
			</thead>
			<tbody>
				{#each build.trend as point (point.patch)}
					<tr><td>{point.patch}</td><td>{pct(point.winRate)}</td></tr>
				{/each}
			</tbody>
		</table>
	{/if}

	<h2>Import into the client</h2>
	<p class="note">
		<a href="/{build.champion.key}/{build.role}/itemset{query}" download>
			Download item set (JSON)
		</a>
		&mdash; save it under
		<code>Config/Champions/{build.champion.key}/Recommended/</code> in your League install, then
		restart the client.
	</p>

	<footer>
		Patch {build.patch} &middot; ranked solo queue, {regionLabel(build.region)},
		{tierLabel(build.tier)} &middot; stats from op.gg, icons from Riot Data Dragon. Builds are ranked
		by the lower bound of a 95% Wilson interval, and must have at least {MIN_GAMES} games and account
		for {MIN_PICK_RATE * 100}% of all games &mdash; so a rare fluke with a huge win rate can't top the
		list.
	</footer>
{/if}
