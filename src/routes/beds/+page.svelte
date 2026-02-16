<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import BedVisualization from '$lib/components/BedVisualization.svelte';
	import BedOverview from '$lib/components/BedOverview.svelte';
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
	let selectedPlant: Plant | null = $state(null);

	// Hover preview tooltip state (rendered at page level to escape sidebar stacking context)
	let hoverPlant: Plant | null = $state(null);
	let hoverPos: { x: number; y: number } | null = $state(null);

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

		const bedsRes = await fetch('/api/beds');
		beds = await bedsRes.json();

		const plantsRes = await fetch('/api/plants');
		plants = await plantsRes.json();

		const bedPlantsMap: Record<number, BedPlant[]> = {};
		for (const bed of beds) {
			const res = await fetch(`/api/beds/${bed.id}${seasonParam}`);
			const bedData = await res.json();
			if (bedData.plants) {
				bedPlantsMap[bed.id] = bedData.plants;
			}
		}
		bedPlants = bedPlantsMap;

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

	function handlePlantSelect(plant: Plant | null) {
		selectedPlant = plant;
	}

	function scrollToBed(bedId: number) {
		const el = document.getElementById(`bed-${bedId}`);
		el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}

	function handlePlantHover(plant: Plant | null, pos: { x: number; y: number } | null) {
		hoverPlant = plant;
		hoverPos = pos;
	}

	function buildPlantSummary(plant: Plant): string {
		const parts: string[] = [];
		if (plant.matureHeight) parts.push(`Height: ${plant.matureHeight}`);
		if (plant.spacing) parts.push(`Spacing: ${plant.spacing}`);
		if (plant.sunRequirements) parts.push(plant.sunRequirements);
		if (plant.waterNeeds) parts.push(`${plant.waterNeeds} water`);
		if (plant.daysToMaturity) parts.push(`${plant.daysToMaturity} days to harvest`);
		if (plant.plantingSeason) parts.push(`Plant in ${plant.plantingSeason}`);
		return parts.join(' · ');
	}

	let tooltipStyle = $derived.by(() => {
		if (!hoverPos) return '';
		const pad = 12;
		const cardW = 280;
		const cardH = 260;
		let x = hoverPos.x + pad;
		let y = hoverPos.y - cardH / 2;
		if (typeof window !== 'undefined') {
			if (x + cardW > window.innerWidth - pad) x = hoverPos.x - cardW - pad;
			if (y < pad) y = pad;
			if (y + cardH > window.innerHeight - pad) y = window.innerHeight - cardH - pad;
		}
		return `left: ${x}px; top: ${y}px;`;
	});
</script>

<!-- Header -->
<div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
	<div>
		<h1 class="text-lg font-semibold text-slate-900">Garden Bed Planning</h1>
		<p class="text-sm text-slate-500">Drag plants from the library or click + to add. Move circles to position them.</p>
	</div>
	<div class="flex items-center gap-3">
		<button
			onclick={() => (showLibrary = !showLibrary)}
			class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
		>
			<svg
				class="h-4 w-4 transition-transform {showLibrary ? '' : 'rotate-180'}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
			{showLibrary ? 'Hide' : 'Show'} Plants
		</button>
		<a
			href="/plants/new"
			class="inline-flex h-9 items-center justify-center rounded-md bg-slate-900 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
		>
			+ Add Plant
		</a>
	</div>
</div>

<!-- Desktop: sidebar + main content | Mobile: stacked -->
<div class="flex gap-4">
	<!-- Sidebar (lg+) / Stacked section (mobile) -->
	{#if showLibrary}
		<aside
			class="shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300
				w-full lg:w-[340px] lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start"
		>
			<div class="h-full lg:overflow-y-auto">
				<PlantLibrary
					{plants}
					images={plantImages}
					onPlantClick={handleLibraryPlantClick}
					onAddPlant={() => goto('/plants/new')}
					onPlantSelect={handlePlantSelect}
					onPlantHover={handlePlantHover}
					printBedPlanHref="/beds/print"
					compact={true}
				/>
			</div>
		</aside>
	{/if}

	<!-- Main content area -->
	<div class="min-w-0 flex-1">
		<!-- Bed overview quick-jump nav -->
		{#if beds.length > 0}
			<BedOverview
				{beds}
				{bedPlants}
				onBedClick={scrollToBed}
			/>
		{/if}

		<BedVisualization
			{beds}
			{plants}
			{bedPlants}
			{plantImages}
			highlightedPlant={selectedPlant}
			sidebarOpen={showLibrary}
			onPlantAdd={handlePlantAdd}
			onPlantMove={handlePlantMove}
			onPlantRemove={handlePlantRemove}
			onPlantClick={handleBedPlantClick}
			onBedUpdate={handleBedUpdate}
		/>
	</div>
</div>

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

<!-- Plant hover preview tooltip (rendered at page level to escape sidebar stacking context) -->
{#if hoverPlant && hoverPos}
	<div
		class="pointer-events-none fixed z-[100] w-[280px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
		style={tooltipStyle}
	>
		{#if plantImages[hoverPlant.id]}
			<img
				src={plantImages[hoverPlant.id]}
				alt={hoverPlant.name}
				class="mb-2 h-32 w-full rounded-lg object-cover"
			/>
		{/if}
		<p class="text-sm font-semibold text-slate-900">
			{hoverPlant.name}
			{#if hoverPlant.variety}
				<span class="font-normal text-slate-500"> — {hoverPlant.variety}</span>
			{/if}
		</p>
		{#if hoverPlant.plantType}
			<p class="mt-0.5 text-xs font-medium uppercase tracking-wide text-purple-600">{hoverPlant.plantType}</p>
		{/if}
		<p class="mt-1.5 text-xs leading-relaxed text-slate-500">{buildPlantSummary(hoverPlant)}</p>
		<p class="mt-2 text-[10px] text-slate-400">Click to view details</p>
	</div>
{/if}
