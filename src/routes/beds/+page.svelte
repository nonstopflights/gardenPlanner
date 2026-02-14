<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import BedVisualization from '$lib/components/BedVisualization.svelte';
	import PlantLibrary from '$lib/components/PlantLibrary.svelte';
	import SpotPhotoModal from '$lib/components/SpotPhotoModal.svelte';
	import type { Bed, Plant, BedPlant } from '$lib/db/queries';
	import { goto } from '$app/navigation';
	import { activeSeason } from '$lib/stores/season';

	let beds: Bed[] = $state([]);
	let plants: Plant[] = $state([]);
	let bedPlants: Record<number, BedPlant[]> = $state({});
	let plantImages: Record<number, string> = $state({});
	let showLibrary = $state(true);
	let initialized = $state(false);
	let spotModalData: { plantId: number; bedId: number; zone: string } | null = $state(null);

	onMount(async () => {
		await loadData();
		initialized = true;
	});

	$effect(() => {
		const season = $activeSeason;
		if (initialized) {
			loadData();
		}
	});

	async function loadData() {
		const season = get(activeSeason);
		const seasonParam = season?.id ? `?seasonId=${season.id}` : '';

		// Load beds
		const bedsRes = await fetch('/api/beds');
		beds = await bedsRes.json();

		// Load plants
		const plantsRes = await fetch('/api/plants');
		plants = await plantsRes.json();

		// Load bed-plant relationships
		const bedPlantsMap: Record<number, BedPlant[]> = {};
		for (const bed of beds) {
			const res = await fetch(`/api/beds/${bed.id}${seasonParam}`);
			const bedData = await res.json();
			if (bedData.plants) {
				bedPlantsMap[bed.id] = bedData.plants;
			}
		}
		bedPlants = bedPlantsMap;

		// Load plant images
		const imagesMap: Record<number, string> = {};
		for (const plant of plants) {
			const res = await fetch(`/api/plants/${plant.id}/images`);
			const images = await res.json();
			if (images.length > 0) {
				imagesMap[plant.id] = images[0].imagePath;
			}
		}
		plantImages = imagesMap;
	}

	async function handlePlantAdd(bedId: number, plantId: number, posX: number, posY: number) {
		try {
			const season = get(activeSeason);
			const res = await fetch(`/api/beds/${bedId}/plants`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ plantId, zone: 'custom', seasonId: season?.id, posX, posY })
			});
			if (res.ok) {
				await loadData();
			}
		} catch (error) {
			console.error('Failed to add plant to bed:', error);
		}
	}

	async function handlePlantMove(bedPlantId: number, posX: number, posY: number) {
		try {
			// Find which bed this bedPlant belongs to
			let targetBedId: number | null = null;
			for (const [bedIdStr, bps] of Object.entries(bedPlants)) {
				if (bps.some((bp) => bp.id === bedPlantId)) {
					targetBedId = parseInt(bedIdStr);
					break;
				}
			}
			if (!targetBedId) return;

			await fetch(`/api/beds/${targetBedId}/plants`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ bedPlantId, posX, posY })
			});

			// Update local state immediately (no full reload needed)
			const updatedMap = { ...bedPlants };
			if (updatedMap[targetBedId]) {
				updatedMap[targetBedId] = updatedMap[targetBedId].map((bp) =>
					bp.id === bedPlantId ? { ...bp, posX, posY } : bp
				);
			}
			bedPlants = updatedMap;
		} catch (error) {
			console.error('Failed to move plant:', error);
		}
	}

	async function handlePlantRemove(bedPlantId: number) {
		try {
			// Find which bed this bedPlant belongs to
			let targetBedId: number | null = null;
			for (const [bedIdStr, bps] of Object.entries(bedPlants)) {
				if (bps.some((bp) => bp.id === bedPlantId)) {
					targetBedId = parseInt(bedIdStr);
					break;
				}
			}
			if (!targetBedId) return;

			const res = await fetch(`/api/beds/${targetBedId}/plants`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ bedPlantId })
			});
			if (res.ok) {
				await loadData();
			}
		} catch (error) {
			console.error('Failed to remove plant from bed:', error);
		}
	}

	function handleLibraryPlantClick(plant: Plant) {
		goto(`/plants/${plant.id}`);
	}

	async function handleBedUpdate(bedId: number, data: { caption?: string }) {
		try {
			const res = await fetch(`/api/beds/${bedId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});
			if (res.ok) {
				const updated = await res.json();
				beds = beds.map((b) => (b.id === bedId ? { ...b, ...updated } : b));
			}
		} catch (error) {
			console.error('Failed to update bed:', error);
		}
	}

	function handleBedPlantClick(bedId: number, plantId: number, zone: string) {
		spotModalData = { plantId, bedId, zone };
	}
</script>

<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
	<div>
		<h1 class="text-lg font-semibold text-slate-900">Garden Bed Planning</h1>
		<p class="text-sm text-slate-500">Drag plants from the library or click + to add. Move circles to position them.</p>
	</div>
	<div class="flex items-center gap-3">
		<button
			onclick={() => (showLibrary = !showLibrary)}
			class="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
		>
			{showLibrary ? 'Hide' : 'Show'} Plant Library
		</button>
		<a
			href="/plants/new"
			class="inline-flex h-9 items-center justify-center rounded-md bg-slate-900 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
		>
			+ Add Plant
		</a>
	</div>
</div>

{#if showLibrary}
	<div class="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
		<PlantLibrary
			{plants}
			images={plantImages}
			onPlantClick={handleLibraryPlantClick}
			onAddPlant={() => goto('/plants/new')}
		/>
	</div>
{/if}

<BedVisualization
	{beds}
	{plants}
	{bedPlants}
	{plantImages}
	onPlantAdd={handlePlantAdd}
	onPlantMove={handlePlantMove}
	onPlantRemove={handlePlantRemove}
	onPlantClick={handleBedPlantClick}
	onBedUpdate={handleBedUpdate}
/>

{#if spotModalData}
	{@const season = $activeSeason}
	{#if season}
		<SpotPhotoModal
			plantId={spotModalData.plantId}
			plantName={plants.find(p => p.id === spotModalData?.plantId)?.name ?? 'Plant'}
			bedId={spotModalData.bedId}
			bedName={beds.find(b => b.id === spotModalData?.bedId)?.name ?? 'Bed'}
			zone={spotModalData.zone}
			seasonId={season.id}
			seasonName={season.name}
			onClose={() => (spotModalData = null)}
		/>
	{/if}
{/if}
