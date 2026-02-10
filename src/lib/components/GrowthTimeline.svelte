<script lang="ts">
	import { ZONES } from '$lib/utils/zones';

	interface Bed {
		id: number;
		name: string;
	}

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
		bedId?: number | null;
		zone?: string | null;
		seasonId?: number | null;
	}

	interface Props {
		images: ImageEntry[];
		onUpload: (file: File, caption: string, takenAt: string, bedId?: number, zone?: string, seasonId?: number) => void;
		onUpdate: (imageId: number, data: { caption?: string; bedId?: number | null; zone?: string | null; seasonId?: number | null }) => void;
		onDelete: (imageId: number) => void;
		beds?: Bed[];
		seasons?: Season[];
		currentSeasonId?: number | null;
	}

	let { images, onUpload, onUpdate, onDelete, beds = [], seasons = [], currentSeasonId = null }: Props = $props();

	let fileInput: HTMLInputElement | undefined = $state();
	let selectedFile: File | null = $state(null);
	let caption = $state('');
	let takenAt = $state(new Date().toISOString().split('T')[0]);
	let uploadBedId = $state('');
	let uploadZone = $state('');
	let uploadSeasonId: string = $state('');
	let editingId: number | null = $state(null);
	let editingCaption = $state('');
	let editingTagsId: number | null = $state(null);
	let editBedId = $state('');
	let editZone = $state('');
	let editSeasonId = $state('');

	// Default season to current active season
	$effect(() => {
		if (currentSeasonId && !uploadSeasonId) {
			uploadSeasonId = currentSeasonId.toString();
		}
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

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			selectedFile = target.files[0];
		} else {
			selectedFile = null;
		}
	}

	function handleUpload() {
		if (!selectedFile) return;
		onUpload(
			selectedFile,
			caption.trim(),
			takenAt,
			uploadBedId ? parseInt(uploadBedId) : undefined,
			uploadZone || undefined,
			uploadSeasonId ? parseInt(uploadSeasonId) : undefined
		);
		selectedFile = null;
		caption = '';
		takenAt = new Date().toISOString().split('T')[0];
		uploadBedId = '';
		uploadZone = '';
		uploadSeasonId = currentSeasonId?.toString() ?? '';
		if (fileInput) {
			fileInput.value = '';
		}
	}

	function startEditing(img: ImageEntry) {
		editingId = img.id;
		editingCaption = img.caption ?? '';
	}

	function saveCaption() {
		if (editingId === null) return;
		onUpdate(editingId, { caption: editingCaption.trim() });
		editingId = null;
		editingCaption = '';
	}

	function handleCaptionKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			saveCaption();
		} else if (e.key === 'Escape') {
			editingId = null;
			editingCaption = '';
		}
	}

	function startEditingTags(img: ImageEntry) {
		editingTagsId = img.id;
		editBedId = img.bedId?.toString() ?? '';
		editZone = img.zone ?? '';
		editSeasonId = img.seasonId?.toString() ?? '';
	}

	function saveTags() {
		if (editingTagsId === null) return;
		onUpdate(editingTagsId, {
			bedId: editBedId ? parseInt(editBedId) : null,
			zone: editZone || null,
			seasonId: editSeasonId ? parseInt(editSeasonId) : null
		});
		editingTagsId = null;
	}

	function bedName(bedId: number | null | undefined): string {
		if (!bedId) return '';
		return beds.find((b) => b.id === bedId)?.name ?? '';
	}

	function seasonName(seasonId: number | null | undefined): string {
		if (!seasonId) return '';
		return seasons.find((s) => s.id === seasonId)?.name ?? '';
	}

	function zoneLabel(zone: string): string {
		return zone.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
	}
</script>

<div class="space-y-6">
	<!-- Upload section -->
	<div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
		<p class="mb-3 text-sm font-medium text-slate-600">Add a photo</p>
		<div class="flex flex-col gap-3">
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
					type="text"
					bind:value={caption}
					placeholder="Caption (optional)"
					class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 sm:w-48"
				/>
				<input
					type="date"
					bind:value={takenAt}
					class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
				/>
			</div>
			{#if beds.length > 0 || seasons.length > 0}
				<div class="flex flex-col gap-3 sm:flex-row sm:items-end">
					{#if beds.length > 0}
						<div class="sm:w-40">
							<label class="mb-1 block text-xs text-slate-500">Bed (optional)</label>
							<select
								bind:value={uploadBedId}
								onchange={() => { if (!uploadBedId) uploadZone = ''; }}
								class="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
							>
								<option value="">None</option>
								{#each beds as bed}
									<option value={bed.id.toString()}>{bed.name}</option>
								{/each}
							</select>
						</div>
						{#if uploadBedId}
							<div class="sm:w-40">
								<label class="mb-1 block text-xs text-slate-500">Zone</label>
								<select
									bind:value={uploadZone}
									class="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
								>
									<option value="">None</option>
									{#each ZONES as z}
										<option value={z}>{zoneLabel(z)}</option>
									{/each}
								</select>
							</div>
						{/if}
					{/if}
					{#if seasons.length > 0}
						<div class="sm:w-40">
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
			{/if}
			<div class="flex justify-end">
				<button
					onclick={handleUpload}
					disabled={!selectedFile}
					class="rounded-lg bg-slate-800 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
				>
					Upload
				</button>
			</div>
		</div>
	</div>

	<!-- Photo timeline -->
	{#if groupedImages.length === 0}
		<p class="py-8 text-center text-sm text-slate-400">
			No photos yet. Upload your first photo to start tracking growth.
		</p>
	{:else}
		<div class="space-y-8">
			{#each groupedImages as group (group.date)}
				<!-- Date header -->
				<div>
					<h3 class="mb-3 text-sm font-semibold text-slate-500">{group.label}</h3>
					<div class="space-y-4">
						{#each group.images as img (img.id)}
							<div class="group rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md overflow-hidden">
								<!-- Image -->
								<img
									src={img.imagePath}
									alt={img.caption ?? 'Plant photo'}
									class="w-full rounded-t-xl object-cover max-h-64"
								/>

								<!-- Caption, tags, and controls -->
								<div class="px-4 py-3">
									<div class="flex items-center justify-between gap-2">
										<div class="min-w-0 flex-1">
											{#if editingId === img.id}
												<input
													type="text"
													bind:value={editingCaption}
													onkeydown={handleCaptionKeydown}
													onblur={saveCaption}
													class="w-full rounded border border-slate-300 px-2 py-1 text-sm italic text-slate-600 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
													autofocus
												/>
											{:else if img.caption}
												<p class="text-sm italic text-slate-500">{img.caption}</p>
											{:else}
												<p class="text-sm italic text-slate-300">No caption</p>
											{/if}
										</div>

										<div class="flex items-center gap-1 sm:opacity-0 transition-opacity group-hover:opacity-100">
											<!-- Edit caption button -->
											<button
												onclick={() => startEditing(img)}
												class="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
												aria-label="Edit caption"
											>
												<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
													<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
												</svg>
											</button>
											<!-- Edit tags button -->
											{#if beds.length > 0 || seasons.length > 0}
												<button
													onclick={() => startEditingTags(img)}
													class="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
													aria-label="Edit location tags"
												>
													<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
														<path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
													</svg>
												</button>
											{/if}
											<!-- Delete button -->
											<button
												onclick={() => onDelete(img.id)}
												class="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500"
												aria-label="Delete photo"
											>
												<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
													<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
												</svg>
											</button>
										</div>
									</div>

									<!-- Location/season badges -->
									{#if img.bedId || img.seasonId}
										<div class="mt-2 flex flex-wrap gap-1.5">
											{#if img.bedId}
												<span class="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
													{bedName(img.bedId)}{img.zone ? ` \u00B7 ${zoneLabel(img.zone)}` : ''}
												</span>
											{/if}
											{#if img.seasonId}
												<span class="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
													{seasonName(img.seasonId)}
												</span>
											{/if}
										</div>
									{/if}

									<!-- Tag editing inline -->
									{#if editingTagsId === img.id}
										<div class="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
											{#if beds.length > 0}
												<div>
													<label class="mb-0.5 block text-[10px] text-slate-500">Bed</label>
													<select
														bind:value={editBedId}
														onchange={() => { if (!editBedId) editZone = ''; }}
														class="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
													>
														<option value="">None</option>
														{#each beds as bed}
															<option value={bed.id.toString()}>{bed.name}</option>
														{/each}
													</select>
												</div>
												{#if editBedId}
													<div>
														<label class="mb-0.5 block text-[10px] text-slate-500">Zone</label>
														<select
															bind:value={editZone}
															class="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
														>
															<option value="">None</option>
															{#each ZONES as z}
																<option value={z}>{zoneLabel(z)}</option>
															{/each}
														</select>
													</div>
												{/if}
											{/if}
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
												onclick={saveTags}
												class="rounded bg-slate-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-700"
											>
												Save
											</button>
											<button
												onclick={() => (editingTagsId = null)}
												class="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
											>
												Cancel
											</button>
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
