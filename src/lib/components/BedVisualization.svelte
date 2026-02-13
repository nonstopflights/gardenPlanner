<script lang="ts">
	import { browser } from '$app/environment';
	import type { Bed, Plant, BedPlant } from '$lib/db/queries';

	interface Props {
		beds: Bed[];
		plants: Plant[];
		bedPlants: Record<number, BedPlant[]>;
		plantImages?: Record<number, string>;
		onPlantAdd: (bedId: number, plantId: number, posX: number, posY: number) => Promise<void> | void;
		onPlantMove: (bedPlantId: number, posX: number, posY: number) => Promise<void> | void;
		onPlantRemove: (bedPlantId: number) => Promise<void> | void;
		onPlantClick?: (bedId: number, plantId: number, zone: string) => void;
		onBedUpdate?: (bedId: number, data: { caption?: string }) => Promise<void> | void;
	}

	let { beds, plants, bedPlants, plantImages = {}, onPlantAdd, onPlantMove, onPlantRemove, onPlantClick, onBedUpdate }: Props = $props();

	// Caption editing state
	let editingCaptionBedId: number | null = $state(null);
	let editingCaptionValue = $state('');

	function startEditCaption(bed: Bed) {
		editingCaptionBedId = bed.id;
		editingCaptionValue = bed.caption || '';
	}

	function saveCaption(bedId: number) {
		const trimmed = editingCaptionValue.trim();
		onBedUpdate?.(bedId, { caption: trimmed || undefined });
		editingCaptionBedId = null;
		editingCaptionValue = '';
	}

	function cancelEditCaption() {
		editingCaptionBedId = null;
		editingCaptionValue = '';
	}

	// Drag state for repositioning circles
	let draggingBp: BedPlant | null = $state(null);
	let dragPos: { x: number; y: number } | null = $state(null);
	let dragStartPos: { x: number; y: number } | null = $state(null);
	let dragBedEl: HTMLElement | null = $state(null);

	// Add plant picker state
	let addingToBedId: number | null = $state(null);
	let pickerSearch = $state('');

	// Library drop visual state
	let dropTargetBedId: number | null = $state(null);

	const MIN_POS = 5;
	const MAX_POS = 95;
	const CLICK_THRESHOLD = 3;

	function clamp(value: number, min: number, max: number): number {
		return Math.min(Math.max(value, min), max);
	}

	function getPlantForBedPlant(bp: BedPlant): Plant | undefined {
		return plants.find((p) => p.id === bp.plantId);
	}

	function getPositionFromEvent(e: PointerEvent | DragEvent, bedEl: HTMLElement): { x: number; y: number } {
		const rect = bedEl.getBoundingClientRect();
		const x = clamp(((e.clientX - rect.left) / rect.width) * 100, MIN_POS, MAX_POS);
		const y = clamp(((e.clientY - rect.top) / rect.height) * 100, MIN_POS, MAX_POS);
		return { x, y };
	}

	// --- Pointer-based repositioning ---

	function handlePointerDown(e: PointerEvent, bp: BedPlant, bedEl: HTMLElement) {
		if (!browser) return;
		e.preventDefault();
		e.stopPropagation();
		draggingBp = bp;
		dragBedEl = bedEl;
		dragStartPos = { x: e.clientX, y: e.clientY };
		dragPos = { x: bp.posX, y: bp.posY };
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!draggingBp || !dragBedEl) return;
		e.preventDefault();
		const pos = getPositionFromEvent(e, dragBedEl);
		dragPos = pos;
	}

	function handlePointerUp(e: PointerEvent) {
		if (!draggingBp || !dragBedEl || !dragStartPos || !dragPos) {
			draggingBp = null;
			dragPos = null;
			dragStartPos = null;
			dragBedEl = null;
			return;
		}

		const dx = Math.abs(e.clientX - dragStartPos.x);
		const dy = Math.abs(e.clientY - dragStartPos.y);
		const wasDrag = dx > CLICK_THRESHOLD || dy > CLICK_THRESHOLD;

		if (wasDrag) {
			onPlantMove(draggingBp.id, Math.round(dragPos.x * 10) / 10, Math.round(dragPos.y * 10) / 10);
		} else if (onPlantClick) {
			onPlantClick(draggingBp.bedId, draggingBp.plantId, draggingBp.zone);
		}

		draggingBp = null;
		dragPos = null;
		dragStartPos = null;
		dragBedEl = null;
	}

	// --- Library drop support ---

	function handleDragOver(e: DragEvent, bedId: number) {
		if (!browser) return;
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'copy';
		}
		dropTargetBedId = bedId;
	}

	function handleDragLeave(e: DragEvent, bedId: number) {
		if (!browser) return;
		if (dropTargetBedId === bedId) {
			dropTargetBedId = null;
		}
	}

	function handleDrop(e: DragEvent, bedId: number, bedEl: HTMLElement) {
		if (!browser) return;
		e.preventDefault();
		dropTargetBedId = null;

		let plantId: number | null = null;
		if (e.dataTransfer) {
			const textPayload = e.dataTransfer.getData('text/plain');
			if (textPayload) {
				const parsed = Number(textPayload);
				if (!Number.isNaN(parsed)) {
					plantId = parsed;
				}
			}
		}
		if (!plantId) return;

		const pos = getPositionFromEvent(e, bedEl);
		onPlantAdd(bedId, plantId, Math.round(pos.x * 10) / 10, Math.round(pos.y * 10) / 10);
	}

	// --- Add plant picker ---

	function togglePicker(bedId: number) {
		if (addingToBedId === bedId) {
			addingToBedId = null;
			pickerSearch = '';
		} else {
			addingToBedId = bedId;
			pickerSearch = '';
		}
	}

	function selectPlantFromPicker(bedId: number, plantId: number) {
		onPlantAdd(bedId, plantId, 50, 50);
		addingToBedId = null;
		pickerSearch = '';
	}

	let filteredPickerPlants = $derived(
		plants.filter(
			(p) =>
				p.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
				(p.variety?.toLowerCase().includes(pickerSearch.toLowerCase()) ?? false)
		)
	);

	function handleRemove(e: MouseEvent, bpId: number) {
		e.stopPropagation();
		e.preventDefault();
		onPlantRemove(bpId);
	}

	function getBpPosition(bp: BedPlant): { x: number; y: number } {
		if (draggingBp?.id === bp.id && dragPos) {
			return dragPos;
		}
		return { x: bp.posX, y: bp.posY };
	}

	function parseInches(value: string | null | undefined): number | null {
		if (!value) return null;
		const t = value.toLowerCase().trim();
		const numbers = [...t.matchAll(/(\d+(?:\.\d+)?)/g)].map(m => parseFloat(m[1]));
		if (numbers.length === 0) return null;
		// Use the max number for sizing (e.g. "12-18 inches" → 18)
		const maxNum = Math.max(...numbers);

		if (t.includes('feet') || t.includes('foot') || t.includes('ft') || t.includes("'")) {
			return maxNum * 12;
		} else if (t.includes('inch') || t.includes('in') || t.includes('"')) {
			return maxNum;
		} else if (t.includes('cm')) {
			return maxNum / 2.54;
		} else {
			// Plain number — assume inches if ≤ 48, otherwise already inches
			return maxNum;
		}
	}

	const DEFAULT_CIRCLE_PCT = 18; // fallback when no spacing data
	const MIN_CIRCLE_PCT = 8;
	const MAX_CIRCLE_PCT = 45;

	function getCirclePct(plant: Plant | undefined, bed: Bed): number {
		const spacingInches = parseInches(plant?.spacing);
		if (!spacingInches) return DEFAULT_CIRCLE_PCT;
		const bedWidthInches = bed.width * 12;
		const pct = (spacingInches / bedWidthInches) * 100;
		return clamp(pct, MIN_CIRCLE_PCT, MAX_CIRCLE_PCT);
	}

	function getHeightSize(matureHeight: string | null | undefined): { label: string; border: string; text: string; bg: string } | null {
		const maxInches = parseInches(matureHeight);
		if (!maxInches) return null;

		if (maxInches <= 24) {
			return { label: 'S', border: 'border-amber-400', text: 'text-amber-600', bg: 'bg-amber-50' };
		} else if (maxInches <= 48) {
			return { label: 'M', border: 'border-orange-400', text: 'text-orange-600', bg: 'bg-orange-50' };
		} else {
			return { label: 'T', border: 'border-rose-400', text: 'text-rose-600', bg: 'bg-rose-50' };
		}
	}

	// --- Hover tooltip ---
	let hoverPlant: Plant | null = $state(null);
	let hoverPos: { x: number; y: number } | null = $state(null);
	let hoverTimer: ReturnType<typeof setTimeout> | null = $state(null);

	function handleCircleMouseEnter(e: MouseEvent, plant: Plant | undefined) {
		if (!plant) return;
		clearHover();
		hoverTimer = setTimeout(() => {
			hoverPlant = plant;
			hoverPos = { x: e.clientX, y: e.clientY };
		}, 1000);
	}

	function handleCircleMouseMove(e: MouseEvent) {
		if (hoverPlant) {
			hoverPos = { x: e.clientX, y: e.clientY };
		}
	}

	let tooltipStyle = $derived.by(() => {
		if (!hoverPos) return '';
		const pad = 12;
		const w = 256; // w-64
		const h = 220; // rough estimate for image + text
		let x = hoverPos.x + pad;
		let y = hoverPos.y + pad;
		if (typeof window !== 'undefined') {
			if (x + w > window.innerWidth - pad) x = hoverPos.x - w - pad;
			if (y + h > window.innerHeight - pad) y = hoverPos.y - h - pad;
		}
		return `left: ${x}px; top: ${y}px;`;
	});

	function handleCircleMouseLeave() {
		clearHover();
	}

	function clearHover() {
		if (hoverTimer) {
			clearTimeout(hoverTimer);
			hoverTimer = null;
		}
		hoverPlant = null;
		hoverPos = null;
	}

	// --- Double-tap for mobile ---
	let lastTapTime = 0;
	let lastTapBpId: number | null = null;
	let tappedPlant: Plant | null = $state(null);

	function handleDoubleTap(bp: { id: number }, plant: Plant | undefined) {
		if (!plant) return;
		const now = Date.now();
		if (lastTapBpId === bp.id && now - lastTapTime < 400) {
			tappedPlant = plant;
			lastTapTime = 0;
			lastTapBpId = null;
		} else {
			lastTapTime = now;
			lastTapBpId = bp.id;
		}
	}

	function buildSummary(plant: Plant): string {
		const sentences: string[] = [];

		// Sentence 1: What it is
		let s1 = plant.name;
		if (plant.variety) s1 += ` (${plant.variety})`;
		if (plant.plantType) s1 += ` is a ${plant.plantType.toLowerCase()}`;
		if (plant.matureHeight) s1 += ` that grows ${plant.matureHeight} tall`;
		s1 += '.';
		sentences.push(s1);

		// Sentence 2: Growing needs
		const needs: string[] = [];
		if (plant.sunRequirements) needs.push(plant.sunRequirements.toLowerCase() + ' sun');
		if (plant.waterNeeds) needs.push(plant.waterNeeds.toLowerCase() + ' water');
		if (plant.spacing) needs.push(plant.spacing + ' spacing');
		if (needs.length > 0) {
			sentences.push(`Needs ${needs.join(', ')}.`);
		} else if (plant.daysToMaturity) {
			sentences.push(`Matures in ${plant.daysToMaturity} days.`);
		}

		// Sentence 3: Maturity / harvest info
		if (plant.daysToMaturity && needs.length > 0) {
			sentences.push(`Matures in about ${plant.daysToMaturity} days.`);
		} else if (plant.growingNotes) {
			// Grab first sentence of growing notes
			const first = plant.growingNotes.replace(/<[^>]*>/g, '').split(/[.!]\s/)[0];
			if (first && first.length < 120) sentences.push(first + '.');
		}

		if (sentences.length < 2 && plant.plantingSeason) {
			sentences.push(`Best planted in ${plant.plantingSeason}.`);
		}

		return sentences.slice(0, 3).join(' ');
	}
</script>

<svelte:window
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
/>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
	{#each beds as bed (bed.id)}
		{@const bps = bedPlants[bed.id] || []}
		<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
			<div class="flex items-center justify-between gap-2">
				<h3 class="shrink-0 text-base font-semibold text-slate-900">{bed.name}</h3>
				{#if editingCaptionBedId === bed.id}
					<input
						type="text"
						bind:value={editingCaptionValue}
						placeholder="e.g. Back fence, Raised box..."
						class="min-w-0 flex-1 rounded border border-slate-300 px-2 py-0.5 text-sm text-slate-600 placeholder-slate-300 focus:border-slate-400 focus:outline-none"
						autofocus
						onkeydown={(e) => {
							if (e.key === 'Enter') saveCaption(bed.id);
							if (e.key === 'Escape') cancelEditCaption();
						}}
						onblur={() => saveCaption(bed.id)}
					/>
				{:else}
					<button
						onclick={() => startEditCaption(bed)}
						class="min-w-0 flex-1 truncate text-left text-sm text-slate-400 transition hover:text-slate-600 {bed.caption ? 'text-slate-500' : 'italic'}"
						title="Click to edit caption"
					>
						{bed.caption || 'Add caption...'}
					</button>
				{/if}
				<button
					onclick={() => togglePicker(bed.id)}
					class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
					aria-label="Add plant to bed"
				>
					+
				</button>
			</div>

			<!-- Plant picker dropdown -->
			{#if addingToBedId === bed.id}
				<div class="mt-2 rounded-lg border border-slate-200 bg-white p-2 shadow-md">
					<input
						type="text"
						bind:value={pickerSearch}
						placeholder="Search plants..."
						class="mb-2 w-full rounded border border-slate-200 px-2 py-1 text-sm text-slate-700 placeholder-slate-400 focus:border-slate-400 focus:outline-none"
						autofocus
					/>
					<div class="max-h-40 overflow-y-auto">
						{#each filteredPickerPlants as p (p.id)}
							<button
								onclick={() => selectPlantFromPicker(bed.id, p.id)}
								class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-100"
							>
								<span class="font-medium">{p.name}</span>
								{#if p.variety}
									<span class="text-slate-400">{p.variety}</span>
								{/if}
							</button>
						{/each}
						{#if filteredPickerPlants.length === 0}
							<p class="px-2 py-1 text-xs text-slate-400">No plants found</p>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Bed container -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="relative mt-4 rounded-xl border border-slate-200 bg-slate-50/80 touch-none transition-colors {dropTargetBedId === bed.id ? 'border-slate-400 bg-slate-100/80' : ''}"
				style="aspect-ratio: 1 / 2; width: 100%;"
				ondragover={(e) => handleDragOver(e, bed.id)}
				ondragleave={(e) => handleDragLeave(e, bed.id)}
				ondrop={(e) => {
					const el = e.currentTarget as HTMLElement;
					handleDrop(e, bed.id, el);
				}}
			>
				{#if bps.length === 0}
					<div class="absolute inset-0 flex items-center justify-center">
						<p class="text-xs text-slate-300">Drop a plant here or click +</p>
					</div>
				{/if}

				{#each bps as bp (bp.id)}
					{@const plant = getPlantForBedPlant(bp)}
					{@const pos = getBpPosition(bp)}
					{@const isDragging = draggingBp?.id === bp.id}
					{@const hs = getHeightSize(plant?.matureHeight)}
					{@const sizePct = getCirclePct(plant, bed)}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="absolute flex flex-col items-center justify-center rounded-full border-2 shadow-sm select-none transition-shadow {isDragging ? 'shadow-md border-slate-500 z-20 cursor-grabbing' : hs ? hs.border + ' z-10 cursor-grab hover:shadow-md' : 'border-slate-300 z-10 cursor-grab hover:shadow-md hover:border-slate-400'} {hs ? hs.bg : 'bg-white'}"
						style="left: {pos.x}%; top: {pos.y}%; width: {sizePct}%; aspect-ratio: 1; transform: translate(-50%, -50%);"
						onpointerdown={(e) => {
							clearHover();
							const bedEl = (e.currentTarget as HTMLElement).parentElement;
							if (bedEl) handlePointerDown(e, bp, bedEl);
						}}
						onmouseenter={(e) => handleCircleMouseEnter(e, plant)}
						onmousemove={handleCircleMouseMove}
						onmouseleave={handleCircleMouseLeave}
						ontouchend={() => handleDoubleTap(bp, plant)}
					>
						<div class="text-[10px] sm:text-xs text-center px-1 font-semibold text-slate-900 truncate" style="max-width: 90%;">
							{plant?.plantType || plant?.name || 'Plant'}
						</div>
						{#if plant?.variety}
							<div class="text-[8px] sm:text-[9px] text-center px-1 text-slate-500 truncate" style="max-width: 90%;">{plant.variety}</div>
						{/if}
						{#if hs}
							<div class="text-[8px] sm:text-[9px] font-bold {hs.text}">{hs.label === 'S' ? 'Short' : hs.label === 'M' ? 'Med' : 'Tall'}</div>
						{/if}
						<button
							class="mt-0.5 inline-flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full border border-slate-200 text-[8px] sm:text-[10px] font-semibold text-slate-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-500"
							onpointerdown={(e) => e.stopPropagation()}
							onclick={(e) => handleRemove(e, bp.id)}
							aria-label="Remove plant"
						>
							&times;
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>

{#if hoverPlant && hoverPos}
	<div
		class="fixed z-50 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg pointer-events-none"
		style={tooltipStyle}
	>
		{#if plantImages[hoverPlant.id]}
			<img
				src={plantImages[hoverPlant.id]}
				alt={hoverPlant.name}
				class="mb-2 h-28 w-full rounded-lg object-cover"
			/>
		{/if}
		<p class="text-sm font-semibold text-slate-900">{hoverPlant.name}</p>
		<p class="mt-1 text-xs leading-relaxed text-slate-600">{buildSummary(hoverPlant)}</p>
	</div>
{/if}

{#if tappedPlant}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
		onclick={() => (tappedPlant = null)}
		onkeydown={(e) => { if (e.key === 'Escape') tappedPlant = null; }}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="mx-4 w-full max-w-xs rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
			onclick={(e) => e.stopPropagation()}
		>
			{#if plantImages[tappedPlant.id]}
				<img
					src={plantImages[tappedPlant.id]}
					alt={tappedPlant.name}
					class="mb-3 h-36 w-full rounded-lg object-cover"
				/>
			{/if}
			<p class="text-base font-semibold text-slate-900">{tappedPlant.name}</p>
			<p class="mt-1 text-sm leading-relaxed text-slate-600">{buildSummary(tappedPlant)}</p>
			<button
				class="mt-3 w-full rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
				onclick={() => (tappedPlant = null)}
			>
				Close
			</button>
		</div>
	</div>
{/if}
