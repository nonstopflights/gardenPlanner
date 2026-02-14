<script lang="ts">
	import { tick } from 'svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';

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
		entry: JournalEntry | null;
		images: JournalImage[];
		beds: Bed[];
		open?: boolean;
		onClose?: () => void;
		onSave?: (data: { title: string; content: string; entryDate: string; tags: string | null }) => Promise<void>;
		onImagesChange?: () => Promise<void>;
	}

	let {
		entry,
		images = [],
		beds = [],
		open = $bindable(false),
		onClose,
		onSave,
		onImagesChange
	}: Props = $props();

	let editTitle = $state('');
	let editContent = $state('');
	let editDate = $state('');
	let editTags = $state('');
	let saving = $state(false);
	let contentEditableEl: HTMLDivElement;
	let fileInput: HTMLInputElement;

	$effect(() => {
		if (entry) {
			editTitle = entry.title;
			editContent = entry.content;
			editDate = entry.entryDate;
			editTags = entry.tags ? JSON.parse(entry.tags).join(', ') : '';
		}
	});

	$effect(() => {
		if (open && entry && contentEditableEl) {
			tick().then(() => {
				if (contentEditableEl) contentEditableEl.textContent = entry.content;
			});
		}
	});

	function formatDate(dateStr: string): string {
		const d = new Date(dateStr + 'T00:00:00');
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function bedName(bedId: number | null): string {
		if (!bedId) return '';
		return beds.find((b) => b.id === bedId)?.name ?? 'Bed';
	}

	async function handleSave() {
		if (!entry || !onSave) return;
		saving = true;
		try {
			const content = contentEditableEl?.innerText ?? editContent;
			await onSave({
				title: editTitle.trim(),
				content: content.trim(),
				entryDate: editDate,
				tags: editTags.trim() ? JSON.stringify(editTags.split(',').map((t) => t.trim()).filter(Boolean)) : null
			});
			open = false;
			onClose?.();
		} catch (err) {
			console.error('Failed to save:', err);
		} finally {
			saving = false;
		}
	}

	async function handleAddPhoto() {
		if (!entry) return;
		fileInput?.click();
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files?.length || !entry) return;
		(async () => {
			for (const file of Array.from(input.files!)) {
				const fd = new FormData();
				fd.append('image', file);
				const res = await fetch(`/api/journal/${entry.id}/images`, { method: 'POST', body: fd });
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(err.error || 'Failed to upload photo');
				}
			}
			input.value = '';
			await onImagesChange?.();
		})();
	}

	async function handleDeletePhoto(imageId: number) {
		if (!entry) return;
		try {
			const res = await fetch(`/api/journal/${entry.id}/images/${imageId}`, { method: 'DELETE' });
			if (res.ok) await onImagesChange?.();
		} catch (err) {
			console.error('Failed to delete photo:', err);
		}
	}

	$effect(() => {
		if (!open) onClose?.();
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
		{#if entry}
			<Dialog.Header>
				<Dialog.Title>
					<input
						type="text"
						bind:value={editTitle}
						class="w-full border-none bg-transparent text-lg font-semibold focus:outline-none focus:ring-0"
						placeholder="Title"
					/>
				</Dialog.Title>
				<Dialog.Description>
					<input
						type="date"
						bind:value={editDate}
						class="rounded border border-slate-200 bg-transparent px-2 py-1 text-sm text-slate-500"
					/>
					<span class="ml-2 text-slate-400">— {formatDate(entry.entryDate)}</span>
				</Dialog.Description>
			</Dialog.Header>

			<div class="mt-4 space-y-4">
				<div>
					<label class="mb-1 block text-xs font-medium text-slate-600">Content</label>
					<div
						bind:this={contentEditableEl}
						contenteditable="true"
						role="textbox"
						aria-multiline="true"
						class="min-h-[120px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
						style="white-space: pre-wrap;"
					></div>
				</div>

				<div>
					<label class="mb-1.5 block text-xs font-medium text-slate-600">Photos</label>
					<div class="flex flex-wrap gap-3">
						{#each images as img (img.id)}
							<div class="relative group">
								<img
									src={img.imagePath}
									alt={img.caption || 'Photo'}
									class="h-24 w-24 rounded-lg border border-slate-200 object-cover"
								/>
								{#if img.bedId}
									<span class="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
										{bedName(img.bedId)}{img.zone ? ` · ${img.zone}` : ''}
									</span>
								{/if}
								<button
									type="button"
									onclick={() => handleDeletePhoto(img.id)}
									class="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow transition hover:bg-red-600 group-hover:opacity-100"
									aria-label="Delete photo"
								>
									<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>
						{/each}
						<button
							type="button"
							onclick={handleAddPhoto}
							class="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-slate-400 hover:text-slate-600"
							aria-label="Add photo"
						>
							<svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
							</svg>
						</button>
					</div>
					<input
						bind:this={fileInput}
						type="file"
						accept="image/*"
						multiple
						class="hidden"
						onchange={handleFileSelect}
					/>
				</div>

				<div>
					<label class="mb-1 block text-xs font-medium text-slate-600">Tags (comma separated)</label>
					<input
						type="text"
						bind:value={editTags}
						placeholder="e.g. tomatoes, harvest, bugs"
						class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
					/>
				</div>
			</div>

			<Dialog.Footer class="mt-6">
				<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button onclick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
