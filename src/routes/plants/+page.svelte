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

<div class="flex items-start gap-8">
	<div class="min-w-0 flex-1">
		<PlantLibrary
			{plants}
			images={plantImages}
			onPlantClick={handlePlantClick}
			onAddPlant={() => goto('/plants/new')}
			onFilteredChange={(filtered) => (calendarPlants = filtered)}
		/>
	</div>

	<!-- Seed Planter Reference Map -->
	{#if plants.some((p) => p.category === 'current' && p.planterRef != null)}
		<div class="w-72 flex-shrink-0 rounded-2xl border border-stone-200 bg-stone-50 p-5">
			<h2 class="font-display mb-1 text-base font-semibold text-slate-900">Seed Planter Map</h2>
			<p class="mb-4 text-sm text-stone-500">Currently planted varieties and their tray reference numbers.</p>
			<div class="flex flex-col gap-2">
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
</div>

<!-- Planting Calendar -->
<div class="mt-8">
	<PlantingCalendar plants={calendarPlants} />
</div>
