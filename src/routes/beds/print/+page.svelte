<script lang="ts">
	import { onMount } from 'svelte';
	import { activeSeason } from '$lib/stores/season';

	interface Plant {
		id: number;
		name: string;
		variety: string | null;
		matureHeight: string | null;
		spacing: string | null;
		daysToMaturity: number | null;
		plantingSeason: string | null;
		plantingDate: string | null;
		harvestDate: string | null;
		startIndoorsWeeks: number | null;
		transplantWeeks: number | null;
		directSowWeeks: number | null;
		plantType: string | null;
	}

	interface BedPlant {
		id: number;
		plant: Plant | null;
		zone: string;
		plantedDate: string | null;
	}

	interface Bed {
		id: number;
		name: string;
		caption: string | null;
		plants: BedPlant[];
	}

	let beds: Bed[] = $state([]);
	let loading = $state(true);
	let seasonName = $state('');


	function formatPlantingWhen(plant: Plant): string {
		const parts: string[] = [];
		if (plant.plantingSeason) {
			parts.push(plant.plantingSeason.charAt(0).toUpperCase() + plant.plantingSeason.slice(1));
		}
		if (plant.startIndoorsWeeks != null && plant.startIndoorsWeeks > 0) {
			parts.push(`Start indoors ${plant.startIndoorsWeeks} wks before last frost`);
		}
		if (plant.transplantWeeks != null) {
			const w = plant.transplantWeeks;
			if (w > 0) parts.push(`Transplant ${w} wks after last frost`);
			else if (w < 0) parts.push(`Transplant ${-w} wks before last frost`);
			else parts.push('Transplant at last frost');
		}
		if (plant.directSowWeeks != null) {
			const w = plant.directSowWeeks;
			if (w > 0) parts.push(`Direct sow ${w} wks after last frost`);
			else if (w < 0) parts.push(`Direct sow ${-w} wks before last frost`);
			else parts.push('Direct sow at last frost');
		}
		if (plant.plantingDate) {
			parts.push(`Planted: ${plant.plantingDate}`);
		}
		return parts.length > 0 ? parts.join(' · ') : '—';
	}

	function formatHarvest(plant: Plant): string {
		if (plant.daysToMaturity != null) {
			return `${plant.daysToMaturity} days to harvest`;
		}
		if (plant.harvestDate) {
			return `Harvest ~${plant.harvestDate}`;
		}
		return '—';
	}

	onMount(async () => {
		const season = $activeSeason;
		seasonName = season?.name ?? 'All seasons';
		const seasonParam = season?.id ? `?seasonId=${season.id}` : '';

		try {
			const bedsRes = await fetch('/api/beds');
			const bedsList = await bedsRes.json();

			const bedsWithPlants: Bed[] = [];
			for (const bed of bedsList) {
				const res = await fetch(`/api/beds/${bed.id}${seasonParam}`);
				const data = await res.json();
				bedsWithPlants.push({
					id: bed.id,
					name: bed.name,
					caption: bed.caption,
					plants: data.plants ?? []
				});
			}
			beds = bedsWithPlants;
		} catch (err) {
			console.error('Failed to load beds:', err);
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Bed Plan — Garden Planner</title>
	<style>
		@media print {
			.no-print { display: none !important; }
			body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
		}
	</style>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-6">
	<!-- Screen-only: back + print buttons -->
	<div class="no-print mb-6 flex items-center justify-between">
		<a
			href="/beds"
			class="text-sm font-medium text-slate-600 hover:text-slate-900"
		>
			← Back to Beds
		</a>
		<button
			onclick={() => window.print()}
			class="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
			</svg>
			Print
		</button>
	</div>

	{#if loading}
		<p class="py-12 text-center text-slate-500">Loading...</p>
	{:else}
		<div class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
			<h1 class="text-xl font-semibold text-slate-900">Bed Plan</h1>
			<p class="mt-1 text-sm text-slate-500">{seasonName} · Lancaster, PA</p>
			<p class="mt-1 text-xs text-slate-400">Last frost: April 28 · First frost: October 11</p>

			<div class="mt-8 space-y-8">
				{#each beds as bed (bed.id)}
					<section class="break-inside-avoid">
						<h2 class="border-b border-slate-200 pb-2 text-base font-semibold text-slate-800">
							{bed.name}
							{#if bed.caption}
								<span class="ml-2 text-sm font-normal text-slate-500">— {bed.caption}</span>
							{/if}
						</h2>

						{#if bed.plants.length === 0}
							<p class="mt-2 text-sm italic text-slate-400">No plants in this bed</p>
						{:else}
							<table class="mt-3 w-full text-sm">
								<thead>
									<tr class="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
										<th class="py-2 pr-4">Plant</th>
										<th class="py-2 pr-4">Height</th>
										<th class="py-2 pr-4">Spacing</th>
										<th class="py-2 pr-4">When to plant</th>
										<th class="py-2">Harvest</th>
									</tr>
								</thead>
								<tbody>
									{#each bed.plants as bp (bp.id)}
										{#if bp.plant}
											<tr class="border-b border-slate-50">
												<td class="py-2.5 pr-4 font-medium text-slate-900">
													{bp.plant.name}
													{#if bp.plant.variety}
														<span class="text-slate-500"> — {bp.plant.variety}</span>
													{/if}
												</td>
												<td class="py-2.5 pr-4 text-slate-600">{bp.plant.matureHeight ?? '—'}</td>
												<td class="py-2.5 pr-4 text-slate-600">{bp.plant.spacing ?? '—'}</td>
												<td class="py-2.5 pr-4 text-slate-600">{formatPlantingWhen(bp.plant)}</td>
												<td class="py-2.5 text-slate-600">{formatHarvest(bp.plant)}</td>
											</tr>
										{/if}
									{/each}
								</tbody>
							</table>
						{/if}
					</section>
				{/each}
			</div>
		</div>
	{/if}
</div>
