<script lang="ts">
	interface ImageCandidate {
		url: string;
		source: string;
		alt: string;
	}

	interface Props {
		plantName: string;
		plantVariety?: string;
		plantId?: number;
		onSelect: (imagePath: string) => void;
		onClose: () => void;
	}

	let { plantName, plantVariety, plantId, onSelect, onClose }: Props = $props();

	let searchQuery = $state(plantVariety ? `${plantName} ${plantVariety}` : plantName);
	let images: ImageCandidate[] = $state([]);
	let searching = $state(false);
	let downloading = $state(false);
	let selectedUrl: string | null = $state(null);
	let errorMsg: string | null = $state(null);
	let failedUrls = $state(new Set<string>());

	// Auto-search on mount
	$effect(() => {
		if (plantName && images.length === 0 && !searching) {
			handleSearch();
		}
	});

	async function handleSearch() {
		if (!searchQuery.trim()) return;
		searching = true;
		errorMsg = null;
		selectedUrl = null;
		failedUrls = new Set();

		try {
			const res = await fetch('/api/plants/search-images', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: searchQuery.trim() })
			});
			const data = await res.json();
			images = data.images || [];
			if (images.length === 0) {
				errorMsg = 'No images found. Try a different search term.';
			}
		} catch {
			errorMsg = 'Search failed. Please try again.';
			images = [];
		} finally {
			searching = false;
		}
	}

	async function handleConfirm() {
		if (!selectedUrl) return;
		downloading = true;

		try {
			if (plantId) {
				// Download immediately for existing plants
				const res = await fetch('/api/plants/download-image', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ imageUrl: selectedUrl, plantId })
				});
				const data = await res.json();
				if (data.imagePath) {
					onSelect(data.imagePath);
				} else {
					errorMsg = 'Failed to download image.';
				}
			} else {
				// For new plants, pass the URL back (will be downloaded after plant creation)
				onSelect(selectedUrl);
			}
		} catch {
			errorMsg = 'Failed to download image.';
		} finally {
			downloading = false;
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	function handleImageError(url: string) {
		failedUrls = new Set([...failedUrls, url]);
	}

	let visibleImages = $derived(images.filter((img) => !failedUrls.has(img.url)));
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
	onclick={handleBackdropClick}
>
	<div
		class="mx-4 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-lg"
		role="dialog"
		aria-modal="true"
		aria-labelledby="image-picker-title"
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-slate-100 p-5">
			<h2 id="image-picker-title" class="text-lg font-semibold text-slate-900">Choose an Image</h2>
			<button
				onclick={onClose}
				class="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
				aria-label="Close"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Search bar -->
		<div class="border-b border-slate-100 px-5 py-3">
			<div class="flex gap-2">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search for plant images..."
					onkeydown={(e) => e.key === 'Enter' && handleSearch()}
					class="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
				/>
				<button
					onclick={handleSearch}
					disabled={searching}
					class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
				>
					{searching ? 'Searching...' : 'Search'}
				</button>
			</div>
		</div>

		<!-- Image grid (scrollable) -->
		<div class="flex-1 overflow-y-auto p-5">
			{#if searching}
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
					{#each Array(6) as _}
						<div class="h-32 animate-pulse rounded-xl bg-slate-100"></div>
					{/each}
				</div>
			{:else if errorMsg && visibleImages.length === 0}
				<div class="py-12 text-center">
					<p class="text-sm text-slate-500">{errorMsg}</p>
				</div>
			{:else if visibleImages.length > 0}
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
					{#each visibleImages as image (image.url)}
						<button
							onclick={() => (selectedUrl = selectedUrl === image.url ? null : image.url)}
							class="group relative overflow-hidden rounded-xl border-2 transition-all {selectedUrl === image.url
								? 'border-sky-500 ring-2 ring-sky-200'
								: 'border-transparent hover:border-slate-300'}"
						>
							<img
								src={image.url}
								alt={image.alt}
								referrerpolicy="no-referrer"
								loading="lazy"
								class="h-32 w-full object-cover"
								onerror={() => handleImageError(image.url)}
							/>
							<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-4">
								<span class="text-[10px] font-medium text-white/90">{image.source}</span>
							</div>
							{#if selectedUrl === image.url}
								<div class="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-white">
									<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
									</svg>
								</div>
							{/if}
						</button>
					{/each}
				</div>
			{:else}
				<div class="py-12 text-center">
					<p class="text-sm text-slate-500">Search for images above to get started.</p>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="flex items-center justify-between border-t border-slate-100 px-5 py-4">
			{#if errorMsg && visibleImages.length > 0}
				<p class="text-xs text-red-500">{errorMsg}</p>
			{:else}
				<p class="text-xs text-slate-400">{visibleImages.length} image{visibleImages.length !== 1 ? 's' : ''} found</p>
			{/if}
			<div class="flex gap-2">
				<button
					onclick={onClose}
					class="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
				>
					Cancel
				</button>
				<button
					onclick={handleConfirm}
					disabled={!selectedUrl || downloading}
					class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{downloading ? 'Downloading...' : 'Use Selected'}
				</button>
			</div>
		</div>
	</div>
</div>
