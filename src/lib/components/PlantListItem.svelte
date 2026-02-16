<script lang="ts">
	import { browser } from '$app/environment';
	import type { Plant } from '$lib/db/queries';

	interface Props {
		plant: Plant;
		imageUrl?: string;
		selected?: boolean;
		onClick?: () => void;
		onMouseEnter?: (e: MouseEvent) => void;
		onMouseMove?: (e: MouseEvent) => void;
		onMouseLeave?: () => void;
	}

	let { plant, imageUrl, selected = false, onClick, onMouseEnter, onMouseMove, onMouseLeave }: Props = $props();

	let isDragging = $state(false);
	let lastDragEndAt = 0;

	function getHeightSize(matureHeight: string | null | undefined): { label: string; dotClass: string } | null {
		if (!matureHeight) return null;
		const text = matureHeight.toLowerCase().trim();
		const numbers = [...text.matchAll(/(\d+(?:\.\d+)?)/g)].map((m) => parseFloat(m[1]));
		if (numbers.length === 0) return null;
		const maxNum = Math.max(...numbers);
		let maxInches = 0;

		if (text.includes('feet') || text.includes('foot') || text.includes('ft') || text.includes("'")) {
			maxInches = maxNum * 12;
		} else if (text.includes('inch') || text.includes('in') || text.includes('"')) {
			maxInches = maxNum;
		} else if (text.includes('cm')) {
			maxInches = maxNum / 2.54;
		} else {
			maxInches = maxNum > 12 ? maxNum : maxNum * 12;
		}

		if (maxInches <= 24) return { label: 'S', dotClass: 'bg-amber-400' };
		if (maxInches <= 48) return { label: 'M', dotClass: 'bg-orange-400' };
		return { label: 'T', dotClass: 'bg-rose-400' };
	}

	let heightSize = $derived(getHeightSize(plant.matureHeight));

	function getCategoryDot(category: string | null | undefined): string | null {
		if (!category) return null;
		if (category === 'current') return 'bg-emerald-400';
		if (category === 'want') return 'bg-sky-400';
		return 'bg-slate-400';
	}

	let categoryDot = $derived(getCategoryDot(plant.category));

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

	function handleClick(event: MouseEvent) {
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
	class="flex cursor-grab items-center gap-3 rounded-lg border px-3 py-2 transition touch-manipulation
		{selected ? 'border-slate-400 bg-slate-100 shadow-sm' : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'}
		{isDragging ? 'opacity-50' : ''}
		active:cursor-grabbing"
	onclick={handleClick}
	onkeydown={handleKeyDown}
	onmouseenter={(e) => onMouseEnter?.(e)}
	onmousemove={(e) => onMouseMove?.(e)}
	onmouseleave={() => onMouseLeave?.()}
	role="button"
	tabindex="0"
>
	<!-- Thumbnail -->
	{#if imageUrl}
		<img
			src={imageUrl}
			alt={plant.name}
			class="h-10 w-10 shrink-0 rounded-lg object-cover"
			loading="lazy"
		/>
	{:else}
		<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">
			🌱
		</div>
	{/if}

	<!-- Name + variety -->
	<div class="min-w-0 flex-1">
		<div class="truncate text-sm font-medium text-slate-900">{plant.name}</div>
		{#if plant.variety}
			<div class="truncate text-xs text-slate-500">{plant.variety}</div>
		{/if}
	</div>

	<!-- Badges -->
	<div class="flex shrink-0 items-center gap-1.5">
		{#if categoryDot}
			<span class="h-2 w-2 rounded-full {categoryDot}" title={plant.category ?? ''}></span>
		{/if}
		{#if heightSize}
			<span
				class="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white {heightSize.dotClass}"
				title={heightSize.label === 'S' ? 'Short' : heightSize.label === 'M' ? 'Medium' : 'Tall'}
			>
				{heightSize.label}
			</span>
		{/if}
	</div>
</div>
