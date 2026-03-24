<script lang="ts">
	import { activeSeason } from '$lib/stores/season';
	import JournalEntryCard from '$lib/components/JournalEntryCard.svelte';
	import JournalEntryDetailModal from '$lib/components/JournalEntryDetailModal.svelte';
	import JournalCalendar from '$lib/components/JournalCalendar.svelte';
	import TiptapEditor from '$lib/components/TiptapEditor.svelte';
	import type { JournalEntry, JournalImage, Plant, Bed } from '$lib/db/queries';
	import { ZONES } from '$lib/utils/zones';

	let entries: JournalEntry[] = $state([]);
	let modalEntry: JournalEntry | null = $state(null);
	let modalOpen = $state(false);
	let searchQuery = $state('');
	let loading = $state(false);

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

	// Tag filter
	let selectedTags = $state<string[]>([]);

	// Date filter (from calendar)
	let dateFilter = $state<string | null>(null);

	// Planting log state
	interface PlantingEntry {
		id: number;
		plantId: number;
		plantName: string;
		plantVariety: string | null;
		activityType: string;
		sourceType: string | null;
		activityDate: string;
		description: string | null;
	}

	const ACTIVITY_COLORS: Record<string, string> = {
		planted: 'border-emerald-200 bg-emerald-50 text-emerald-700',
		watered: 'border-sky-200 bg-sky-50 text-sky-700',
		fertilized: 'border-amber-200 bg-amber-50 text-amber-700',
		harvested: 'border-green-200 bg-green-50 text-green-700',
		pruned: 'border-orange-200 bg-orange-50 text-orange-700',
		note: 'border-slate-200 bg-slate-50 text-slate-700'
	};

	let allPlants: Plant[] = $state([]);
	let plantingEntries: PlantingEntry[] = $state([]);
	let showPlantingForm = $state(false);
	let plantingPlantId = $state('');
	let plantingDate = $state(new Date().toISOString().split('T')[0]);
	let plantingSourceType = $state('seed');
	let plantingDescription = $state('');
	let savingPlanting = $state(false);

	let searchTimeout: ReturnType<typeof setTimeout> | undefined;

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
			if (res.ok) allPlants = await res.json();
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
		if (entries.length === 0) { entryImages = new Map(); return; }
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
			if ($activeSeason?.id) params.set('seasonId', $activeSeason.id.toString());
			const res = await fetch(`/api/activities?${params}`);
			if (res.ok) plantingEntries = await res.json();
		} catch (err) {
			console.error('Failed to load planting log:', err);
		}
	}

	async function loadEntries() {
		loading = true;
		try {
			const params = new URLSearchParams();
			if ($activeSeason?.id) params.set('seasonId', $activeSeason.id.toString());
			if (searchQuery.trim()) params.set('search', searchQuery.trim());
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
		searchTimeout = setTimeout(() => { loadEntries(); }, 300);
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

		const tagsArray = formTags.split(',').map((t) => t.trim()).filter(Boolean);

		const body = {
			title: formTitle.trim(),
			content: formContent,
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

			for (const file of formPhotos) {
				const fd = new FormData();
				fd.append('image', file);
				const uploadRes = await fetch(`/api/journal/${entryId}/images`, { method: 'POST', body: fd });
				if (!uploadRes.ok) {
					const err = await uploadRes.json().catch(() => ({}));
					throw new Error(err.error || `Failed to upload ${file.name}`);
				}
			}

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

	let visibleExistingPhotos = $derived(existingPhotos.filter((p) => !photosToDelete.includes(p.id)));

	async function deleteEntry(id: number) {
		try {
			const res = await fetch(`/api/journal/${id}`, { method: 'DELETE' });
			if (res.ok) {
				if (modalEntry?.id === id) { modalOpen = false; modalEntry = null; }
				await loadEntries();
			}
		} catch (err) {
			console.error('Failed to delete journal entry:', err);
		}
	}

	function openEntryModal(entry: JournalEntry) {
		modalEntry = entry;
		modalOpen = true;
	}

	async function saveModalEntry(data: { title: string; content: string; entryDate: string; tags: string | null }) {
		if (!modalEntry) return;
		const res = await fetch(`/api/journal/${modalEntry.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ...data, seasonId: $activeSeason?.id ?? null })
		});
		if (!res.ok) throw new Error('Failed to update');
		modalEntry = { ...modalEntry, ...data };
		await loadEntries();
	}

	async function refreshModalImages() {
		if (!modalEntry) return;
		await loadEntryImages();
	}

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
			if (res.ok) await loadPlantingLog();
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

	// Tag utilities
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

	let allTags = $derived.by(() => {
		const tags = new Set<string>();
		for (const e of entries) {
			if (e.tags) (JSON.parse(e.tags) as string[]).forEach((t) => tags.add(t));
		}
		return [...tags].sort();
	});

	function toggleTag(tag: string) {
		if (selectedTags.includes(tag)) {
			selectedTags = selectedTags.filter((t) => t !== tag);
		} else {
			selectedTags = [...selectedTags, tag];
		}
	}

	// All dates that have entries (for calendar)
	let datesWithEntries = $derived.by(() => {
		const dates = new Set<string>();
		for (const e of entries) dates.add(e.entryDate);
		for (const e of plantingEntries) dates.add(e.activityDate);
		return dates;
	});

	// Unified timeline: merge journal entries + planting entries, filter, group by date
	type MergedItem =
		| { kind: 'journal'; entry: JournalEntry }
		| { kind: 'planting'; entry: PlantingEntry };

	let groupedTimeline = $derived.by(() => {
		// Filter journal entries by selected tags
		let filteredJournal = entries;
		if (selectedTags.length > 0) {
			filteredJournal = entries.filter((e) => {
				if (!e.tags) return false;
				const eTags: string[] = JSON.parse(e.tags);
				return selectedTags.some((t) => eTags.includes(t));
			});
		}

		// Build merged item list (hide planting entries when tag-filtering)
		const items: MergedItem[] = [
			...filteredJournal.map((e) => ({ kind: 'journal' as const, entry: e })),
			...(selectedTags.length === 0
				? plantingEntries.map((e) => ({ kind: 'planting' as const, entry: e }))
				: [])
		];

		// Group by date
		const map = new Map<string, MergedItem[]>();
		for (const item of items) {
			const date = item.kind === 'journal' ? item.entry.entryDate : item.entry.activityDate;
			if (!map.has(date)) map.set(date, []);
			map.get(date)!.push(item);
		}

		// Apply date filter from calendar
		const groups: { date: string; label: string; items: MergedItem[] }[] = [];
		for (const [date, dateItems] of map) {
			if (dateFilter && date !== dateFilter) continue;
			groups.push({ date, label: formatTimelineDate(date), items: dateItems });
		}

		groups.sort((a, b) => b.date.localeCompare(a.date));
		return groups;
	});
</script>

<div class="space-y-6">
	<!-- Page header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-semibold text-slate-900">Journal</h1>
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

	<!-- Search bar -->
	<div class="relative">
		<svg
			class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
		</svg>
		<input
			type="text"
			placeholder="Search journal entries..."
			value={searchQuery}
			oninput={(e) => handleSearchInput(e.currentTarget.value)}
			class="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 placeholder-slate-400 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
		/>
	</div>

	<!-- Tag filter chips -->
	{#if allTags.length > 0}
		<div class="flex flex-wrap items-center gap-2">
			<span class="text-xs font-medium text-slate-400">Filter by tag:</span>
			{#each allTags as tag}
				<button
					onclick={() => toggleTag(tag)}
					class="rounded-full border px-2.5 py-0.5 text-xs font-medium transition {selectedTags.includes(tag) ? tagColor(tag) + ' ring-1 ring-offset-1 ring-current' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'}"
				>
					{tag}
				</button>
			{/each}
			{#if selectedTags.length > 0}
				<button
					onclick={() => (selectedTags = [])}
					class="text-xs text-slate-400 hover:text-slate-600"
				>
					Clear
				</button>
			{/if}
		</div>
	{/if}

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

				{#key editingEntry?.id ?? 'new'}
					<TiptapEditor
						content={formContent}
						onchange={(v) => (formContent = v)}
						minHeight="160px"
					/>
				{/key}

				<!-- Photos -->
				<div>
					<label class="mb-1.5 block text-xs font-medium text-slate-600">Photos</label>

					{#if visibleExistingPhotos.length > 0 || formPhotos.length > 0}
						<div class="mb-2 space-y-2">
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

	<!-- Two-column layout: timeline + calendar sidebar -->
	<div class="flex flex-col gap-6 lg:flex-row lg:items-start">
		<!-- Timeline -->
		<div class="min-w-0 flex-1">
			{#if loading}
				<div class="py-16 text-center">
					<p class="text-sm text-slate-400">Loading entries...</p>
				</div>
			{:else if groupedTimeline.length === 0}
				<div class="py-16 text-center">
					<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
						<svg class="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
						</svg>
					</div>
					<p class="text-sm font-medium text-slate-600">No journal entries yet</p>
					<p class="mt-1 text-sm text-slate-400">Create your first entry to start tracking your garden.</p>
				</div>
			{:else}
				<div class="relative ml-3 border-l-2 border-slate-200 pl-6">
					{#each groupedTimeline as group (group.date)}
						<!-- Date label -->
						<div class="relative pb-3">
							<div class="absolute -left-[29px] top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-400"></div>
							<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>
						</div>

						<!-- Items for that date -->
						<div class="space-y-3 pb-10">
							{#each group.items as item}
								{#if item.kind === 'journal'}
									<JournalEntryCard
										entry={item.entry}
										images={entryImages.get(item.entry.id) ?? []}
										beds={allBeds}
										onEdit={() => openEditForm(item.entry)}
										onDelete={() => deleteEntry(item.entry.id)}
										onView={() => openEntryModal(item.entry)}
									/>
								{:else}
									<!-- Planting log entry -->
									<a
										href="/plants/{item.entry.plantId}"
										class="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3 transition hover:border-emerald-200 hover:bg-emerald-50"
									>
										<div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full {item.entry.activityType === 'note' ? 'bg-slate-100' : item.entry.activityType === 'harvested' ? 'bg-green-100' : item.entry.activityType === 'watered' ? 'bg-sky-100' : item.entry.activityType === 'fertilized' ? 'bg-amber-100' : item.entry.activityType === 'pruned' ? 'bg-orange-100' : 'bg-emerald-100'}">
											{#if item.entry.activityType === 'note'}
												<!-- Pencil icon -->
												<svg class="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
												</svg>
											{:else if item.entry.activityType === 'harvested'}
												<!-- Scissors icon -->
												<svg class="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
												</svg>
											{:else if item.entry.activityType === 'watered'}
												<!-- Drop icon -->
												<svg class="h-4 w-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2C12 2 5 10 5 14a7 7 0 0014 0c0-4-7-12-7-12z" />
												</svg>
											{:else if item.entry.activityType === 'fertilized'}
												<!-- Sparkle/star icon -->
												<svg class="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3l1.5 4.5L11 9l-4.5 1.5L5 15l-1.5-4.5L-1 9l4.5-1.5L5 3zM19 13l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
												</svg>
											{:else if item.entry.activityType === 'pruned'}
												<!-- Trim/cut icon -->
												<svg class="h-4 w-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 9l6 6 6-6" />
												</svg>
											{:else}
												<!-- Default: seedling/planted icon -->
												<svg class="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 22V12m0 0C12 7 8 4 3 4c0 5 3 8 9 8zm0 0c0-5 4-8 9-8 0 5-3 8-9 8z" />
												</svg>
											{/if}
										</div>
										<div class="min-w-0 flex-1">
											<p class="text-sm font-medium text-slate-800">{item.entry.plantName}</p>
											{#if item.entry.plantVariety}
												<p class="text-xs text-slate-400">{item.entry.plantVariety}</p>
											{/if}
											{#if item.entry.description}
												<p class="mt-0.5 text-xs text-slate-500">{item.entry.description}</p>
											{/if}
										</div>
										<span class="flex-shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium capitalize {ACTIVITY_COLORS[item.entry.activityType] ?? ACTIVITY_COLORS.note}">
											{item.entry.activityType}
										</span>
										<button
											type="button"
											onclick={(e) => { e.preventDefault(); deletePlanting(item.entry.id); }}
											class="flex-shrink-0 rounded p-1 text-slate-300 transition hover:bg-white hover:text-red-400"
											aria-label="Delete planting entry"
										>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</a>
								{/if}
							{/each}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Calendar sidebar -->
		<div class="w-full lg:w-64 lg:flex-shrink-0">
			<JournalCalendar
				{datesWithEntries}
				selectedDate={dateFilter}
				onSelectDate={(d) => (dateFilter = d)}
			/>
		</div>
	</div>

	<!-- Entry detail modal -->
	<JournalEntryDetailModal
		entry={modalEntry}
		images={modalEntry ? (entryImages.get(modalEntry.id) ?? []) : []}
		beds={allBeds}
		bind:open={modalOpen}
		onClose={() => { modalEntry = null; }}
		onSave={saveModalEntry}
		onImagesChange={refreshModalImages}
	/>
</div>
