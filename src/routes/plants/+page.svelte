<script lang="ts">
	import { onMount } from 'svelte';
	import PlantLibrary from '$lib/components/PlantLibrary.svelte';
	import PlantingCalendar from '$lib/components/PlantingCalendar.svelte';
	import type { Plant } from '$lib/db/queries';
	import { goto } from '$app/navigation';

	let plants: Plant[] = $state([]);
	let plantImages: Record<number, string> = $state({});

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
	}

	function handlePlantClick(plant: Plant) {
		goto(`/plants/${plant.id}`);
	}
</script>

<div class="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
	<p class="text-sm font-medium text-blue-900">
		Lancaster, PA Frost Dates
		<span class="mx-2 text-blue-300">|</span>
		Last Frost: <span class="font-semibold">April 28</span>
		<span class="mx-2 text-blue-300">|</span>
		First Frost: <span class="font-semibold">October 11</span>
	</p>
</div>

<div class="mb-6">
	<h1 class="text-lg font-semibold text-slate-900">Plant Library</h1>
	<p class="text-sm text-slate-500">Curate varieties before placing them in beds.</p>
</div>

<PlantLibrary
	{plants}
	images={plantImages}
	onPlantClick={handlePlantClick}
	onAddPlant={() => goto('/plants/new')}
/>

<!-- Planting Calendar -->
<div class="mt-8">
	<PlantingCalendar {plants} />
</div>
