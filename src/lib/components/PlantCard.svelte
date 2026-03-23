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
	let lastDragEndAt = 0;

	function getHeightSize(matureHeight: string | null | undefined): { label: string; class: string } | null {
		if (!matureHeight) return null;
		// Parse the max height in inches from strings like "4-6 feet", "12 inches", "18-24 in", "2 ft"
		const text = matureHeight.toLowerCase().trim();
		let maxInches = 0;

		// Match all numbers in the string
		const numbers = [...text.matchAll(/(\d+(?:\.\d+)?)/g)].map(m => parseFloat(m[1]));
		if (numbers.length === 0) return null;

		const maxNum = Math.max(...numbers);

		if (text.includes('feet') || text.includes('foot') || text.includes('ft') || text.includes("'")) {
			maxInches = maxNum * 12;
		} else if (text.includes('inch') || text.includes('in') || text.includes('"')) {
			maxInches = maxNum;
		} else if (text.includes('cm')) {
			maxInches = maxNum / 2.54;
		} else {
			// Assume feet if number > 0 and no unit (most garden heights are in feet)
			maxInches = maxNum > 12 ? maxNum : maxNum * 12;
		}

		if (maxInches <= 24) {
			return { label: 'Short', class: 'border-amber-200 bg-amber-50 text-amber-700' };
		} else if (maxInches <= 48) {
			return { label: 'Medium', class: 'border-orange-200 bg-orange-50 text-orange-700' };
		} else {
			return { label: 'Tall', class: 'border-rose-200 bg-rose-50 text-rose-700' };
		}
	}

	let heightSize = $derived(getHeightSize(plant.matureHeight));

	function getCategoryAccent(category: string | null): { badge: string; dot: string } {
		switch (category) {
			case 'current':
				return { badge: 'border-emerald-200 bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' };
			case 'want':
				return { badge: 'border-sky-200 bg-sky-50 text-sky-800', dot: 'bg-sky-500' };
			default:
				return { badge: 'border-stone-200 bg-stone-100 text-stone-700', dot: 'bg-stone-400' };
		}
	}

	let categoryAccent = $derived(getCategoryAccent(plant.category));

	function handleDragStart(event: DragEvent) {
		if (!browser) return;
		isDragging = true;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'copyMove';
			event.dataTransfer.setData('application/x-plant-id', plant.id.toString());
			event.dataTransfer.setData('text/plain', plant.id.toString());
		}
	}

	function handleDragEnd() {
		if (!browser) return;
		isDragging = false;
		lastDragEndAt = Date.now();
	}

	function handleCardClick(event: MouseEvent) {
		if (Date.now() - lastDragEndAt < 250) {
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		onClick?.();
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onClick?.();
		}
	}
</script>

<div
	draggable={browser}
	ondragstart={handleDragStart}
	ondragend={handleDragEnd}
	class="group cursor-grab rounded-[1.6rem] border border-stone-200 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(250,250,249,0.96))] p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.45)] transition duration-200 hover:-translate-y-1 hover:border-stone-300 hover:shadow-[0_24px_44px_-30px_rgba(15,23,42,0.32)] active:cursor-grabbing touch-manipulation {isDragging ? 'opacity-50' : ''}"
	onclick={handleCardClick}
	onkeydown={handleKeyDown}
	role="button"
	tabindex="0"
>
	<div class="mb-3 flex items-start justify-between gap-3">
		<span class="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] {categoryAccent.badge}">
			<span class="h-2 w-2 rounded-full {categoryAccent.dot}"></span>
			{plant.category ?? 'Plant'}
		</span>
		{#if plant.planterRef != null}
			<span class="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-500">
				Tray {plant.planterRef}
			</span>
		{/if}
	</div>

	{#if imageUrl}
		<div class="relative h-36 w-full overflow-hidden rounded-[1.25rem] border border-stone-200 bg-stone-100">
			<img
				src={imageUrl}
				alt={plant.name}
				class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
				loading="lazy"
			/>
		</div>
	{:else}
		<div
			class="flex h-36 w-full items-center justify-center rounded-[1.25rem] border border-dashed border-stone-300 bg-stone-100/80 text-3xl"
		>
			<span>🌱</span>
		</div>
	{/if}

	<div class="mt-4 font-display text-lg font-semibold leading-tight text-slate-900">{plant.name}</div>
	{#if plant.variety}
		<div class="mt-1 text-sm italic text-stone-500">{plant.variety}</div>
	{/if}

	<div class="mt-4 flex flex-wrap gap-1.5">
		{#if plant.plantType}
			<span
				class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700"
			>
				{plant.plantType}
			</span>
		{/if}
		{#if heightSize}
			<span
				class="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide {heightSize.class}"
			>
				{heightSize.label}
			</span>
		{/if}
		{#if plant.haveSeeds}
			<span
				class="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700"
			>
				Seeds Ready
			</span>
		{/if}
	</div>
</div>
