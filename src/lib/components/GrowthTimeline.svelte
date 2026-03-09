<script lang="ts">
	import { browser } from '$app/environment';
	import { onDestroy, tick } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';

	interface Season {
		id: number;
		name: string;
	}

	interface ImageEntry {
		id: number;
		imagePath: string;
		caption: string | null;
		takenAt: string | null;
		uploadedAt: string;
		seasonId?: number | null;
	}

	interface Props {
		images: ImageEntry[];
		onUpload: (
			file: File,
			caption: string,
			takenAt: string,
			bedId?: number,
			zone?: string,
			seasonId?: number
		) => Promise<void> | void;
		onUpdate: (
			imageId: number,
			data: { caption?: string; bedId?: number | null; zone?: string | null; seasonId?: number | null }
		) => void;
		onDelete: (imageId: number) => void;
		seasons?: Season[];
		currentSeasonId?: number | null;
	}

	let { images, onUpload, onUpdate, onDelete, seasons = [], currentSeasonId = null }: Props = $props();

	let fileInput: HTMLInputElement | undefined = $state();
	let selectedFile: File | null = $state(null);
	let takenAt = $state(new Date().toISOString().split('T')[0]);
	let uploadSeasonId: string = $state('');
	let editingId: number | null = $state(null);
	let editingTagsId: number | null = $state(null);
	let editSeasonId = $state('');
	let selectedImageId: number | null = $state(null);
	let uploadEditorHost: HTMLDivElement | null = $state(null);
	let editEditorHost: HTMLDivElement | null = $state(null);
	let uploadEditor: Editor | null = $state(null);
	let editEditor: Editor | null = $state(null);
	let uploadError = $state('');
	let uploadStatus = $state('');
	let uploading = $state(false);

	const editorClasses =
		'prose prose-sm prose-slate max-w-none min-h-[140px] px-4 py-3 focus:outline-none';

	$effect(() => {
		if (currentSeasonId && !uploadSeasonId) {
			uploadSeasonId = currentSeasonId.toString();
		}
	});

	$effect(() => {
		if (!browser || uploadEditor || !uploadEditorHost) return;
		uploadEditor = new Editor({
			element: uploadEditorHost,
			extensions: [StarterKit],
			content: '',
			editorProps: {
				attributes: {
					class: editorClasses
				}
			}
		});
	});

	onDestroy(() => {
		uploadEditor?.destroy();
		editEditor?.destroy();
	});

	interface DateGroup {
		date: string;
		label: string;
		images: ImageEntry[];
	}

	let groupedImages: DateGroup[] = $derived.by(() => {
		const sorted = [...images].sort((a, b) => {
			const dateA = a.takenAt ?? a.uploadedAt;
			const dateB = b.takenAt ?? b.uploadedAt;
			return new Date(dateB).getTime() - new Date(dateA).getTime();
		});

		const groups = new Map<string, ImageEntry[]>();
		for (const img of sorted) {
			const raw = img.takenAt ?? img.uploadedAt;
			const dateKey = raw.split('T')[0];
			if (!groups.has(dateKey)) {
				groups.set(dateKey, []);
			}
			groups.get(dateKey)!.push(img);
		}

		const result: DateGroup[] = [];
		for (const [dateKey, imgs] of groups) {
			const d = new Date(dateKey + 'T00:00:00');
			result.push({
				date: dateKey,
				label: d.toLocaleDateString('en-US', {
					weekday: 'long',
					month: 'long',
					day: 'numeric',
					year: 'numeric'
				}),
				images: imgs
			});
		}
		return result;
	});

	function normalizeEditorHtml(html: string): string {
		const normalized = html.trim();
		return normalized === '<p></p>' || normalized === '<p><br></p>' ? '' : normalized;
	}

	function editorPlainText(html: string | null | undefined): string {
		if (!html) return '';
		if (!browser) return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
		const div = document.createElement('div');
		div.innerHTML = html;
		return div.textContent?.replace(/\s+/g, ' ').trim() ?? '';
	}

	function formatBytes(bytes: number): string {
		if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`;
		return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
	}

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		uploadError = '';
		uploadStatus = '';
		if (target.files && target.files.length > 0) {
			selectedFile = target.files[0];
		} else {
			selectedFile = null;
		}
	}

	async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
		if ('createImageBitmap' in window) {
			return await createImageBitmap(file);
		}

		const url = URL.createObjectURL(file);
		try {
			const img = new Image();
			img.decoding = 'async';
			await new Promise<void>((resolve, reject) => {
				img.onload = () => resolve();
				img.onerror = () => reject(new Error('Failed to load image'));
				img.src = url;
			});
			return img;
		} finally {
			URL.revokeObjectURL(url);
		}
	}

	async function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
		return await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(
				(blob) => {
					if (!blob) {
						reject(new Error('Failed to compress image'));
						return;
					}
					resolve(blob);
				},
				'image/jpeg',
				quality
			);
		});
	}

	async function compressImage(file: File): Promise<{ file: File; message: string }> {
		if (!browser || !file.type.startsWith('image/')) {
			return { file, message: '' };
		}

		const source = await loadBitmap(file);
		const sourceWidth = 'width' in source ? source.width : 0;
		const sourceHeight = 'height' in source ? source.height : 0;
		const maxDimension = 2200;
		const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
		let width = Math.max(1, Math.round(sourceWidth * scale));
		let height = Math.max(1, Math.round(sourceHeight * scale));

		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		if (!context) {
			throw new Error('Canvas is not available for image compression');
		}

		let quality = 0.9;
		let blob: Blob | null = null;
		const targetSize = 2 * 1024 * 1024;

		for (let attempt = 0; attempt < 6; attempt += 1) {
			canvas.width = width;
			canvas.height = height;
			context.clearRect(0, 0, width, height);
			context.drawImage(source, 0, 0, width, height);
			blob = await canvasToBlob(canvas, quality);

			if (blob.size <= targetSize || (quality <= 0.72 && attempt >= 3)) {
				break;
			}

			if (attempt % 2 === 1) {
				width = Math.max(1200, Math.round(width * 0.88));
				height = Math.max(1200, Math.round(height * 0.88));
			} else {
				quality = Math.max(0.72, quality - 0.08);
			}
		}

		if ('close' in source && typeof source.close === 'function') {
			source.close();
		}

		if (!blob) {
			return { file, message: '' };
		}

		const fileBase = file.name.replace(/\.[^.]+$/, '') || 'plant-photo';
		const compressedFile = new File([blob], `${fileBase}.jpg`, {
			type: 'image/jpeg',
			lastModified: Date.now()
		});

		const message =
			compressedFile.size < file.size
				? `Compressed ${formatBytes(file.size)} to ${formatBytes(compressedFile.size)} before upload.`
				: '';

		return { file: compressedFile, message };
	}

	function resetUploadForm() {
		selectedFile = null;
		takenAt = new Date().toISOString().split('T')[0];
		uploadSeasonId = currentSeasonId?.toString() ?? '';
		uploadEditor?.commands.clearContent();
		if (fileInput) {
			fileInput.value = '';
		}
	}

	async function handleUpload() {
		if (!selectedFile || uploading) return;

		uploading = true;
		uploadError = '';
		uploadStatus = '';

		try {
			const { file, message } = await compressImage(selectedFile);
			if (message) {
				uploadStatus = message;
			}

			await onUpload(
				file,
				normalizeEditorHtml(uploadEditor?.getHTML() ?? ''),
				takenAt,
				undefined,
				undefined,
				uploadSeasonId ? parseInt(uploadSeasonId) : undefined
			);

			uploadStatus = message || 'Photo uploaded.';
			resetUploadForm();
		} catch (error) {
			uploadError = error instanceof Error ? error.message : 'Failed to upload photo';
		} finally {
			uploading = false;
		}
	}

	async function startEditing(img: ImageEntry) {
		editingId = img.id;
		await tick();

		editEditor?.destroy();
		if (!editEditorHost) return;

		editEditor = new Editor({
			element: editEditorHost,
			extensions: [StarterKit],
			content: img.caption ?? '',
			editorProps: {
				attributes: {
					class: editorClasses
				}
			}
		});
		editEditor.commands.focus('end');
	}

	function stopEditing() {
		editEditor?.destroy();
		editEditor = null;
		editingId = null;
	}

	function saveCaption() {
		if (editingId === null || !editEditor) return;
		onUpdate(editingId, { caption: normalizeEditorHtml(editEditor.getHTML()) });
		stopEditing();
	}

	function startEditingTags(img: ImageEntry) {
		editingTagsId = img.id;
		editSeasonId = img.seasonId?.toString() ?? '';
	}

	function saveTags() {
		if (editingTagsId === null) return;
		onUpdate(editingTagsId, {
			seasonId: editSeasonId ? parseInt(editSeasonId) : null
		});
		editingTagsId = null;
	}

	function seasonName(seasonId: number | null | undefined): string {
		if (!seasonId) return '';
		return seasons.find((s) => s.id === seasonId)?.name ?? '';
	}

	function isActive(editor: Editor | null, type: string, attrs?: Record<string, unknown>): boolean {
		return editor?.isActive(type, attrs) ?? false;
	}

	let selectedImage: ImageEntry | null = $derived.by(
		() => images.find((img) => img.id === selectedImageId) ?? null
	);

	function openImageModal(img: ImageEntry) {
		selectedImageId = img.id;
	}

	function closeImageModal() {
		selectedImageId = null;
		if (editingId !== null) {
			stopEditing();
		}
		editingTagsId = null;
	}

	function formatDate(dateStr: string): string {
		const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
		return d.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<div class="space-y-6">
	<div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
		<p class="mb-3 text-sm font-medium text-slate-600">Add a photo</p>
		<div class="space-y-4">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-end">
				<div class="min-w-0 flex-1">
					<input
						bind:this={fileInput}
						type="file"
						accept="image/*"
						onchange={handleFileChange}
						class="w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border file:border-slate-200 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-50"
					/>
				</div>
				<input
					type="date"
					bind:value={takenAt}
					class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
				/>
				{#if seasons.length > 0}
					<div class="sm:w-44">
						<label class="mb-1 block text-xs text-slate-500">Season</label>
						<select
							bind:value={uploadSeasonId}
							class="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
						>
							<option value="">None</option>
							{#each seasons as s}
								<option value={s.id.toString()}>{s.name}</option>
							{/each}
						</select>
					</div>
				{/if}
			</div>

			<div>
				<label class="mb-1 block text-xs text-slate-500">Caption</label>
				<div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
					<div class="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-2">
						<button
							type="button"
							onclick={() => uploadEditor?.chain().focus().toggleBold().run()}
							class="rounded px-2 py-1 text-xs font-semibold transition {isActive(uploadEditor, 'bold') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}"
						>
							Bold
						</button>
						<button
							type="button"
							onclick={() => uploadEditor?.chain().focus().toggleItalic().run()}
							class="rounded px-2 py-1 text-xs transition {isActive(uploadEditor, 'italic') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}"
						>
							Italic
						</button>
						<button
							type="button"
							onclick={() => uploadEditor?.chain().focus().toggleBulletList().run()}
							class="rounded px-2 py-1 text-xs transition {isActive(uploadEditor, 'bulletList') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}"
						>
							List
						</button>
						<button
							type="button"
							onclick={() => uploadEditor?.chain().focus().toggleOrderedList().run()}
							class="rounded px-2 py-1 text-xs transition {isActive(uploadEditor, 'orderedList') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}"
						>
							Numbered
						</button>
						<button
							type="button"
							onclick={() => uploadEditor?.chain().focus().toggleHeading({ level: 3 }).run()}
							class="rounded px-2 py-1 text-xs transition {isActive(uploadEditor, 'heading', { level: 3 }) ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}"
						>
							Heading
						</button>
						<div class="flex-1"></div>
						<button
							type="button"
							onclick={() => uploadEditor?.commands.clearContent()}
							class="rounded px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
						>
							Clear
						</button>
					</div>
					<div bind:this={uploadEditorHost}></div>
				</div>
				<p class="mt-1 text-xs text-slate-400">Photos are resized in the browser before upload to keep them manageable.</p>
			</div>

			{#if selectedFile}
				<p class="text-xs text-slate-500">
					Selected: {selectedFile.name} ({formatBytes(selectedFile.size)})
				</p>
			{/if}
			{#if uploadStatus}
				<p class="text-xs text-emerald-600">{uploadStatus}</p>
			{/if}
			{#if uploadError}
				<p class="text-xs text-red-600">{uploadError}</p>
			{/if}

			<div class="flex justify-end">
				<button
					type="button"
					onclick={handleUpload}
					disabled={!selectedFile || uploading}
					class="rounded-lg bg-slate-800 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
				>
					{uploading ? 'Uploading...' : 'Upload'}
				</button>
			</div>
		</div>
	</div>

	{#if groupedImages.length === 0}
		<p class="py-8 text-center text-sm text-slate-400">
			No photos yet. Upload your first photo to start tracking growth.
		</p>
	{:else}
		<div class="space-y-8">
			{#each groupedImages as group (group.date)}
				<div>
					<h3 class="mb-3 text-sm font-semibold text-slate-500">{group.label}</h3>
					<div class="grid gap-5 lg:grid-cols-2">
						{#each group.images as img (img.id)}
							<button
								type="button"
								onclick={() => openImageModal(img)}
								class="group overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
							>
								<div class="flex h-80 items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(226,232,240,0.75),_rgba(248,250,252,0.95)_65%)] p-4">
									<img
										src={img.imagePath}
										alt={editorPlainText(img.caption) || 'Plant photo'}
										class="max-h-full w-full rounded-2xl object-contain shadow-[0_16px_40px_-24px_rgba(15,23,42,0.5)]"
									/>
									<div class="pointer-events-none absolute"></div>
								</div>

								<div class="space-y-3 px-5 py-4">
									<div class="flex items-start justify-between gap-3">
										<div class="min-w-0">
											<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
												{formatDate(img.takenAt ?? img.uploadedAt)}
											</p>
											{#if img.caption}
												<p class="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
													{editorPlainText(img.caption)}
												</p>
											{:else}
												<p class="mt-2 text-sm italic text-slate-300">No caption yet</p>
											{/if}
										</div>
										<span class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">
											Open
										</span>
									</div>

									{#if img.seasonId}
										<div class="mt-2 flex flex-wrap gap-1.5">
											<span class="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
												{seasonName(img.seasonId)}
											</span>
										</div>
									{/if}
								</div>
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if selectedImage}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
		onclick={(e) => {
			if (e.target === e.currentTarget) closeImageModal();
		}}
	>
		<div class="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl lg:flex-row">
			<div class="flex min-h-[320px] flex-1 items-center justify-center bg-[linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)] p-6">
				<img
					src={selectedImage.imagePath}
					alt={editorPlainText(selectedImage.caption) || 'Plant photo'}
					class="max-h-[72vh] w-full rounded-2xl object-contain"
				/>
			</div>

			<div class="flex w-full max-w-xl flex-col border-t border-slate-200 lg:border-l lg:border-t-0">
				<div class="flex items-start justify-between border-b border-slate-100 px-6 py-5">
					<div>
						<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
							Growth entry
						</p>
						<p class="mt-2 text-sm text-slate-500">
							{formatDate(selectedImage.takenAt ?? selectedImage.uploadedAt)}
						</p>
					</div>
					<button
						type="button"
						onclick={closeImageModal}
						class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
						aria-label="Close"
					>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<div class="flex-1 space-y-5 overflow-y-auto px-6 py-5">
					{#if editingId === selectedImage.id}
						<div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
							<div class="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-2">
								<button
									type="button"
									onclick={() => editEditor?.chain().focus().toggleBold().run()}
									class="rounded px-2 py-1 text-xs font-semibold transition {isActive(editEditor, 'bold') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}"
								>
									Bold
								</button>
								<button
									type="button"
									onclick={() => editEditor?.chain().focus().toggleItalic().run()}
									class="rounded px-2 py-1 text-xs transition {isActive(editEditor, 'italic') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}"
								>
									Italic
								</button>
								<button
									type="button"
									onclick={() => editEditor?.chain().focus().toggleBulletList().run()}
									class="rounded px-2 py-1 text-xs transition {isActive(editEditor, 'bulletList') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}"
								>
									List
								</button>
								<div class="flex-1"></div>
								<button
									type="button"
									onclick={stopEditing}
									class="rounded px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
								>
									Cancel
								</button>
								<button
									type="button"
									onclick={saveCaption}
									class="rounded bg-slate-900 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-slate-800"
								>
									Save
								</button>
							</div>
							<div bind:this={editEditorHost}></div>
						</div>
					{:else if selectedImage.caption}
						<div class="rounded-xl border border-slate-200 bg-white p-5">
							<div class="prose prose-sm prose-slate max-w-none text-slate-700">
								{@html selectedImage.caption}
							</div>
						</div>
					{:else}
						<div class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm italic text-slate-400">
							No caption yet.
						</div>
					{/if}

					{#if selectedImage.seasonId}
						<div class="flex flex-wrap gap-2">
							<span class="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
								{seasonName(selectedImage.seasonId)}
							</span>
						</div>
					{/if}

					{#if editingTagsId === selectedImage.id}
						<div class="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
							{#if seasons.length > 0}
								<div>
									<label class="mb-0.5 block text-[10px] text-slate-500">Season</label>
									<select
										bind:value={editSeasonId}
										class="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
									>
										<option value="">None</option>
										{#each seasons as s}
											<option value={s.id.toString()}>{s.name}</option>
										{/each}
									</select>
								</div>
							{/if}
							<button
								type="button"
								onclick={saveTags}
								class="rounded bg-slate-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-700"
							>
								Save
							</button>
							<button
								type="button"
								onclick={() => (editingTagsId = null)}
								class="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
							>
								Cancel
							</button>
						</div>
					{/if}
				</div>

				<div class="flex flex-wrap items-center gap-2 border-t border-slate-100 px-6 py-4">
					<button
						type="button"
						onclick={() => startEditing(selectedImage)}
						class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
					>
						Edit caption
					</button>
					{#if seasons.length > 0}
						<button
							type="button"
							onclick={() => startEditingTags(selectedImage)}
							class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
						>
							Edit season
						</button>
					{/if}
					<button
						type="button"
						onclick={() => {
							onDelete(selectedImage.id);
							closeImageModal();
						}}
						class="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-100"
					>
						Delete photo
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
