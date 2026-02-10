<script lang="ts">
	import { goto } from '$app/navigation';
	import ImagePickerModal from '$lib/components/ImagePickerModal.svelte';
	import SeedSearchSection from '$lib/components/SeedSearchSection.svelte';

	let loading = $state(false);

	// Image picker state
	let showImagePicker = $state(false);
	let selectedImageUrl: string | null = $state(null);
	let selectedImagePreview: string | null = $state(null);

	// Field highlight state for AI lookup flash
	let highlightedFields: Set<string> = $state(new Set());

	// Optional fields hidden behind "Add+" buttons
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

	function flashField(field: string) {
		highlightedFields.add(field);
		highlightedFields = new Set(highlightedFields);
	}

	function clearHighlights() {
		setTimeout(() => {
			highlightedFields = new Set();
		}, 1500);
	}

	function applyLookupData(data: any) {
		if (data.name) { formData.name = data.name; flashField('name'); }
		if (data.variety) { formData.variety = data.variety; flashField('variety'); }
		if (data.category) { formData.category = data.category; flashField('category'); }
		if (data.spacing) { formData.spacing = data.spacing; flashField('spacing'); }
		if (data.sunRequirements) { formData.sunRequirements = data.sunRequirements; flashField('sunRequirements'); }
		if (data.waterNeeds) { formData.waterNeeds = data.waterNeeds; flashField('waterNeeds'); }
		if (data.daysToMaturity) { formData.daysToMaturity = data.daysToMaturity.toString(); flashField('daysToMaturity'); }
		if (data.plantingSeason) { formData.plantingSeason = data.plantingSeason; flashField('plantingSeason'); }
		if (data.startIndoorsWeeks != null) { formData.startIndoorsWeeks = data.startIndoorsWeeks.toString(); flashField('startIndoorsWeeks'); }
		if (data.transplantWeeks != null) { formData.transplantWeeks = data.transplantWeeks.toString(); flashField('transplantWeeks'); }
		if (data.directSowWeeks != null) { formData.directSowWeeks = data.directSowWeeks.toString(); flashField('directSowWeeks'); }
		if (data.companionPlants) { formData.companionPlants = data.companionPlants; flashField('companionPlants'); }
		if (data.matureHeight) { formData.matureHeight = data.matureHeight; flashField('matureHeight'); }
		if (data.seedSource) { formData.seedSource = data.seedSource; flashField('seedSource'); }
		if (data.seedSourceUrl) { formData.seedSourceUrl = data.seedSourceUrl; flashField('seedSourceUrl'); }
		if (data.seedCost) { formData.seedCost = data.seedCost.toString(); flashField('seedCost'); }
		if (data.plantingDate) { formData.plantingDate = data.plantingDate; flashField('plantingDate'); showDates = true; }
		if (data.harvestDate) { formData.harvestDate = data.harvestDate; flashField('harvestDate'); showDates = true; }
		if (data.images?.length > 0) {
			selectedImageUrl = data.images[0];
			selectedImagePreview = data.images[0];
		}
		clearHighlights();
	}

	function fc(field: string): string {
		return highlightedFields.has(field) ? ' ai-flash' : '';
	}

	function handleImageSelect(imagePath: string) {
		// For new plants, this is a URL (not yet downloaded)
		selectedImageUrl = imagePath;
		selectedImagePreview = imagePath;
		showImagePicker = false;
	}

	async function handleSubmit() {
		loading = true;
		try {
			const createRes = await fetch('/api/plants', {
				method: 'POST',
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

			if (!createRes.ok) {
				throw new Error('Failed to create plant');
			}

			const newPlant = await createRes.json();

			// Download selected image for the new plant
			if (selectedImageUrl) {
				try {
					await fetch('/api/plants/download-image', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ imageUrl: selectedImageUrl, plantId: newPlant.id })
					});
				} catch {
					// Image download failure shouldn't block plant creation
				}
			}

			goto(`/plants/${newPlant.id}`);
		} catch (error) {
			console.error('Failed to create plant:', error);
			alert('Failed to create plant. Please try again.');
		} finally {
			loading = false;
		}
	}
</script>

<style>
	@keyframes ai-field-flash {
		0% { background-color: rgb(220 252 231); border-color: rgb(74 222 128); }
		100% { background-color: white; border-color: rgb(226 232 240); }
	}
	:global(.ai-flash) {
		animation: ai-field-flash 1.5s ease-out;
	}
</style>

<a href="/plants" class="text-sm text-slate-500 hover:text-slate-700">&larr; Back to Plants</a>

<h1 class="mt-4 text-2xl font-bold text-slate-900">Add New Plant</h1>

<!-- Plant lookup -->
<div class="mt-6">
	<SeedSearchSection
		onApplyData={applyLookupData}
	/>
</div>

<!-- Plant details form -->
<div class="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold text-slate-900">Plant Details</h2>
		<!-- Image picker -->
		<div class="flex items-center gap-3">
			{#if selectedImagePreview}
				<img
					src={selectedImagePreview}
					alt="Selected"
					referrerpolicy="no-referrer"
					class="h-12 w-12 rounded-lg object-cover border border-slate-200"
				/>
			{/if}
			<button
				type="button"
				onclick={() => (showImagePicker = true)}
				class="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
			>
				{selectedImagePreview ? 'Change Image' : 'Choose Image'}
			</button>
		</div>
	</div>
	<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
		<div>
			<label class="mb-1 block text-sm font-medium text-slate-700">Name *</label>
			<input
				type="text"
				bind:value={formData.name}
				required
				class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400{fc('name')}"
			/>
		</div>
		<div>
			<label class="mb-1 block text-sm font-medium text-slate-700">Variety</label>
			<input
				type="text"
				bind:value={formData.variety}
				class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400{fc('variety')}"
			/>
		</div>
		<div>
			<label class="mb-1 block text-sm font-medium text-slate-700">Category *</label>
			<select
				bind:value={formData.category}
				required
				class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400{fc('category')}"
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
					class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400{fc('plantingDate')}"
				/>
			</div>
			<div>
				<label class="mb-1 block text-sm font-medium text-slate-700">Harvest Date</label>
				<input
					type="date"
					bind:value={formData.harvestDate}
					class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400{fc('harvestDate')}"
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
				class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400{fc('daysToMaturity')}"
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
				class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400{fc('plantingSeason')}"
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
					class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400{fc('startIndoorsWeeks')}"
				/>
				<span class="flex-shrink-0 text-xs text-slate-500">weeks before last frost</span>
			</div>
		</div>
		<div>
			<label class="mb-1 block text-sm font-medium text-slate-700">Transplant Outdoors</label>
			<div class="flex items-center gap-2">
				<input
					type="number"
					bind:value={formData.transplantWeeks}
					placeholder="e.g., 2"
					class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400{fc('transplantWeeks')}"
				/>
				<span class="flex-shrink-0 text-xs text-slate-500">weeks after last frost</span>
			</div>
		</div>
		<div>
			<label class="mb-1 block text-sm font-medium text-slate-700">Direct Sow</label>
			<div class="flex items-center gap-2">
				<input
					type="number"
					bind:value={formData.directSowWeeks}
					placeholder="e.g., 0"
					class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400{fc('directSowWeeks')}"
				/>
				<span class="flex-shrink-0 text-xs text-slate-500">weeks after last frost</span>
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
				class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400{fc('spacing')}"
			/>
		</div>
		<div>
			<label class="mb-1 block text-sm font-medium text-slate-700">Sun Requirements</label>
			<input
				type="text"
				bind:value={formData.sunRequirements}
				placeholder="e.g., Full sun"
				class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400{fc('sunRequirements')}"
			/>
		</div>
		<div>
			<label class="mb-1 block text-sm font-medium text-slate-700">Water Needs</label>
			<input
				type="text"
				bind:value={formData.waterNeeds}
				placeholder="e.g., Moderate"
				class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400{fc('waterNeeds')}"
			/>
		</div>
		<div>
			<label class="mb-1 block text-sm font-medium text-slate-700">Companion Plants</label>
			<input
				type="text"
				bind:value={formData.companionPlants}
				placeholder="e.g., Basil, Marigold"
				class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400{fc('companionPlants')}"
			/>
		</div>
		<div>
			<label class="mb-1 block text-sm font-medium text-slate-700">Mature Height</label>
			<input
				type="text"
				bind:value={formData.matureHeight}
				placeholder="e.g., 4-6 feet"
				class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400{fc('matureHeight')}"
			/>
		</div>

		<!-- Seed source fields -->
		<div>
			<label class="mb-1 block text-sm font-medium text-slate-700">Seed Source</label>
			<input
				type="text"
				bind:value={formData.seedSource}
				placeholder="e.g., Johnny's Seeds"
				class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400{fc('seedSource')}"
			/>
		</div>
		<div>
			<label class="mb-1 block text-sm font-medium text-slate-700">Seed Source URL</label>
			<input
				type="url"
				bind:value={formData.seedSourceUrl}
				placeholder="https://..."
				class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400{fc('seedSourceUrl')}"
			/>
		</div>
		<div>
			<label class="mb-1 block text-sm font-medium text-slate-700">Seed Cost</label>
			<input
				type="number"
				step="0.01"
				bind:value={formData.seedCost}
				placeholder="0.00"
				class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400{fc('seedCost')}"
			/>
		</div>

		<div class="md:col-span-2">
			<label class="mb-1 block text-sm font-medium text-slate-700">Growing Notes</label>
			<textarea
				bind:value={formData.growingNotes}
				rows="4"
				class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400{fc('growingNotes')}"
			></textarea>
		</div>
		<div class="md:col-span-2">
			<label class="mb-1 block text-sm font-medium text-slate-700">Harvesting Notes</label>
			<textarea
				bind:value={formData.harvestingNotes}
				rows="4"
				class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400{fc('harvestingNotes')}"
			></textarea>
		</div>
	</div>
	<div class="mt-6 flex gap-3">
		<button
			onclick={handleSubmit}
			disabled={loading || !formData.name}
			class="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
		>
			{loading ? 'Creating...' : 'Create Plant'}
		</button>
		<button
			onclick={() => goto('/plants')}
			class="rounded-md border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
		>
			Cancel
		</button>
	</div>
</div>

{#if showImagePicker}
	<ImagePickerModal
		plantName={formData.name}
		onSelect={handleImageSelect}
		onClose={() => (showImagePicker = false)}
	/>
{/if}
