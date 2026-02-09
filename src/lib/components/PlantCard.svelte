<script lang="ts">
	import { browser } from '$app/environment';
	import type { Plant } from '$lib/db/queries';

	interface Props {
		plant: Plant;
		imageUrl?: string;
		onClick?: () => void;
	}

	let { plant, imageUrl, onClick }: Props = $props();

	let isDragging = $state(false);

	function handleDragStart(event: DragEvent) {
		if (!browser) return;
		isDragging = true;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', plant.id.toString());
		}
	}

	function handleDragEnd() {
		if (!browser) return;
		isDragging = false;
	}
</script>

<div
	draggable={browser}
	ondragstart={handleDragStart}
	ondragend={handleDragEnd}
	class="group cursor-grab rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing touch-manipulation {isDragging ? 'opacity-50' : ''}"
	onclick={onClick}
	role="button"
	tabindex="0"
>
	{#if imageUrl}
		<img
			src={imageUrl}
			alt={plant.name}
			class="h-32 w-full rounded-xl object-cover"
			loading="lazy"
		/>
	{:else}
		<div
			class="flex h-32 w-full items-center justify-center rounded-xl bg-slate-100 text-3xl"
		>
			<span>🌱</span>
		</div>
	{/if}
	<div class="mt-3 text-base font-semibold text-slate-900">{plant.name}</div>
	{#if plant.variety}
		<div class="text-sm text-slate-500">{plant.variety}</div>
	{/if}
	{#if plant.category}
		<div class="mt-3">
			<span
				class="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide {plant.category === 'current' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : plant.category === 'want' ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-slate-200 bg-slate-50 text-slate-600'}"
			>
				{plant.category}
			</span>
		</div>
	{/if}
</div>
