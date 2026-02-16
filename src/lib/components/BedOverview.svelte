<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Bed, BedPlant } from '$lib/db/queries';

	interface Props {
		beds: Bed[];
		bedPlants: Record<number, BedPlant[]>;
		onBedClick: (bedId: number) => void;
	}

	let { beds, bedPlants, onBedClick }: Props = $props();

	let visibleBedId: number | null = $state(null);
	let observer: IntersectionObserver | null = null;

	onMount(() => {
		observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const id = parseInt(entry.target.id.replace('bed-', ''));
						if (!isNaN(id)) {
							visibleBedId = id;
						}
					}
				}
			},
			{ threshold: 0.3 }
		);

		// Observe all bed elements
		for (const bed of beds) {
			const el = document.getElementById(`bed-${bed.id}`);
			if (el) observer.observe(el);
		}
	});

	onDestroy(() => {
		observer?.disconnect();
	});

	function plantCount(bedId: number): number {
		return bedPlants[bedId]?.length ?? 0;
	}
</script>

<div class="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
	<span class="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">Beds</span>
	<span class="shrink-0 text-slate-200">|</span>
	{#each beds as bed (bed.id)}
		<button
			onclick={() => onBedClick(bed.id)}
			class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition
				{visibleBedId === bed.id
					? 'border-slate-900 bg-slate-900 text-white shadow-sm'
					: 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'}"
		>
			{bed.name}
			<span
				class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold
					{visibleBedId === bed.id
						? 'bg-white/20 text-white'
						: 'bg-slate-200 text-slate-500'}"
			>
				{plantCount(bed.id)}
			</span>
		</button>
	{/each}
</div>
