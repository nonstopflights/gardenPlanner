<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { Plant, PlantImage, Bed, Season } from '$lib/db/queries';
	import ActivityTimeline from '$lib/components/ActivityTimeline.svelte';
	import GrowthTimeline from '$lib/components/GrowthTimeline.svelte';
	import ImagePickerModal from '$lib/components/ImagePickerModal.svelte';
	import SeedSearchSection from '$lib/components/SeedSearchSection.svelte';
	import InlineEditor from '$lib/components/InlineEditor.svelte';
	import EditableSection from '$lib/components/EditableSection.svelte';
	import { activeSeason } from '$lib/stores/season';

	let plant: Plant | null = $state(null);
	let images: PlantImage[] = $state([]);
	let webInfo: any = $state(null);
	let activities: any[] = $state([]);
	let allBeds: Bed[] = $state([]);
	let allSeasons: Season[] = $state([]);
	let loading = $state(true);
	let editing = $state(false);
	let deleting = $state(false);
	let showImagePicker = $state(false);
	let editingSection: string | null = $state(null);
	let showDates = $state(false);

	let formData = $state({
		name: '',
		variety: '',
		category: 'want' as 'past' | 'want' | 'current',
		plantingDate: '',
		harvestDate: '',
		spacing: '',
		sunRequirements: '',
		waterNeeds: '',
		companionPlants: '',
		matureHeight: '',
		daysToMaturity: '',
		plantingSeason: '',
		startIndoorsWeeks: '',
		transplantWeeks: '',
		directSowWeeks: '',
		growingNotes: '',
		harvestingNotes: '',
		seedSource: '',
		seedSourceUrl: '',
		seedCost: ''
	});

	onMount(async () => {
		await loadPlant();
	});

	async function loadPlant() {
		const paramId = $page.params.id;
		const plantId = parseInt(paramId ?? '');
		if (isNaN(plantId)) {
			goto('/plants');
			return;
		}

		try {
			const res = await fetch(`/api/plants/${plantId}`);
			if (!res.ok) {
				goto('/plants');
				return;
			}
			plant = await res.json();
			showDates = !!(plant!.plantingDate || plant!.harvestDate);
			formData = {
				name: plant!.name || '',
				variety: plant!.variety || '',
				category: (plant!.category as 'past' | 'want' | 'current') || 'want',
				plantingDate: plant!.plantingDate || '',
				harvestDate: plant!.harvestDate || '',
				spacing: plant!.spacing || '',
				sunRequirements: plant!.sunRequirements || '',
				waterNeeds: plant!.waterNeeds || '',
				companionPlants: plant!.companionPlants || '',
				matureHeight: plant!.matureHeight || '',
				daysToMaturity: plant!.daysToMaturity?.toString() || '',
				plantingSeason: plant!.plantingSeason || '',
				startIndoorsWeeks: plant!.startIndoorsWeeks?.toString() || '',
				transplantWeeks: plant!.transplantWeeks?.toString() || '',
				directSowWeeks: plant!.directSowWeeks?.toString() || '',
				growingNotes: plant!.growingNotes || '',
				harvestingNotes: plant!.harvestingNotes || '',
				seedSource: plant!.seedSource || '',
				seedSourceUrl: plant!.seedSourceUrl || '',
				seedCost: plant!.seedCost?.toString() || ''
			};

			// Load images, activities, beds, seasons in parallel
			const [imgRes, actRes, bedsRes, seasonsRes] = await Promise.all([
				fetch(`/api/plants/${plantId}/images`),
				fetch(`/api/plants/${plantId}/activities`),
				fetch('/api/beds'),
				fetch('/api/seasons')
			]);
			images = await imgRes.json();
			activities = await actRes.json();
			allBeds = await bedsRes.json();
			allSeasons = await seasonsRes.json();

			// Load web info
			try {
				const webRes = await fetch(`/api/plants/${plantId}/web-info`);
				if (webRes.ok) {
					webInfo = await webRes.json();
				}
			} catch (error) {
				console.error('Failed to load web info:', error);
			}
		} catch (error) {
			console.error('Failed to load plant:', error);
		} finally {
			loading = false;
		}
	}

	async function handleSave() {
		if (!plant) return;

		try {
			const res = await fetch(`/api/plants/${plant.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...formData,
					matureHeight: formData.matureHeight || null,
					daysToMaturity: formData.daysToMaturity ? parseInt(formData.daysToMaturity) : null,
					plantingSeason: formData.plantingSeason || null,
					startIndoorsWeeks: formData.startIndoorsWeeks ? parseInt(formData.startIndoorsWeeks) : null,
					transplantWeeks: formData.transplantWeeks ? parseInt(formData.transplantWeeks) : null,
					directSowWeeks: formData.directSowWeeks ? parseInt(formData.directSowWeeks) : null,
					seedCost: formData.seedCost ? parseFloat(formData.seedCost) : null,
					seedSource: formData.seedSource || null,
					seedSourceUrl: formData.seedSourceUrl || null
				})
			});

			if (res.ok) {
				await loadPlant();
				editing = false;
			}
		} catch (error) {
			console.error('Failed to update plant:', error);
		}
	}

	async function handleDelete() {
		if (!plant || !confirm('Are you sure you want to delete this plant?')) return;

		deleting = true;
		try {
			const res = await fetch(`/api/plants/${plant.id}`, {
				method: 'DELETE'
			});

			if (res.ok) {
				goto('/plants');
			}
		} catch (error) {
			console.error('Failed to delete plant:', error);
		} finally {
			deleting = false;
		}
	}

	async function handleAddActivity(activity: { activityType: string; description: string; activityDate: string }) {
		if (!plant) return;
		const season = get(activeSeason);
		await fetch(`/api/plants/${plant.id}/activities`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ...activity, seasonId: season?.id })
		});
		await loadPlant();
	}

	async function handleDeleteActivity(id: number) {
		await fetch(`/api/activities/${id}`, { method: 'DELETE' });
		await loadPlant();
	}

	async function handleGrowthUpload(file: File, caption: string, takenAt: string, bedId?: number, zone?: string, seasonId?: number) {
		if (!plant) return;
		const fd = new FormData();
		fd.append('image', file);
		fd.append('plantId', plant.id.toString());
		if (caption) fd.append('caption', caption);
		if (takenAt) fd.append('takenAt', takenAt);
		if (bedId) fd.append('bedId', bedId.toString());
		if (zone) fd.append('zone', zone);
		if (seasonId) fd.append('seasonId', seasonId.toString());
		await fetch('/api/images', { method: 'POST', body: fd });
		await loadPlant();
	}

	async function handleImageUpdate(imageId: number, data: { caption?: string; bedId?: number | null; zone?: string | null; seasonId?: number | null }) {
		if (!plant) return;
		await fetch(`/api/plants/${plant.id}/images`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ imageId, ...data })
		});
		await loadPlant();
	}

	async function handleImageDelete(imageId: number) {
		if (!plant) return;
		try {
			const res = await fetch(`/api/plants/${plant.id}/images`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ imageId })
			});
			if (res.ok) {
				await loadPlant();
			}
		} catch (error) {
			console.error('Failed to delete image:', error);
		}
	}

	function applyLookupData(data: any) {
		if (data.name) formData.name = data.name;
		if (data.variety) formData.variety = data.variety;
		if (data.category) formData.category = data.category;
		if (data.plantingDate) { formData.plantingDate = data.plantingDate; showDates = true; }
		if (data.harvestDate) { formData.harvestDate = data.harvestDate; showDates = true; }
		if (data.spacing) formData.spacing = data.spacing;
		if (data.sunRequirements) formData.sunRequirements = data.sunRequirements;
		if (data.waterNeeds) formData.waterNeeds = data.waterNeeds;
		if (data.daysToMaturity) formData.daysToMaturity = data.daysToMaturity.toString();
		if (data.plantingSeason) formData.plantingSeason = data.plantingSeason;
		if (data.startIndoorsWeeks != null) formData.startIndoorsWeeks = data.startIndoorsWeeks.toString();
		if (data.transplantWeeks != null) formData.transplantWeeks = data.transplantWeeks.toString();
		if (data.directSowWeeks != null) formData.directSowWeeks = data.directSowWeeks.toString();
		if (data.companionPlants) formData.companionPlants = data.companionPlants;
		if (data.matureHeight) formData.matureHeight = data.matureHeight;
		if (data.growingNotes) formData.growingNotes = data.growingNotes;
		if (data.harvestingNotes) formData.harvestingNotes = data.harvestingNotes;
		if (data.seedSource) formData.seedSource = data.seedSource;
		if (data.seedSourceUrl) formData.seedSourceUrl = data.seedSourceUrl;
		if (data.seedCost) formData.seedCost = data.seedCost.toString();
	}

	async function handleImageSelect(imagePath: string) {
		showImagePicker = false;
		await loadPlant();
	}

	async function saveSection(fields: Record<string, unknown>) {
		if (!plant) return;
		try {
			await fetch(`/api/plants/${plant.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(fields)
			});
			await loadPlant();
		} catch (error) {
			console.error('Failed to save section:', error);
		}
		editingSection = null;
	}

	async function saveInlineText(field: string, html: string) {
		if (!plant) return;
		await saveSection({ [field]: html || null });
	}

	function startEditingSection(section: string) {
		// Auto-save current section if switching
		if (editingSection && editingSection !== section) {
			savePlantingInfo();
		}
		editingSection = section;
	}

	async function savePlantingInfo() {
		await saveSection({
			plantingDate: formData.plantingDate || null,
			harvestDate: formData.harvestDate || null,
			daysToMaturity: formData.daysToMaturity ? parseInt(formData.daysToMaturity) : null,
			plantingSeason: formData.plantingSeason || null,
			startIndoorsWeeks: formData.startIndoorsWeeks ? parseInt(formData.startIndoorsWeeks) : null,
			transplantWeeks: formData.transplantWeeks ? parseInt(formData.transplantWeeks) : null,
			directSowWeeks: formData.directSowWeeks ? parseInt(formData.directSowWeeks) : null,
			spacing: formData.spacing || null,
			sunRequirements: formData.sunRequirements || null,
			waterNeeds: formData.waterNeeds || null,
			companionPlants: formData.companionPlants || null,
			matureHeight: formData.matureHeight || null
		});
	}

	async function clearPlantingInfo() {
		formData.plantingDate = '';
		formData.harvestDate = '';
		formData.daysToMaturity = '';
		formData.plantingSeason = '';
		formData.startIndoorsWeeks = '';
		formData.transplantWeeks = '';
		formData.directSowWeeks = '';
		formData.spacing = '';
		formData.sunRequirements = '';
		formData.waterNeeds = '';
		formData.companionPlants = '';
		formData.matureHeight = '';
		await savePlantingInfo();
	}

	async function saveSeedSource() {
		await saveSection({
			seedSource: formData.seedSource || null,
			seedSourceUrl: formData.seedSourceUrl || null,
			seedCost: formData.seedCost ? parseFloat(formData.seedCost) : null
		});
	}

	async function clearSeedSource() {
		formData.seedSource = '';
		formData.seedSourceUrl = '';
		formData.seedCost = '';
		await saveSeedSource();
	}

	function formatCost(value: number | null | undefined): string {
		if (value == null) return '';
		return `$${value.toFixed(2)}`;
	}

	function categoryBadgeClass(category: string): string {
		switch (category) {
			case 'current':
				return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
			case 'want':
				return 'bg-sky-50 text-sky-700 border border-sky-200';
			default:
				return 'bg-slate-100 text-slate-600 border border-slate-200';
		}
	}
</script>

{#if loading}
	<div class="flex items-center justify-center py-24">
		<p class="text-sm text-slate-400">Loading plant...</p>
	</div>
{:else if !plant}
	<div class="flex items-center justify-center py-24">
		<p class="text-sm text-red-500">Plant not found</p>
	</div>
{:else if editing}
	<!-- Edit mode -->
	<a
		href="/plants/{plant.id}"
		onclick={(e) => { e.preventDefault(); editing = false; loadPlant(); }}
		class="inline-flex items-center gap-1 rounded-md px-2 py-1.5 -ml-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition"
	>
		&larr; Back to Plant
	</a>

	<!-- Seed site search in edit mode -->
	<div class="mt-3">
		<SeedSearchSection
			initialQuery={formData.name}
			onApplyData={applyLookupData}
		/>
	</div>

	<div class="mt-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold text-slate-900">Edit Plant</h2>
			<button
				type="button"
				onclick={() => (showImagePicker = true)}
				class="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
			>
				Find Images
			</button>
		</div>
		<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
			<div>
				<label class="mb-1 block text-sm font-medium text-slate-700">Name *</label>
				<input
					type="text"
					bind:value={formData.name}
					class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
				/>
			</div>
			<div>
				<label class="mb-1 block text-sm font-medium text-slate-700">Variety</label>
				<input
					type="text"
					bind:value={formData.variety}
					class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
				/>
			</div>
			<div>
				<label class="mb-1 block text-sm font-medium text-slate-700">Category *</label>
				<select
					bind:value={formData.category}
					class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
				>
					<option value="past">Past</option>
					<option value="want">Want to Plant</option>
					<option value="current">Currently Planted</option>
				</select>
			</div>
			{#if showDates}
				<div>
					<label class="mb-1 block text-sm font-medium text-slate-700">Planting Date</label>
					<input
						type="date"
						bind:value={formData.plantingDate}
						class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
					/>
				</div>
				<div>
					<label class="mb-1 block text-sm font-medium text-slate-700">Harvest Date</label>
					<input
						type="date"
						bind:value={formData.harvestDate}
						class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
					/>
				</div>
			{:else}
				<div class="flex items-end">
					<button
						type="button"
						onclick={() => (showDates = true)}
						class="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
						Add Planting &amp; Harvest Dates
					</button>
				</div>
			{/if}
			<div>
				<label class="mb-1 block text-sm font-medium text-slate-700">Days to Maturity</label>
				<input
					type="number"
					bind:value={formData.daysToMaturity}
					class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
				/>
			</div>
			<!-- Planting Schedule Section -->
			<div class="md:col-span-2">
				<div class="mb-3 border-t border-slate-100 pt-4">
					<h3 class="text-sm font-semibold text-slate-800">Planting Schedule</h3>
					<p class="text-xs text-slate-500">Used to calculate planting calendar dates relative to frost dates.</p>
				</div>
			</div>
			<div>
				<label class="mb-1 block text-sm font-medium text-slate-700">Planting Season</label>
				<select
					bind:value={formData.plantingSeason}
					class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
				>
					<option value="">Not set</option>
					<option value="spring">Spring</option>
					<option value="fall">Fall</option>
					<option value="both">Both</option>
				</select>
			</div>
			<div>
				<label class="mb-1 block text-sm font-medium text-slate-700">Start Indoors</label>
				<div class="flex items-center gap-2">
					<input
						type="number"
						bind:value={formData.startIndoorsWeeks}
						placeholder="e.g., 6"
						class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
					/>
					<span class="flex-shrink-0 text-xs text-slate-500">wks before last frost</span>
				</div>
			</div>
			<div>
				<label class="mb-1 block text-sm font-medium text-slate-700">Transplant Outdoors</label>
				<div class="flex items-center gap-2">
					<input
						type="number"
						bind:value={formData.transplantWeeks}
						placeholder="e.g., 2"
						class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
					/>
					<span class="flex-shrink-0 text-xs text-slate-500">wks after last frost</span>
				</div>
			</div>
			<div>
				<label class="mb-1 block text-sm font-medium text-slate-700">Direct Sow</label>
				<div class="flex items-center gap-2">
					<input
						type="number"
						bind:value={formData.directSowWeeks}
						placeholder="e.g., 0"
						class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
					/>
					<span class="flex-shrink-0 text-xs text-slate-500">wks after last frost</span>
				</div>
			</div>

			<div class="md:col-span-2">
				<div class="mb-3 border-t border-slate-100 pt-4">
					<h3 class="text-sm font-semibold text-slate-800">Growing Details</h3>
				</div>
			</div>
			<div>
				<label class="mb-1 block text-sm font-medium text-slate-700">Spacing</label>
				<input
					type="text"
					bind:value={formData.spacing}
					placeholder="e.g., 18 inches"
					class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
				/>
			</div>
			<div>
				<label class="mb-1 block text-sm font-medium text-slate-700">Sun Requirements</label>
				<input
					type="text"
					bind:value={formData.sunRequirements}
					placeholder="e.g., Full sun"
					class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
				/>
			</div>
			<div>
				<label class="mb-1 block text-sm font-medium text-slate-700">Water Needs</label>
				<input
					type="text"
					bind:value={formData.waterNeeds}
					placeholder="e.g., Moderate"
					class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
				/>
			</div>
			<div>
				<label class="mb-1 block text-sm font-medium text-slate-700">Companion Plants</label>
				<input
					type="text"
					bind:value={formData.companionPlants}
					placeholder="e.g., Basil, Marigold"
					class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
				/>
			</div>
			<div>
				<label class="mb-1 block text-sm font-medium text-slate-700">Mature Height</label>
				<input
					type="text"
					bind:value={formData.matureHeight}
					placeholder="e.g., 4-6 feet"
					class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
				/>
			</div>

			<!-- Seed source fields -->
			<div>
				<label class="mb-1 block text-sm font-medium text-slate-700">Seed Source</label>
				<input
					type="text"
					bind:value={formData.seedSource}
					placeholder="e.g., Johnny's Seeds"
					class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
				/>
			</div>
			<div>
				<label class="mb-1 block text-sm font-medium text-slate-700">Seed Source URL</label>
				<input
					type="url"
					bind:value={formData.seedSourceUrl}
					placeholder="https://..."
					class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
				/>
			</div>
			<div>
				<label class="mb-1 block text-sm font-medium text-slate-700">Seed Cost</label>
				<input
					type="number"
					step="0.01"
					bind:value={formData.seedCost}
					placeholder="0.00"
					class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
				/>
			</div>

			<div class="md:col-span-2">
				<label class="mb-1 block text-sm font-medium text-slate-700">Growing Notes</label>
				<textarea
					bind:value={formData.growingNotes}
					rows="4"
					class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
				></textarea>
			</div>
			<div class="md:col-span-2">
				<label class="mb-1 block text-sm font-medium text-slate-700">Harvesting Notes</label>
				<textarea
					bind:value={formData.harvestingNotes}
					rows="4"
					class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
				></textarea>
			</div>
		</div>
		<div class="mt-6 flex gap-3">
			<button
				onclick={handleSave}
				class="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
			>
				Save
			</button>
			<button
				onclick={() => { editing = false; loadPlant(); }}
				class="rounded-md border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
			>
				Cancel
			</button>
		</div>
	</div>
{:else}
	<!-- View mode -->
	<a href="/plants" class="inline-flex items-center gap-1 rounded-md px-2 py-1.5 -ml-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition">&larr; Back to Plants</a>

	<!-- Header section -->
	<div class="mt-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
		<div class="flex flex-col gap-4 sm:gap-6 md:flex-row">
			{#if images.length > 0}
				<div class="flex-shrink-0 md:w-56">
					<img
						src={images[0].imagePath}
						alt={plant.name}
						class="h-48 w-full rounded-xl object-cover md:h-40 md:w-56"
					/>
				</div>
			{/if}
			<div class="flex-1 min-w-0">
				<div>
					<h1 class="text-xl sm:text-2xl font-bold text-slate-900">{plant.name}</h1>
					{#if plant.variety}
						<p class="mt-0.5 text-sm sm:text-base text-slate-500">{plant.variety}</p>
					{/if}
					<span class="mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize {categoryBadgeClass(plant.category)}">
						{plant.category === 'want' ? 'Want to Plant' : plant.category}
					</span>
				</div>
				<div class="mt-3 flex flex-wrap gap-2">
					<button
						onclick={() => (showImagePicker = true)}
						class="inline-flex h-8 sm:h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 sm:px-3 text-xs sm:text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:bg-slate-100"
					>
						Find Images
					</button>
					<button
						onclick={() => (editing = true)}
						class="inline-flex h-8 sm:h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 sm:px-3 text-xs sm:text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:bg-slate-100"
					>
						Edit
					</button>
					<button
						onclick={handleDelete}
						disabled={deleting}
						class="inline-flex h-8 sm:h-9 items-center justify-center rounded-md border border-red-200 bg-white px-2.5 sm:px-3 text-xs sm:text-sm font-medium text-red-600 shadow-sm transition hover:bg-red-50 active:bg-red-100 disabled:opacity-50"
					>
						{deleting ? 'Deleting...' : 'Delete'}
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Info cards grid -->
	<div class="mt-4 sm:mt-6 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
		<!-- Planting Info -->
		<EditableSection
			title="Planting Information"
			editing={editingSection === 'planting'}
			onStartEdit={() => startEditingSection('planting')}
			onSave={savePlantingInfo}
			onClear={clearPlantingInfo}
		>
			{#snippet children()}
				<dl class="mt-4 space-y-3">
					{#if plant?.plantingDate}
						<div>
							<dt class="text-sm font-medium text-slate-500">Planting Date</dt>
							<dd class="text-sm text-slate-700">{plant.plantingDate}</dd>
						</div>
					{/if}
					{#if plant?.harvestDate}
						<div>
							<dt class="text-sm font-medium text-slate-500">Harvest Date</dt>
							<dd class="text-sm text-slate-700">{plant.harvestDate}</dd>
						</div>
					{/if}
					{#if plant?.daysToMaturity}
						<div>
							<dt class="text-sm font-medium text-slate-500">Days to Maturity</dt>
							<dd class="text-sm text-slate-700">{plant.daysToMaturity}</dd>
						</div>
					{/if}
					{#if plant?.plantingSeason}
						<div>
							<dt class="text-sm font-medium text-slate-500">Planting Season</dt>
							<dd class="text-sm capitalize text-slate-700">{plant.plantingSeason}</dd>
						</div>
					{/if}
					{#if plant?.startIndoorsWeeks != null}
						<div>
							<dt class="text-sm font-medium text-slate-500">Start Indoors</dt>
							<dd class="text-sm text-slate-700">{plant.startIndoorsWeeks} weeks before last frost</dd>
						</div>
					{/if}
					{#if plant?.transplantWeeks != null}
						<div>
							<dt class="text-sm font-medium text-slate-500">Transplant Outdoors</dt>
							<dd class="text-sm text-slate-700">{plant.transplantWeeks} weeks after last frost</dd>
						</div>
					{/if}
					{#if plant?.directSowWeeks != null}
						<div>
							<dt class="text-sm font-medium text-slate-500">Direct Sow</dt>
							<dd class="text-sm text-slate-700">{plant.directSowWeeks} weeks after last frost</dd>
						</div>
					{/if}
					{#if plant?.spacing}
						<div>
							<dt class="text-sm font-medium text-slate-500">Spacing</dt>
							<dd class="text-sm text-slate-700">{plant.spacing}</dd>
						</div>
					{/if}
					{#if plant?.sunRequirements}
						<div>
							<dt class="text-sm font-medium text-slate-500">Sun Requirements</dt>
							<dd class="text-sm text-slate-700">{plant.sunRequirements}</dd>
						</div>
					{/if}
					{#if plant?.waterNeeds}
						<div>
							<dt class="text-sm font-medium text-slate-500">Water Needs</dt>
							<dd class="text-sm text-slate-700">{plant.waterNeeds}</dd>
						</div>
					{/if}
					{#if plant?.companionPlants}
						<div>
							<dt class="text-sm font-medium text-slate-500">Companion Plants</dt>
							<dd class="text-sm text-slate-700">{plant.companionPlants}</dd>
						</div>
					{/if}
					{#if plant?.matureHeight}
						<div>
							<dt class="text-sm font-medium text-slate-500">Mature Height</dt>
							<dd class="text-sm text-slate-700">{plant.matureHeight}</dd>
						</div>
					{/if}
					{#if !plant?.plantingDate && !plant?.harvestDate && !plant?.daysToMaturity && !plant?.spacing && !plant?.sunRequirements && !plant?.waterNeeds}
						<p class="text-sm italic text-slate-400">No planting info yet. Click to add.</p>
					{/if}
				</dl>
			{/snippet}
			{#snippet editChildren()}
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					{#if showDates}
						<div>
							<label class="mb-1 block text-xs font-medium text-slate-600">Planting Date</label>
							<input type="date" bind:value={formData.plantingDate} class="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
						</div>
						<div>
							<label class="mb-1 block text-xs font-medium text-slate-600">Harvest Date</label>
							<input type="date" bind:value={formData.harvestDate} class="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
						</div>
					{:else}
						<div class="sm:col-span-2">
							<button
								type="button"
								onclick={() => (showDates = true)}
								class="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
							>
								<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
								Add Planting &amp; Harvest Dates
							</button>
						</div>
					{/if}
					<div>
						<label class="mb-1 block text-xs font-medium text-slate-600">Days to Maturity</label>
						<input type="number" bind:value={formData.daysToMaturity} class="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-slate-600">Planting Season</label>
						<select bind:value={formData.plantingSeason} class="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400">
							<option value="">Not set</option>
							<option value="spring">Spring</option>
							<option value="fall">Fall</option>
							<option value="both">Both</option>
						</select>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-slate-600">Start Indoors (wks before frost)</label>
						<input type="number" bind:value={formData.startIndoorsWeeks} placeholder="e.g., 6" class="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-slate-600">Transplant (wks after frost)</label>
						<input type="number" bind:value={formData.transplantWeeks} placeholder="e.g., 2" class="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-slate-600">Direct Sow (wks after frost)</label>
						<input type="number" bind:value={formData.directSowWeeks} placeholder="e.g., 0" class="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-slate-600">Spacing</label>
						<input type="text" bind:value={formData.spacing} placeholder="e.g., 18 inches" class="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-slate-600">Sun Requirements</label>
						<input type="text" bind:value={formData.sunRequirements} placeholder="e.g., Full sun" class="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-slate-600">Water Needs</label>
						<input type="text" bind:value={formData.waterNeeds} placeholder="e.g., Moderate" class="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-slate-600">Companion Plants</label>
						<input type="text" bind:value={formData.companionPlants} placeholder="e.g., Basil, Marigold" class="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-slate-600">Mature Height</label>
						<input type="text" bind:value={formData.matureHeight} placeholder="e.g., 4-6 feet" class="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
					</div>
				</div>
			{/snippet}
		</EditableSection>

		<!-- Seed Source -->
		<EditableSection
			title="Seed Source"
			editing={editingSection === 'seedSource'}
			onStartEdit={() => startEditingSection('seedSource')}
			onSave={saveSeedSource}
			onClear={clearSeedSource}
		>
			{#snippet children()}
				{#if plant?.seedSource || plant?.seedSourceUrl || plant?.seedCost}
					<dl class="mt-4 space-y-3">
						{#if plant?.seedSource}
							<div>
								<dt class="text-sm font-medium text-slate-500">Source</dt>
								<dd class="text-sm text-slate-700">{plant.seedSource}</dd>
							</div>
						{/if}
						{#if plant?.seedSourceUrl}
							<div class="min-w-0">
								<dt class="text-sm font-medium text-slate-500">URL</dt>
								<dd class="truncate">
									<a
										href={plant.seedSourceUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="text-sm text-slate-600 underline decoration-slate-300 hover:text-slate-900 hover:decoration-slate-500"
										onclick={(e) => e.stopPropagation()}
									>
										{plant.seedSourceUrl}
									</a>
								</dd>
							</div>
						{/if}
						{#if plant?.seedCost != null}
							<div>
								<dt class="text-sm font-medium text-slate-500">Cost</dt>
								<dd class="text-sm text-slate-700">{formatCost(plant?.seedCost)}</dd>
							</div>
						{/if}
					</dl>
				{:else}
					<p class="mt-4 text-sm italic text-slate-400">No seed source info yet. Click to add.</p>
				{/if}
			{/snippet}
			{#snippet editChildren()}
				<div class="space-y-3">
					<div>
						<label class="mb-1 block text-xs font-medium text-slate-600">Source</label>
						<input type="text" bind:value={formData.seedSource} placeholder="e.g., Johnny's Seeds" class="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-slate-600">URL</label>
						<input type="url" bind:value={formData.seedSourceUrl} placeholder="https://..." class="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-slate-600">Cost</label>
						<input type="number" step="0.01" bind:value={formData.seedCost} placeholder="0.00" class="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
					</div>
				</div>
			{/snippet}
		</EditableSection>

		<!-- Growing Notes (WYSIWYG) -->
		<div class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
			<h2 class="text-base font-semibold text-slate-900">Growing Notes</h2>
			<div class="mt-3">
				<InlineEditor
					content={plant.growingNotes || ''}
					placeholder="Click to add growing notes..."
					onSave={(html) => saveInlineText('growingNotes', html)}
				/>
			</div>
		</div>

		<!-- Harvesting Notes (WYSIWYG) -->
		<div class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
			<h2 class="text-base font-semibold text-slate-900">Harvesting Notes</h2>
			<div class="mt-3">
				<InlineEditor
					content={plant.harvestingNotes || ''}
					placeholder="Click to add harvesting notes..."
					onSave={(html) => saveInlineText('harvestingNotes', html)}
				/>
			</div>
		</div>

		<!-- Web Info -->
		{#if webInfo}
			<div class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm md:col-span-2">
				<h2 class="text-base font-semibold text-slate-900">Web Information</h2>
				{#if webInfo.description}
					<p class="mt-4 text-sm text-slate-600">{webInfo.description}</p>
				{/if}
				{#if webInfo.sourceUrl}
					<a
						href={webInfo.sourceUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="mt-3 inline-block text-sm text-slate-600 underline decoration-slate-300 hover:text-slate-900 hover:decoration-slate-500"
					>
						View source
					</a>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Activity Timeline -->
	<div class="mt-6">
		<h2 class="mb-4 text-base font-semibold text-slate-900">Activity Timeline</h2>
		<ActivityTimeline
			{activities}
			onAddActivity={handleAddActivity}
			onDeleteActivity={handleDeleteActivity}
		/>
	</div>

	<!-- Growth Timeline -->
	<div class="mt-8">
		<h2 class="mb-4 text-base font-semibold text-slate-900">Growth Timeline</h2>
		<GrowthTimeline
			{images}
			onUpload={handleGrowthUpload}
			onUpdate={handleImageUpdate}
			onDelete={handleImageDelete}
			beds={allBeds}
			seasons={allSeasons}
			currentSeasonId={$activeSeason?.id ?? null}
		/>
	</div>
{/if}

{#if showImagePicker && plant}
	<ImagePickerModal
		plantName={plant.name}
		plantId={plant.id}
		onSelect={handleImageSelect}
		onClose={() => (showImagePicker = false)}
	/>
{/if}
