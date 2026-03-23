<script lang="ts">
	import { onMount } from 'svelte';
	import PlantLibrary from '$lib/components/PlantLibrary.svelte';
	import PlantingCalendar from '$lib/components/PlantingCalendar.svelte';
	import type { Plant } from '$lib/db/queries';
	import { goto } from '$app/navigation';

	let plants: Plant[] = $state([]);
	let plantImages: Record<number, string> = $state({});
	let calendarPlants: Plant[] = $state([]);
	let seedMapSort = $state<'ref' | 'name'>('ref');
	let seedMapOpen = $state(false);

	let currentPlants = $derived(plants.filter((p) => p.category === 'current'));
	let wantPlants = $derived(plants.filter((p) => p.category === 'want'));
	let pastPlants = $derived(plants.filter((p) => p.category === 'past'));
	let seededPlants = $derived(plants.filter((p) => p.haveSeeds));
	let mappedPlants = $derived(currentPlants.filter((p) => p.planterRef != null));
	let sortedMappedPlants = $derived(
		[...mappedPlants].sort((a, b) =>
			seedMapSort === 'name'
				? a.name.localeCompare(b.name)
				: (a.planterRef ?? 0) - (b.planterRef ?? 0)
		)
	);

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

<div class="space-y-8">
	<section class="overflow-hidden rounded-[2rem] border border-stone-200 bg-[linear-gradient(145deg,rgba(248,250,252,0.98),rgba(255,251,235,0.92))] shadow-[0_24px_80px_-56px_rgba(15,23,42,0.35)]">
		<div class="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1fr)_16rem] lg:px-8 lg:py-8">
			<div class="min-w-0">
				<p class="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">Plants Dashboard</p>
				<h1 class="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
					Your plant library, without the visual noise.
				</h1>
				<p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
					Browse your current beds, wishlist, and archive from one calmer workspace. The dashboard now leans on spacing, grouping, and quieter surfaces instead of heavy color effects.
				</p>
				{#if mappedPlants.length > 0}
					<div class="mt-5">
						<button
							type="button"
							onclick={() => (seedMapOpen = true)}
							class="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/90 px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:border-stone-400 hover:bg-white"
						>
							<span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">#</span>
							Seed Planter Map
							<span class="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-500">
								{mappedPlants.length}
							</span>
						</button>
					</div>
				{/if}
			</div>

			<div class="grid grid-cols-2 gap-3 self-start">
				<div class="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 backdrop-blur">
					<p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">Current</p>
					<p class="mt-2 text-2xl font-semibold text-slate-900">{currentPlants.length}</p>
				</div>
				<div class="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 backdrop-blur">
					<p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">Wishlist</p>
					<p class="mt-2 text-2xl font-semibold text-slate-900">{wantPlants.length}</p>
				</div>
				<div class="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 backdrop-blur">
					<p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">Saved Seeds</p>
					<p class="mt-2 text-2xl font-semibold text-slate-900">{seededPlants.length}</p>
				</div>
				<div class="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 backdrop-blur">
					<p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">Past</p>
					<p class="mt-2 text-2xl font-semibold text-slate-900">{pastPlants.length}</p>
				</div>
			</div>
		</div>
	</section>

	<div class="min-w-0">
		<div class="min-w-0 flex-1">
			<PlantLibrary
				{plants}
				images={plantImages}
				onPlantClick={handlePlantClick}
				onAddPlant={() => goto('/plants/new')}
				onFilteredChange={(filtered) => (calendarPlants = filtered)}
			/>
		</div>
	</div>
</div>

<!-- Planting Calendar -->
<div class="mt-8">
	<PlantingCalendar plants={calendarPlants} />
</div>

{#if mappedPlants.length > 0}
	<div class="pointer-events-none fixed inset-0 z-40 {seedMapOpen ? '' : 'hidden'}">
		<button
			type="button"
			class="pointer-events-auto absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
			onclick={() => (seedMapOpen = false)}
			aria-label="Close seed planter map"
		></button>

		<aside
			class="pointer-events-auto absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-stone-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(250,250,249,0.97))] shadow-[0_28px_80px_-32px_rgba(15,23,42,0.45)] transition duration-300 {seedMapOpen ? 'translate-x-0' : 'translate-x-full'}"
			aria-label="Seed planter map drawer"
		>
			<div class="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-5 sm:px-6">
				<div>
					<p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Quick Lookup</p>
					<h2 class="mt-1 font-display text-lg font-semibold text-slate-900">Seed Planter Map</h2>
					<p class="mt-2 text-sm leading-5 text-slate-600">
						Open any tray entry to jump straight to that plant.
					</p>
				</div>
				<button
					type="button"
					onclick={() => (seedMapOpen = false)}
					class="rounded-full border border-stone-200 bg-white p-2 text-stone-500 transition hover:border-stone-300 hover:text-slate-700"
					aria-label="Close drawer"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<div class="border-b border-stone-200 px-5 py-4 sm:px-6">
				<div class="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white/90 p-1">
					<button
						onclick={() => (seedMapSort = 'ref')}
						class="flex-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition {seedMapSort === 'ref' ? 'bg-slate-900 text-white shadow-sm' : 'text-stone-500 hover:text-slate-700'}"
					>
						By #
					</button>
					<button
						onclick={() => (seedMapSort = 'name')}
						class="flex-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition {seedMapSort === 'name' ? 'bg-slate-900 text-white shadow-sm' : 'text-stone-500 hover:text-slate-700'}"
					>
						A-Z
					</button>
				</div>
			</div>

			<div class="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
				<div class="mb-4 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-600">
					<span class="font-semibold text-slate-900">{mappedPlants.length}</span> mapped planter references
				</div>

				<div class="flex flex-col gap-2.5">
					{#each sortedMappedPlants as plant (plant.id)}
						<a
							href="/plants/{plant.id}"
							onclick={() => (seedMapOpen = false)}
							class="group flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3.5 py-3 transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-white hover:shadow-[0_18px_38px_-30px_rgba(15,23,42,0.35)]"
						>
							<span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-800">
								{plant.planterRef}
							</span>
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-semibold leading-tight text-slate-800">{plant.name}</p>
								{#if plant.variety}
									<p class="truncate text-xs text-slate-500">{plant.variety}</p>
								{/if}
							</div>
							<span class="text-stone-300 transition group-hover:text-stone-500">→</span>
						</a>
					{/each}
				</div>
			</div>
		</aside>
	</div>
{/if}
