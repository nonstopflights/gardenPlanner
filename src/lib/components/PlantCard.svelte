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

	function getCategoryAccent(category: string | null): { border: string; gradient: string } {
		switch (category) {
			case 'current':
				return { border: 'border-l-emerald-500', gradient: 'from-emerald-600/10' };
			case 'want':
				return { border: 'border-l-sky-400', gradient: 'from-sky-600/10' };
			default:
				return { border: 'border-l-stone-300', gradient: 'from-stone-600/8' };
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
	class="group cursor-grab rounded-2xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing touch-manipulation {categoryAccent.border} {isDragging ? 'opacity-50' : ''}"
	onclick={handleCardClick}
	onkeydown={handleKeyDown}
	role="button"
	tabindex="0"
>
	{#if imageUrl}
		<div class="relative h-32 w-full overflow-hidden rounded-xl">
			<img
				src={imageUrl}
				alt={plant.name}
				class="h-full w-full object-cover"
				loading="lazy"
			/>
			<div class="absolute inset-0 bg-gradient-to-t {categoryAccent.gradient} to-transparent"></div>
		</div>
	{:else}
		<div
			class="flex h-32 w-full items-center justify-center rounded-xl bg-stone-100 text-3xl"
		>
			<span>🌱</span>
		</div>
	{/if}
	<div class="mt-3 font-display text-base font-semibold text-slate-900">{plant.name}</div>
	{#if plant.variety}
		<div class="text-sm text-stone-500 italic">{plant.variety}</div>
	{/if}
	<div class="mt-3 flex flex-wrap gap-1.5">
		{#if plant.plantType}
			<span
				class="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-purple-700"
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
				Seeds ✓
			</span>
		{/if}
	</div>
</div>
