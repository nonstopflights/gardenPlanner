<script lang="ts">
	interface JournalEntry {
		id: number;
		title: string;
		content: string;
		entryDate: string;
		seasonId: number | null;
		tags: string | null;
		createdAt: string;
		updatedAt: string;
	}

	interface JournalImage {
		id: number;
		journalEntryId: number;
		imagePath: string;
		caption: string | null;
		bedId: number | null;
		zone: string | null;
		uploadedAt: string;
	}

	interface Bed {
		id: number;
		name: string;
	}

	interface Props {
		entry: JournalEntry;
		images?: JournalImage[];
		beds?: Bed[];
		onEdit?: () => void;
		onDelete?: () => void;
		onView?: () => void;
		compact?: boolean;
	}

	let { entry, images = [], beds = [], onEdit, onDelete, onView, compact = false }: Props = $props();

	let parsedTags = $derived<string[]>(entry.tags ? JSON.parse(entry.tags) : []);
	const ACTION_WIDTH = 96;
	const LONG_PRESS_MS = 500;
	let longPressTimer: ReturnType<typeof setTimeout> | undefined;
	let touchStartX = 0;
	let touchStartY = 0;
	let baseOffset = 0;
	let swipeOffset = $state(0);
	let isDragging = false;
	let isHorizontalDrag = false;

	function formatDate(dateStr: string): string {
		const d = new Date(dateStr + 'T00:00:00');
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function truncate(text: string, maxLength: number): string {
		if (!text || text.length <= maxLength) return text || '';
		return text.slice(0, maxLength).trimEnd() + '...';
	}

	const TAG_COLORS = [
		'border-sky-200 bg-sky-50 text-sky-700',
		'border-emerald-200 bg-emerald-50 text-emerald-700',
		'border-amber-200 bg-amber-50 text-amber-700',
		'border-violet-200 bg-violet-50 text-violet-700',
		'border-rose-200 bg-rose-50 text-rose-700',
		'border-teal-200 bg-teal-50 text-teal-700'
	];

	function tagColor(tag: string): string {
		let hash = 0;
		for (let i = 0; i < tag.length; i++) {
			hash = tag.charCodeAt(i) + ((hash << 5) - hash);
		}
		return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
	}

	function bedName(bedId: number | null): string {
		if (!bedId) return '';
		return beds.find((b) => b.id === bedId)?.name ?? 'Bed';
	}

	function isMobileViewport(): boolean {
		return typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;
	}

	function hasActions(): boolean {
		return Boolean(onEdit || onDelete);
	}

	function closeSwipe() {
		swipeOffset = 0;
	}

	function onTouchStart(event: TouchEvent) {
		if (event.touches.length !== 1) return;
		const touch = event.touches[0];
		touchStartX = touch.clientX;
		touchStartY = touch.clientY;
		baseOffset = swipeOffset;
		isDragging = isMobileViewport() && hasActions();
		isHorizontalDrag = false;
		if (isMobileViewport() && onView) {
			longPressTimer = setTimeout(() => {
				longPressTimer = undefined;
				onView?.();
			}, LONG_PRESS_MS);
		}
	}

	function onTouchMove(event: TouchEvent) {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = undefined;
		}
		if (!isDragging || !isMobileViewport() || event.touches.length !== 1) return;
		const touch = event.touches[0];
		const dx = touch.clientX - touchStartX;
		const dy = touch.clientY - touchStartY;

		if (!isHorizontalDrag) {
			if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
			isHorizontalDrag = Math.abs(dx) > Math.abs(dy);
			if (!isHorizontalDrag) {
				isDragging = false;
				return;
			}
		}

		const nextOffset = baseOffset + dx;
		swipeOffset = Math.max(-ACTION_WIDTH, Math.min(0, nextOffset));
		event.preventDefault();
	}

	function onTouchEnd() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = undefined;
		}
		if (!isDragging || !isMobileViewport()) return;
		swipeOffset = swipeOffset <= -ACTION_WIDTH / 2 ? -ACTION_WIDTH : 0;
		isDragging = false;
		isHorizontalDrag = false;
	}

	function handleEdit(e?: Event) {
		e?.stopPropagation();
		onEdit?.();
		closeSwipe();
	}

	function handleDelete(e?: Event) {
		e?.stopPropagation();
		onDelete?.();
		closeSwipe();
	}

	function handleContentClick(e: MouseEvent) {
		if (isMobileViewport()) return;
		if ((e.target as HTMLElement).closest('button')) return;
		onView?.();
	}
</script>

{#if compact}
	<div class="relative overflow-hidden rounded-lg border border-slate-200 bg-white">
		{#if onEdit || onDelete}
			<div class="absolute inset-y-0 right-0 flex w-24 sm:hidden">
				{#if onEdit}
					<button
						onclick={handleEdit}
						class="flex flex-1 items-center justify-center bg-slate-600 text-white"
						aria-label="Edit entry"
					>
						<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
						</svg>
					</button>
				{/if}
				{#if onDelete}
					<button
						onclick={handleDelete}
						class="flex flex-1 items-center justify-center bg-red-500 text-white"
						aria-label="Delete entry"
					>
						<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
						</svg>
					</button>
				{/if}
			</div>
		{/if}
		<div
			class="group px-4 py-3 transition-[transform,box-shadow] duration-200 hover:shadow-sm"
			style={`transform: translateX(${swipeOffset}px)`}
			ontouchstart={onTouchStart}
			ontouchmove={onTouchMove}
			ontouchend={onTouchEnd}
			ontouchcancel={onTouchEnd}
		>
			<div class="flex items-start justify-between gap-3">
			<div
				class="min-w-0 flex-1 {onView ? 'cursor-pointer' : ''}"
				role={onView ? 'button' : undefined}
				tabindex={onView ? 0 : undefined}
				onclick={handleContentClick}
				onkeydown={onView ? (e) => e.key === 'Enter' && onView() : undefined}
			>
				<p class="truncate text-sm font-medium text-slate-900">{entry.title}</p>
				<p class="mt-0.5 text-xs text-slate-400">{formatDate(entry.entryDate)}</p>
				{#if entry.content}
					<p class="mt-1 line-clamp-2 text-sm text-slate-500">{truncate(entry.content, 120)}</p>
				{/if}
				{#if images.length > 0}
					<div class="mt-1.5 flex items-center gap-1.5">
						<img src={images[0].imagePath} alt={images[0].caption || 'Journal photo'} class="h-10 w-10 rounded object-cover border border-slate-200" />
						{#if images.length > 1}
							<span class="text-xs text-slate-400">+{images.length - 1}</span>
						{/if}
					</div>
				{/if}
				{#if parsedTags.length > 0}
					<div class="mt-2 flex flex-wrap gap-1">
						{#each parsedTags as tag}
							<span class="rounded-full border px-2 py-0.5 text-[10px] font-medium {tagColor(tag)}">{tag}</span>
						{/each}
					</div>
				{/if}
			</div>
			{#if onEdit || onDelete}
				<div class="hidden flex-shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
					{#if onEdit}
						<button
							onclick={handleEdit}
							class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
							aria-label="Edit entry"
						>
							<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
							</svg>
						</button>
					{/if}
					{#if onDelete}
						<button
							onclick={handleDelete}
							class="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
							aria-label="Delete entry"
						>
							<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
						</button>
					{/if}
				</div>
			{/if}
		</div>
		</div>
	</div>
{:else}
	<div class="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
		{#if onEdit || onDelete}
			<div class="absolute inset-y-0 right-0 flex w-24 sm:hidden">
				{#if onEdit}
					<button
						onclick={handleEdit}
						class="flex flex-1 items-center justify-center bg-slate-600 text-white"
						aria-label="Edit entry"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
						</svg>
					</button>
				{/if}
				{#if onDelete}
					<button
						onclick={handleDelete}
						class="flex flex-1 items-center justify-center bg-red-500 text-white"
						aria-label="Delete entry"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
						</svg>
					</button>
				{/if}
			</div>
		{/if}
		<div
			class="group p-5 transition-[transform,box-shadow] duration-200 hover:shadow-md"
			style={`transform: translateX(${swipeOffset}px)`}
			ontouchstart={onTouchStart}
			ontouchmove={onTouchMove}
			ontouchend={onTouchEnd}
			ontouchcancel={onTouchEnd}
		>
			<div class="flex items-start justify-between gap-3">
			<div
				class="min-w-0 flex-1 {onView ? 'cursor-pointer' : ''}"
				role={onView ? 'button' : undefined}
				tabindex={onView ? 0 : undefined}
				onclick={handleContentClick}
				onkeydown={onView ? (e) => e.key === 'Enter' && onView() : undefined}
			>
				<h3 class="text-base font-semibold text-slate-900">{entry.title}</h3>
				<p class="mt-1 text-sm text-slate-400">{formatDate(entry.entryDate)}</p>
				{#if entry.content}
					<p class="mt-2 line-clamp-3 text-sm text-slate-600">{truncate(entry.content, 280)}</p>
				{/if}
				{#if images.length > 0}
					<div class="mt-3 flex gap-2 overflow-x-auto">
						{#each images as img (img.id)}
							<div class="relative flex-shrink-0">
								<img
									src={img.imagePath}
									alt={img.caption || 'Journal photo'}
									class="h-24 w-24 rounded-lg border border-slate-200 object-cover"
								/>
								{#if img.bedId}
									<span class="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
										{bedName(img.bedId)}{img.zone ? ` · ${img.zone}` : ''}
									</span>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
				{#if parsedTags.length > 0}
					<div class="mt-3 flex flex-wrap gap-1.5">
						{#each parsedTags as tag}
							<span class="rounded-full border px-2.5 py-0.5 text-[11px] font-medium {tagColor(tag)}">{tag}</span>
						{/each}
					</div>
				{/if}
			</div>
			{#if onEdit || onDelete}
				<div class="hidden flex-shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
					{#if onEdit}
						<button
							onclick={handleEdit}
							class="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
							aria-label="Edit entry"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
							</svg>
						</button>
					{/if}
					{#if onDelete}
						<button
							onclick={handleDelete}
							class="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
							aria-label="Delete entry"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
						</button>
					{/if}
				</div>
			{/if}
		</div>
		</div>
	</div>
{/if}
