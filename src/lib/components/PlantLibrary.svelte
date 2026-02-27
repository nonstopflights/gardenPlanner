<script lang="ts">
	import PlantCard from './PlantCard.svelte';
	import PlantListItem from './PlantListItem.svelte';
	import type { Plant } from '$lib/db/queries';

	interface Props {
		plants: Plant[];
		images: Record<number, string>;
		onPlantClick: (plant: Plant) => void;
		onAddPlant: () => void;
		onFilteredChange?: (filtered: Plant[]) => void;
		onPlantSelect?: (plant: Plant | null) => void;
		onPlantHover?: (plant: Plant | null, pos: { x: number; y: number } | null) => void;
		printBedPlanHref?: string;
		compact?: boolean;
	}

	let {
		plants,
		images,
		onPlantClick,
		onAddPlant,
		onFilteredChange,
		onPlantSelect,
		onPlantHover,
		printBedPlanHref,
		compact = false
	}: Props = $props();

	let searchQuery = $state('');
	let selectedCategory = $state<'all' | 'past' | 'want' | 'current'>('all');
	let selectedType = $state<string>('all');
	let collapsedTypes = $state<Set<string>>(new Set());
	let selectedPlantId = $state<number | null>(null);
	let seedsView = $state(false);

	// Hover preview state (compact mode only)
	let hoverActive = false;
	let hoverTimer: ReturnType<typeof setTimeout> | null = null;

	function handleItemMouseEnter(e: MouseEvent, plant: Plant) {
		handlePlantHover(plant);
		if (!compact) return;
		clearHoverPreview();
		hoverTimer = setTimeout(() => {
			hoverActive = true;
			onPlantHover?.(plant, { x: e.clientX, y: e.clientY });
		}, 400);
	}

	function handleItemMouseMove(e: MouseEvent) {
		if (hoverActive && selectedPlantId != null) {
			const plant = plants.find((p) => p.id === selectedPlantId);
			if (plant) onPlantHover?.(plant, { x: e.clientX, y: e.clientY });
		}
	}

	function handleItemMouseLeave() {
		handlePlantLeave();
		clearHoverPreview();
	}

	function clearHoverPreview() {
		if (hoverTimer) {
			clearTimeout(hoverTimer);
			hoverTimer = null;
		}
		hoverActive = false;
		onPlantHover?.(null, null);
	}

	let pillSize = $derived(compact ? 'px-2.5 py-1 text-[10px]' : 'px-4 py-1.5 text-xs');

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

	// In compact mode, start with all sections collapsed
	$effect(() => {
		if (compact && groupedPlants.length > 0 && collapsedTypes.size === 0) {
			collapsedTypes = new Set(groupedPlants.map((g) => g.type));
		}
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

	function handlePlantHover(plant: Plant) {
		selectedPlantId = plant.id;
		onPlantSelect?.(plant);
	}

	function handlePlantLeave() {
		selectedPlantId = null;
		onPlantSelect?.(null);
	}

	$effect(() => {
		onFilteredChange?.(filteredPlants);
	});
</script>

<div class="{compact ? 'flex flex-col h-full' : 'p-4'}">
	<!-- Sticky filter controls -->
	<div class="{compact ? 'sticky top-0 z-10 bg-white border-b border-slate-100 p-3 space-y-3' : 'mb-6 space-y-6'}">
		<!-- Search + Add -->
		<div class="{compact ? 'flex items-center gap-2' : 'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'}">
			<input
				type="text"
				placeholder="Search plants..."
				bind:value={searchQuery}
				class="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 {compact ? '' : 'h-10 sm:max-w-sm'}"
			/>
			{#if !compact}
				<button
					onclick={onAddPlant}
					class="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
				>
					+ Add Plant
				</button>
			{/if}
		</div>

		<!-- Category + type filters -->
		<div class="flex flex-wrap items-center gap-1.5 {compact ? '' : 'gap-2'}">
			<button
				onclick={() => (selectedCategory = 'all')}
				class="rounded-full border font-semibold uppercase tracking-wide transition {pillSize} {selectedCategory === 'all' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'}"
			>
				All
			</button>
			<button
				onclick={() => (selectedCategory = 'past')}
				class="rounded-full border font-semibold uppercase tracking-wide transition {pillSize} {selectedCategory === 'past' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'}"
			>
				Past
			</button>
			<button
				onclick={() => (selectedCategory = 'want')}
				class="rounded-full border font-semibold uppercase tracking-wide transition {pillSize} {selectedCategory === 'want' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'}"
			>
				Want
			</button>
			<button
				onclick={() => (selectedCategory = 'current')}
				class="rounded-full border font-semibold uppercase tracking-wide transition {pillSize} {selectedCategory === 'current' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'}"
			>
				Current
			</button>

			{#if availableTypes().length > 0}
				<span class="mx-0.5 text-slate-300">|</span>
				<select
					bind:value={selectedType}
					class="h-7 rounded-full border border-slate-200 bg-white px-2 pr-6 text-[10px] font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 {compact ? '' : 'h-8 px-3 pr-7 text-xs'}"
				>
					<option value="all">All Types</option>
					{#each availableTypes() as type}
						<option value={type}>{type}</option>
					{/each}
				</select>
			{/if}

			{#if !compact && groupedPlants.length > 0}
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
				<button
					onclick={() => (seedsView = !seedsView)}
					class="h-8 rounded-full border px-3 text-xs font-semibold transition {seedsView ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'}"
				>
					Seeds view
				</button>
			{/if}

			{#if printBedPlanHref}
				<span class="mx-0.5 text-slate-300">|</span>
				<a
					href={printBedPlanHref}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 {compact ? 'h-7 px-2 text-[10px]' : 'h-8 px-3'}"
				>
					<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
					</svg>
					Print
				</a>
			{/if}
		</div>
	</div>

	<!-- Plant list -->
	<div class="{compact ? 'flex-1 overflow-y-auto p-2 space-y-2' : 'space-y-5'}">
		{#if !compact && seedsView}
			<!-- Seeds view: sorted by tray reference number -->
			<div class="flex flex-wrap gap-3 pt-1">
				{#each filteredPlants.slice().sort((a, b) => {
					if (a.planterRef == null && b.planterRef == null) return 0;
					if (a.planterRef == null) return 1;
					if (b.planterRef == null) return -1;
					return a.planterRef - b.planterRef;
				}) as plant (plant.id)}
					<button
						type="button"
						onclick={() => onPlantClick(plant)}
						class="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-left transition hover:border-emerald-300 hover:bg-emerald-50"
					>
						{#if plant.planterRef != null}
							<span class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
								{plant.planterRef}
							</span>
						{:else}
							<span class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-400">
								—
							</span>
						{/if}
						<div class="min-w-0">
							<p class="font-medium text-slate-800 leading-tight">{plant.name}</p>
							{#if plant.variety}
								<p class="text-xs text-slate-400 truncate">{plant.variety}</p>
							{/if}
						</div>
					</button>
				{/each}
			</div>
		{:else}
		{#each groupedPlants as group (group.type)}
			{#if compact}
				<!-- Compact: minimal group headers + list items -->
				<div class="rounded-lg">
					<button
						type="button"
						onclick={() => toggleTypeSection(group.type)}
						class="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition hover:bg-slate-50"
						aria-expanded={!collapsedTypes.has(group.type)}
						aria-controls={sectionId(group.type)}
					>
						<div class="flex items-center gap-2">
							<h3 class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{group.type}</h3>
							<span class="text-[10px] font-semibold text-slate-400">{group.plants.length}</span>
						</div>
						<svg
							class="h-3.5 w-3.5 text-slate-300 transition-transform {collapsedTypes.has(group.type) ? '' : 'rotate-180'}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>

					{#if !collapsedTypes.has(group.type)}
						<div id={sectionId(group.type)} class="mt-1 space-y-0.5">
							{#each group.plants as plant (plant.id)}
								<PlantListItem
									{plant}
									imageUrl={images[plant.id]}
									selected={selectedPlantId === plant.id}
									onClick={() => onPlantClick(plant)}
									onMouseEnter={(e) => handleItemMouseEnter(e, plant)}
									onMouseMove={handleItemMouseMove}
									onMouseLeave={handleItemMouseLeave}
								/>
							{/each}
						</div>
					{/if}
				</div>
			{:else}
				<!-- Full: original card grid layout -->
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
			{/if}
		{/each}
		{/if}
	</div>

	{#if filteredPlants.length === 0}
		<div class="{compact ? 'p-4 text-center text-sm text-slate-400' : 'rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500'}">
			<p>No plants found{compact ? '' : '. Add your first plant to get started!'}</p>
		</div>
	{/if}
</div>

