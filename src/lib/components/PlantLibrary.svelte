<script lang="ts">
	import PlantCard from './PlantCard.svelte';
	import type { Plant } from '$lib/db/queries';

	interface Props {
		plants: Plant[];
		images: Record<number, string>;
		onPlantClick: (plant: Plant) => void;
		onAddPlant: () => void;
	}

	let { plants, images, onPlantClick, onAddPlant }: Props = $props();

	let searchQuery = $state('');
	let selectedCategory = $state<'all' | 'past' | 'want' | 'current'>('all');

	const filteredPlants = $derived(
		plants.filter((plant) => {
			const matchesSearch =
				plant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				plant.variety?.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesCategory = selectedCategory === 'all' || plant.category === selectedCategory;
			return matchesSearch && matchesCategory;
		})
	);
</script>

<div class="p-4">
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<input
			type="text"
			placeholder="Search plants..."
			bind:value={searchQuery}
			class="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 sm:max-w-sm"
		/>
		<button
			onclick={onAddPlant}
			class="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
		>
			+ Add Plant
		</button>
	</div>

	<div class="mb-6 flex flex-wrap gap-2">
		<button
			onclick={() => (selectedCategory = 'all')}
			class="rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition {selectedCategory === 'all' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'}"
		>
			All
		</button>
		<button
			onclick={() => (selectedCategory = 'past')}
			class="rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition {selectedCategory === 'past' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'}"
		>
			Past
		</button>
		<button
			onclick={() => (selectedCategory = 'want')}
			class="rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition {selectedCategory === 'want' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'}"
		>
			Want to Plant
		</button>
		<button
			onclick={() => (selectedCategory = 'current')}
			class="rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition {selectedCategory === 'current' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'}"
		>
			Currently Planted
		</button>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
		{#each filteredPlants as plant (plant.id)}
			<PlantCard plant={plant} imageUrl={images[plant.id]} onClick={() => onPlantClick(plant)} />
		{/each}
	</div>

	{#if filteredPlants.length === 0}
		<div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
			<p>No plants found. Add your first plant to get started!</p>
		</div>
	{/if}
</div>
