<script lang="ts">
	import { activeSeason } from '$lib/stores/season';
	import JournalEntryCard from '$lib/components/JournalEntryCard.svelte';
	import type { JournalEntry, JournalImage, Plant, Bed } from '$lib/db/queries';
	import { ZONES } from '$lib/utils/zones';

	let entries: JournalEntry[] = $state([]);
	let searchQuery = $state('');
	let loading = $state(false);

	// Images per entry (keyed by entry ID)
	let entryImages: Map<number, JournalImage[]> = $state(new Map());
	let allBeds: Bed[] = $state([]);

	// Inline create/edit form state
	let showForm = $state(false);
	let editingEntry: JournalEntry | null = $state(null);
	let formTitle = $state('');
	let formContent = $state('');
	let formDate = $state(new Date().toISOString().split('T')[0]);
	let formTags = $state('');
	let saving = $state(false);

	// Photo form state
	let formPhotos: File[] = $state([]);
	let existingPhotos: JournalImage[] = $state([]);
	let photosToDelete: number[] = $state([]);
	let fileInput: HTMLInputElement;

	// Planting log state
	interface PlantingEntry {
		id: number;
		plantId: number;
		plantName: string;
		plantVariety: string | null;
		sourceType: string | null;
		activityDate: string;
		description: string | null;
	}

	let allPlants: Plant[] = $state([]);
	let plantingEntries: PlantingEntry[] = $state([]);
	let showPlantingForm = $state(false);
	let plantingPlantId = $state('');
	let plantingDate = $state(new Date().toISOString().split('T')[0]);
	let plantingSourceType = $state('seed');
	let plantingDescription = $state('');
	let savingPlanting = $state(false);

	// Debounced search
	let searchTimeout: ReturnType<typeof setTimeout> | undefined;

	// Reload entries when the active season changes
	$effect(() => {
		const season = $activeSeason;
		loadEntries();
		loadPlantingLog();
		loadPlants();
		loadBeds();
	});

	async function loadPlants() {
		try {
			const res = await fetch('/api/plants');
			if (res.ok) {
				allPlants = await res.json();
			}
		} catch (err) {
			console.error('Failed to load plants:', err);
		}
	}

	async function loadBeds() {
		try {
			const res = await fetch('/api/beds');
			if (res.ok) allBeds = await res.json();
		} catch (err) {
			console.error('Failed to load beds:', err);
		}
	}

	async function loadEntryImages() {
		if (entries.length === 0) {
			entryImages = new Map();
			return;
		}
		try {
			const ids = entries.map((e) => e.id).join(',');
			const res = await fetch(`/api/journal/images?entryIds=${ids}`);
			if (res.ok) {
				const images: JournalImage[] = await res.json();
				const map = new Map<number, JournalImage[]>();
				for (const img of images) {
					const list = map.get(img.journalEntryId) ?? [];
					list.push(img);
					map.set(img.journalEntryId, list);
				}
				entryImages = map;
			}
		} catch (err) {
			console.error('Failed to load entry images:', err);
		}
	}

	async function loadPlantingLog() {
		try {
			const params = new URLSearchParams();
			if ($activeSeason?.id) {
				params.set('seasonId', $activeSeason.id.toString());
			}
			const res = await fetch(`/api/activities?${params}`);
			if (res.ok) {
				plantingEntries = await res.json();
			}
		} catch (err) {
			console.error('Failed to load planting log:', err);
		}
	}

	async function loadEntries() {
		loading = true;
		try {
			const params = new URLSearchParams();
			if ($activeSeason?.id) {
				params.set('seasonId', $activeSeason.id.toString());
			}
			if (searchQuery.trim()) {
				params.set('search', searchQuery.trim());
			}
			const res = await fetch(`/api/journal?${params}`);
			if (res.ok) {
				entries = await res.json();
				await loadEntryImages();
			}
		} catch (err) {
			console.error('Failed to load journal entries:', err);
		} finally {
			loading = false;
		}
	}

	function handleSearchInput(value: string) {
		searchQuery = value;
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			loadEntries();
		}, 300);
	}

	function openNewForm() {
		editingEntry = null;
		formTitle = '';
		formContent = '';
		formDate = new Date().toISOString().split('T')[0];
		formTags = '';
		formPhotos = [];
		existingPhotos = [];
		photosToDelete = [];
		showForm = true;
	}

	function openEditForm(entry: JournalEntry) {
		editingEntry = entry;
		formTitle = entry.title;
		formContent = entry.content;
		formDate = entry.entryDate;
		formTags = entry.tags ? JSON.parse(entry.tags).join(', ') : '';
		formPhotos = [];
		existingPhotos = [...(entryImages.get(entry.id) ?? [])];
		photosToDelete = [];
		showForm = true;
	}

	function cancelForm() {
		showForm = false;
		editingEntry = null;
		formPhotos = [];
		existingPhotos = [];
		photosToDelete = [];
	}

	async function saveEntry() {
		if (!formTitle.trim() || !formDate) return;
		saving = true;

		const tagsArray = formTags
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);

		const body = {
			title: formTitle.trim(),
			content: formContent.trim(),
			entryDate: formDate,
			tags: tagsArray.length > 0 ? JSON.stringify(tagsArray) : null,
			seasonId: $activeSeason?.id ?? null
		};

		try {
			let entryId: number;

			if (editingEntry) {
				const res = await fetch(`/api/journal/${editingEntry.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				});
				if (!res.ok) throw new Error('Failed to update');
				entryId = editingEntry.id;
			} else {
				const res = await fetch('/api/journal', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				});
				if (!res.ok) throw new Error('Failed to create');
				const created = await res.json();
				entryId = created.id;
			}

			// Upload new photos
			for (const file of formPhotos) {
				const fd = new FormData();
				fd.append('image', file);
				await fetch(`/api/journal/${entryId}/images`, { method: 'POST', body: fd });
			}

			// Delete removed photos
			for (const imageId of photosToDelete) {
				await fetch(`/api/journal/${entryId}/images/${imageId}`, { method: 'DELETE' });
			}

			showForm = false;
			editingEntry = null;
			formPhotos = [];
			existingPhotos = [];
			photosToDelete = [];
			await loadEntries();
		} catch (err) {
			console.error('Failed to save journal entry:', err);
		} finally {
			saving = false;
		}
	}

	async function updatePhotoAssignment(photo: JournalImage, newBedId: number | null, newZone: string | null) {
		const entryId = photo.journalEntryId;
		try {
			const res = await fetch(`/api/journal/${entryId}/images/${photo.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ bedId: newBedId, zone: newBedId ? newZone : null })
			});
			if (res.ok) {
				const updated = await res.json();
				existingPhotos = existingPhotos.map((p) => (p.id === photo.id ? updated : p));
				// Also update the main images map
				const list = entryImages.get(entryId) ?? [];
				entryImages.set(entryId, list.map((p) => (p.id === photo.id ? updated : p)));
				entryImages = new Map(entryImages);
			}
		} catch (err) {
			console.error('Failed to update photo assignment:', err);
		}
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files) {
			formPhotos = [...formPhotos, ...Array.from(input.files)];
			input.value = '';
		}
	}

	function removeNewPhoto(index: number) {
		formPhotos = formPhotos.filter((_, i) => i !== index);
	}

	function markPhotoForDelete(id: number) {
		photosToDelete = [...photosToDelete, id];
	}

	let visibleExistingPhotos = $derived(
		existingPhotos.filter((p) => !photosToDelete.includes(p.id))
	);

	async function deleteEntry(id: number) {
		try {
			const res = await fetch(`/api/journal/${id}`, { method: 'DELETE' });
			if (res.ok) {
				await loadEntries();
			}
		} catch (err) {
			console.error('Failed to delete journal entry:', err);
		}
	}

	// Planting log functions
	function openPlantingForm() {
		plantingPlantId = '';
		plantingDate = new Date().toISOString().split('T')[0];
		plantingSourceType = 'seed';
		plantingDescription = '';
		showPlantingForm = true;
	}

	function cancelPlantingForm() {
		showPlantingForm = false;
	}

	async function savePlanting() {
		if (!plantingPlantId || !plantingDate) return;
		savingPlanting = true;

		try {
			const res = await fetch(`/api/plants/${plantingPlantId}/activities`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					activityType: 'planted',
					sourceType: plantingSourceType,
					description: plantingDescription.trim() || null,
					activityDate: plantingDate,
					seasonId: $activeSeason?.id ?? null
				})
			});
			if (!res.ok) throw new Error('Failed to save');
			showPlantingForm = false;
			await loadPlantingLog();
		} catch (err) {
			console.error('Failed to log planting:', err);
		} finally {
			savingPlanting = false;
		}
	}

	async function deletePlanting(id: number) {
		try {
			const res = await fetch(`/api/activities/${id}`, { method: 'DELETE' });
			if (res.ok) {
				await loadPlantingLog();
			}
		} catch (err) {
			console.error('Failed to delete planting entry:', err);
		}
	}

	function formatTimelineDate(dateStr: string): string {
		const d = new Date(dateStr + 'T00:00:00');
		return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}

	function formatDate(dateStr: string): string {
		const d = new Date(dateStr + 'T00:00:00');
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	let groupedEntries = $derived.by(() => {
		const groups: { date: string; label: string; entries: JournalEntry[] }[] = [];
		const map = new Map<string, JournalEntry[]>();

		for (const entry of entries) {
			const key = entry.entryDate;
			if (!map.has(key)) {
				map.set(key, []);
			}
			map.get(key)!.push(entry);
		}

		for (const [date, dateEntries] of map) {
			groups.push({
				date,
				label: formatTimelineDate(date),
				entries: dateEntries
			});
		}

		groups.sort((a, b) => b.date.localeCompare(a.date));
		return groups;
	});
</script>

<div class="space-y-6">
	<!-- Page header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-lg font-semibold text-slate-900">Journal</h1>
			<p class="text-sm text-slate-500">Notes, observations, and garden logs.</p>
		</div>
		<div class="flex gap-2">
			<button
				onclick={openPlantingForm}
				class="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-100"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Log Planting
			</button>
			<button
				onclick={openNewForm}
				class="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-slate-900 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				New Entry
			</button>
		</div>
	</div>

	<!-- Planting Log Form -->
	{#if showPlantingForm}
		<div class="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 shadow-sm">
			<h2 class="text-sm font-semibold text-slate-900">Log a Planting</h2>
			<div class="mt-4 space-y-3">
				<div class="flex flex-col gap-3 sm:flex-row">
					<div class="flex-1">
						<label class="mb-1 block text-xs font-medium text-slate-600">Plant</label>
						<select
							bind:value={plantingPlantId}
							class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
						>
							<option value="">Select a plant...</option>
							{#each allPlants as p}
								<option value={p.id}>{p.name}{p.variety ? ` - ${p.variety}` : ''}</option>
							{/each}
						</select>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-slate-600">Date</label>
						<input
							type="date"
							bind:value={plantingDate}
							class="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
						/>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-slate-600">Source</label>
						<select
							bind:value={plantingSourceType}
							class="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
						>
							<option value="seed">Seed</option>
							<option value="transplant">Transplant</option>
						</select>
					</div>
				</div>
				<input
					type="text"
					placeholder="Notes (optional)"
					bind:value={plantingDescription}
					class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
				/>
				<div class="flex gap-2 pt-1">
					<button
						onclick={savePlanting}
						disabled={savingPlanting || !plantingPlantId}
						class="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{savingPlanting ? 'Saving...' : 'Log Planting'}
					</button>
					<button
						onclick={cancelPlantingForm}
						class="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Planting Log -->
	{#if plantingEntries.length > 0}
		<div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
			<h2 class="mb-3 text-sm font-semibold text-slate-900">Planting Log</h2>
			<div class="space-y-2">
				{#each plantingEntries as entry (entry.id)}
					<div class="group flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-2.5">
						<div class="flex flex-wrap items-center gap-2">
							<span class="text-sm font-medium text-slate-700">{entry.plantName}</span>
							{#if entry.plantVariety}
								<span class="text-sm text-slate-400">{entry.plantVariety}</span>
							{/if}
							<span class="rounded-full border px-2 py-0.5 text-xs font-medium capitalize {entry.sourceType === 'seed' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}">
								{entry.sourceType ?? 'planted'}
							</span>
							<span class="text-xs text-slate-400">{formatDate(entry.activityDate)}</span>
							{#if entry.description}
								<span class="text-xs text-slate-500">— {entry.description}</span>
							{/if}
						</div>
						<button
							onclick={() => deletePlanting(entry.id)}
							class="flex-shrink-0 rounded p-1 text-slate-300 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
							aria-label="Delete planting entry"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
							</svg>
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Search bar -->
	<div class="relative">
		<svg
			class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
			/>
		</svg>
		<input
			type="text"
			placeholder="Search journal entries..."
			value={searchQuery}
			oninput={(e) => handleSearchInput(e.currentTarget.value)}
			class="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 placeholder-slate-400 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
		/>
	</div>

	<!-- Inline create / edit form -->
	{#if showForm}
		<div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
			<h2 class="text-sm font-semibold text-slate-900">
				{editingEntry ? 'Edit Entry' : 'New Journal Entry'}
			</h2>
			<div class="mt-4 space-y-3">
				<input
					type="text"
					placeholder="Title"
					bind:value={formTitle}
					class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
				/>
				<textarea
					placeholder="Write your notes..."
					bind:value={formContent}
					rows="4"
					class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
				></textarea>

				<!-- Photos -->
				<div>
					<label class="mb-1.5 block text-xs font-medium text-slate-600">Photos</label>

					{#if visibleExistingPhotos.length > 0 || formPhotos.length > 0}
						<div class="mb-2 space-y-2">
							<!-- Existing photos with bed/zone assignment -->
							{#each visibleExistingPhotos as photo (photo.id)}
								<div class="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-2">
									<img src={photo.imagePath} alt={photo.caption || 'Photo'} class="h-16 w-16 flex-shrink-0 rounded-lg border border-slate-200 object-cover" />
									<div class="flex flex-1 flex-col gap-1.5">
										<div class="flex gap-2">
											<select
												value={photo.bedId ?? ''}
												onchange={(e) => updatePhotoAssignment(photo, e.currentTarget.value ? Number(e.currentTarget.value) : null, photo.zone)}
												class="h-7 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700"
											>
												<option value="">No bed</option>
												{#each allBeds as bed}
													<option value={bed.id}>{bed.name}</option>
												{/each}
											</select>
											{#if photo.bedId}
												<select
													value={photo.zone ?? ''}
													onchange={(e) => updatePhotoAssignment(photo, photo.bedId, e.currentTarget.value || null)}
													class="h-7 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700"
												>
													<option value="">No zone</option>
													{#each ZONES as z}
														<option value={z}>{z}</option>
													{/each}
												</select>
											{/if}
										</div>
									</div>
									<button
										type="button"
										onclick={() => markPhotoForDelete(photo.id)}
										class="flex-shrink-0 rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
										aria-label="Remove photo"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
										</svg>
									</button>
								</div>
							{/each}

							<!-- New photo previews -->
							{#each formPhotos as file, i}
								<div class="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-2">
									<img src={URL.createObjectURL(file)} alt={file.name} class="h-16 w-16 flex-shrink-0 rounded-lg border border-slate-200 object-cover" />
									<span class="flex-1 truncate text-xs text-slate-500">{file.name}</span>
									<button
										type="button"
										onclick={() => removeNewPhoto(i)}
										class="flex-shrink-0 rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
										aria-label="Remove photo"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</div>
							{/each}
						</div>
					{/if}

					<input
						bind:this={fileInput}
						type="file"
						accept="image/*"
						multiple
						onchange={handleFileSelect}
						class="hidden"
					/>
					<button
						type="button"
						onclick={() => fileInput?.click()}
						class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-3 text-xs font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
					>
						<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
						Add Photos
					</button>
				</div>

				<div class="flex flex-col gap-3 sm:flex-row">
					<input
						type="date"
						bind:value={formDate}
						class="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
					/>
					<input
						type="text"
						placeholder="Tags (comma separated)"
						bind:value={formTags}
						class="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
					/>
				</div>
				<div class="flex gap-2 pt-1">
					<button
						onclick={saveEntry}
						disabled={saving || !formTitle.trim()}
						class="inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{saving ? 'Saving...' : editingEntry ? 'Update' : 'Save'}
					</button>
					<button
						onclick={cancelForm}
						class="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Timeline -->
	{#if loading}
		<div class="py-16 text-center">
			<p class="text-sm text-slate-400">Loading entries...</p>
		</div>
	{:else if groupedEntries.length === 0}
		<div class="py-16 text-center">
			<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
				<svg class="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
					/>
				</svg>
			</div>
			<p class="text-sm font-medium text-slate-600">No journal entries yet</p>
			<p class="mt-1 text-sm text-slate-400">Create your first entry to start tracking your garden.</p>
		</div>
	{:else}
		<div class="relative ml-3 border-l-2 border-slate-200 pl-6">
			{#each groupedEntries as group (group.date)}
				<!-- Date label -->
				<div class="relative pb-2">
					<div class="absolute -left-[29px] top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-400"></div>
					<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>
				</div>

				<!-- Entries for that date -->
				<div class="space-y-3 pb-6">
					{#each group.entries as entry (entry.id)}
						<JournalEntryCard
							{entry}
							images={entryImages.get(entry.id) ?? []}
							beds={allBeds}
							onEdit={() => openEditForm(entry)}
							onDelete={() => deleteEntry(entry.id)}
						/>
					{/each}
				</div>
			{/each}
		</div>
	{/if}
</div>
