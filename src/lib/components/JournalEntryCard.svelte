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
		compact?: boolean;
	}

	let { entry, images = [], beds = [], onEdit, onDelete, compact = false }: Props = $props();

	let parsedTags = $derived<string[]>(entry.tags ? JSON.parse(entry.tags) : []);

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
</script>

{#if compact}
	<div class="group rounded-lg border border-slate-200 bg-white px-4 py-3 transition-shadow hover:shadow-sm">
		<div class="flex items-start justify-between gap-3">
			<div class="min-w-0 flex-1">
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
				<div class="flex flex-shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
					{#if onEdit}
						<button
							onclick={onEdit}
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
							onclick={onDelete}
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
{:else}
	<div class="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
		<div class="flex items-start justify-between gap-3">
			<div class="min-w-0 flex-1">
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
				<div class="flex flex-shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
					{#if onEdit}
						<button
							onclick={onEdit}
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
							onclick={onDelete}
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
{/if}
