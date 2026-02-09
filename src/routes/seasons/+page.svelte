<script lang="ts">
	import { onMount } from 'svelte';
	import { activeSeason, switchSeason, loadSeasons } from '$lib/stores/season';
	import type { Season } from '$lib/db/queries';

	let seasons: Season[] = $state([]);
	let loading = $state(true);

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		const res = await fetch('/api/seasons');
		seasons = await res.json();
		loading = false;
	}

	async function handleActivate(seasonId: number) {
		await switchSeason(seasonId);
		await loadData();
	}

	function formatDate(date: string | null): string {
		if (!date) return '';
		return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function getSeasonTypeColor(type: string): string {
		switch (type) {
			case 'spring':
				return 'border-emerald-200 bg-emerald-50 text-emerald-700';
			case 'summer':
				return 'border-amber-200 bg-amber-50 text-amber-700';
			case 'fall':
				return 'border-orange-200 bg-orange-50 text-orange-700';
			case 'winter':
				return 'border-sky-200 bg-sky-50 text-sky-700';
			default:
				return 'border-slate-200 bg-slate-50 text-slate-700';
		}
	}
</script>

<div>
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-semibold text-slate-900">Seasons</h1>
			<p class="mt-1 text-sm text-slate-500">Browse and manage your growing seasons.</p>
		</div>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-20">
			<p class="text-sm text-slate-500">Loading seasons...</p>
		</div>
	{:else if seasons.length === 0}
		<div
			class="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm"
		>
			<p class="text-sm text-slate-500">No seasons yet. Create your first season from the header.</p>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each seasons as season (season.id)}
				<div
					class="rounded-2xl border bg-white p-5 shadow-sm transition {season.isActive
						? 'border-slate-400 ring-1 ring-slate-400'
						: 'border-slate-200 hover:shadow-md'}"
				>
					<div class="mb-3 flex items-start justify-between">
						<div>
							<h3 class="text-lg font-semibold text-slate-900">{season.name}</h3>
							<span
								class="mt-1 inline-block rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide {getSeasonTypeColor(
									season.type
								)}"
							>
								{season.type}
							</span>
						</div>
						{#if season.isActive}
							<span
								class="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"
							>
								Active
							</span>
						{/if}
					</div>

					<div class="space-y-1 text-sm text-slate-600">
						<p>Year: {season.year}</p>
						{#if season.startDate || season.endDate}
							<p>
								{formatDate(season.startDate)}{season.startDate && season.endDate
									? ' - '
									: ''}{formatDate(season.endDate)}
							</p>
						{/if}
					</div>

					{#if !season.isActive}
						<button
							onclick={() => handleActivate(season.id)}
							class="mt-4 inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
						>
							Switch to this season
						</button>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
