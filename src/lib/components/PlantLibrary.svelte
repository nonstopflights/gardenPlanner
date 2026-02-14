<script lang="ts">
	import PlantCard from './PlantCard.svelte';
	import type { Plant } from '$lib/db/queries';

	interface Props {
		plants: Plant[];
		images: Record<number, string>;
		onPlantClick: (plant: Plant) => void;
		onAddPlant: () => void;
		onFilteredChange?: (filtered: Plant[]) => void;
	}

	let { plants, images, onPlantClick, onAddPlant, onFilteredChange }: Props = $props();

	let searchQuery = $state('');
	let selectedCategory = $state<'all' | 'past' | 'want' | 'current'>('all');
	let selectedType = $state<string>('all');
	let collapsedTypes = $state<Set<string>>(new Set());

	const availableTypes = $derived(() => {
		const types = new Set<string>();
		for (const plant of plants) {
			if (plant.plantType) types.add(plant.plantType);
		}
		return [...types].sort();
	});

	const filteredPlants = $derived(
		plants.filter((plant) => {
			const matchesSearch =
				plant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				plant.variety?.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesCategory = selectedCategory === 'all' || plant.category === selectedCategory;
			const matchesType = selectedType === 'all' || plant.plantType === selectedType;
			return matchesSearch && matchesCategory && matchesType;
		})
	);

	const groupedPlants = $derived.by(() => {
		const grouped = new Map<string, Plant[]>();
		for (const plant of filteredPlants) {
			const type = plant.plantType?.trim() || 'Uncategorized';
			const list = grouped.get(type) ?? [];
			list.push(plant);
			grouped.set(type, list);
		}

		return [...grouped.entries()]
			.sort(([a], [b]) => {
				if (a === 'Uncategorized') return 1;
				if (b === 'Uncategorized') return -1;
				return a.localeCompare(b);
			})
			.map(([type, groupedTypePlants]) => ({ type, plants: groupedTypePlants }));
	});

	function toggleTypeSection(type: string) {
		const next = new Set(collapsedTypes);
		if (next.has(type)) {
			next.delete(type);
		} else {
			next.add(type);
		}
		collapsedTypes = next;
	}

	function openAll() {
		collapsedTypes = new Set();
	}

	function closeAll() {
		collapsedTypes = new Set(groupedPlants.map((g) => g.type));
	}

	function sectionId(type: string): string {
		return `plant-type-${type.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
	}

	$effect(() => {
		onFilteredChange?.(filteredPlants);
	});
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

	<div class="mb-6 flex flex-wrap items-center gap-2">
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

		{#if availableTypes().length > 0}
			<span class="mx-1 text-slate-300">|</span>
			<select
				bind:value={selectedType}
				class="h-8 rounded-full border border-slate-200 bg-white px-3 pr-7 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400"
			>
				<option value="all">All Types</option>
				{#each availableTypes() as type}
					<option value={type}>{type}</option>
				{/each}
			</select>
		{/if}

		{#if groupedPlants.length > 0}
			<span class="mx-1 text-slate-300">|</span>
			<button
				onclick={openAll}
				class="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
			>
				Open all
			</button>
			<button
				onclick={closeAll}
				class="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
			>
				Close all
			</button>
		{/if}
	</div>

	<div class="space-y-5">
		{#each groupedPlants as group (group.type)}
			<section class="rounded-xl border border-slate-200 bg-slate-50/40 p-3 sm:p-4">
				<button
					type="button"
					onclick={() => toggleTypeSection(group.type)}
					class="mb-3 flex w-full items-center justify-between rounded-md px-1 py-1 text-left transition hover:bg-slate-100/70"
					aria-expanded={!collapsedTypes.has(group.type)}
					aria-controls={sectionId(group.type)}
				>
					<div class="flex items-center gap-2">
						<h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.type}</h3>
						<span class="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
							{group.plants.length}
						</span>
					</div>
					<svg
						class="h-4 w-4 text-slate-400 transition-transform {collapsedTypes.has(group.type) ? '' : 'rotate-180'}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>

				{#if !collapsedTypes.has(group.type)}
					<div id={sectionId(group.type)} class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{#each group.plants as plant (plant.id)}
							<PlantCard plant={plant} imageUrl={images[plant.id]} onClick={() => onPlantClick(plant)} />
						{/each}
					</div>
				{/if}
			</section>
		{/each}
	</div>

	{#if filteredPlants.length === 0}
		<div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
			<p>No plants found. Add your first plant to get started!</p>
		</div>
	{/if}
</div>
