<script lang="ts">
	import { onMount } from 'svelte';
	import PlantLibrary from '$lib/components/PlantLibrary.svelte';
	import PlantingCalendar from '$lib/components/PlantingCalendar.svelte';
	import type { Plant } from '$lib/db/queries';
	import { goto } from '$app/navigation';

	let plants: Plant[] = $state([]);
	let plantImages: Record<number, string> = $state({});
	let calendarPlants: Plant[] = $state([]);

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		const res = await fetch('/api/plants');
		plants = await res.json();

		// Load images
		const imagesMap: Record<number, string> = {};
		for (const plant of plants) {
			const imgRes = await fetch(`/api/plants/${plant.id}/images`);
			const images = await imgRes.json();
			if (images.length > 0) {
				imagesMap[plant.id] = images[0].imagePath;
			}
		}
		plantImages = imagesMap;

		// Auto-classify untagged plants in background
		const hasUntagged = plants.some((p) => !p.plantType);
		if (hasUntagged) {
			fetch('/api/plants/classify', { method: 'POST' }).then(async (classifyRes) => {
				if (classifyRes.ok) {
					const result = await classifyRes.json();
					if (result.classified > 0) {
						// Reload to show new types
						const refreshRes = await fetch('/api/plants');
						plants = await refreshRes.json();
					}
				}
			});
		}
	}

	function handlePlantClick(plant: Plant) {
		goto(`/plants/${plant.id}`);
	}
</script>

<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
	<div>
		<h1 class="font-display text-2xl font-semibold text-slate-900">Plant Library</h1>
		<p class="mt-0.5 text-sm text-stone-500">Curate varieties before placing them in beds.</p>
	</div>
	<div class="flex flex-shrink-0 items-center gap-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-600">
		<span class="flex items-center gap-1.5">
			<span class="h-2 w-2 rounded-full bg-red-300"></span>
			Last frost <strong class="font-semibold text-stone-800">Apr 28</strong>
		</span>
		<span class="text-stone-300">·</span>
		<span class="flex items-center gap-1.5">
			<span class="h-2 w-2 rounded-full bg-blue-300"></span>
			First frost <strong class="font-semibold text-stone-800">Oct 11</strong>
		</span>
	</div>
</div>

<PlantLibrary
	{plants}
	images={plantImages}
	onPlantClick={handlePlantClick}
	onAddPlant={() => goto('/plants/new')}
	onFilteredChange={(filtered) => (calendarPlants = filtered)}
/>

<!-- Seed Planter Reference Map -->
{#if plants.some((p) => p.category === 'current' && p.planterRef != null)}
	<div class="mt-8 rounded-2xl border border-stone-200 bg-stone-50 p-6">
		<h2 class="font-display mb-1 text-base font-semibold text-slate-900">Seed Planter Map</h2>
		<p class="mb-4 text-sm text-stone-500">Currently planted varieties and their tray reference numbers.</p>
		<div class="flex flex-wrap gap-3">
			{#each plants
				.filter((p) => p.category === 'current' && p.planterRef != null)
				.sort((a, b) => (a.planterRef ?? 0) - (b.planterRef ?? 0)) as plant (plant.id)}
			<a
				href="/plants/{plant.id}"
				class="flex items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm transition hover:border-emerald-300 hover:bg-emerald-50"
			>
					<span class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
						{plant.planterRef}
					</span>
					<div class="min-w-0">
						<p class="font-medium text-slate-800 leading-tight">{plant.name}</p>
						{#if plant.variety}
							<p class="text-xs text-slate-400 truncate">{plant.variety}</p>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	</div>
{/if}

<!-- Planting Calendar -->
<div class="mt-8">
	<PlantingCalendar plants={calendarPlants} />
</div>
