<script lang="ts">
	import { SITE_DISPLAY_NAMES } from '$lib/services/seedSiteScraper';
	import type { SeedSite } from '$lib/services/seedSiteScraper';

	interface SeedSearchResult {
		name: string;
		variety?: string;
		url: string;
		imageUrl?: string;
		price?: string;
		source: SeedSite;
	}

	interface SeedProductData {
		name: string;
		variety?: string;
		description?: string;
		spacing?: string;
		sunRequirements?: string;
		waterNeeds?: string;
		daysToMaturity?: number;
		growingNotes?: string;
		harvestingNotes?: string;
		price?: string;
		seedCost?: number;
		productUrl: string;
		images: string[];
		source: string;
		plantingSeason?: string;
		startIndoorsWeeks?: number;
		directSowWeeks?: number;
	}

	interface Props {
		initialQuery?: string;
		onApplyData: (data: SeedProductData) => void;
	}

	let { initialQuery = '', onApplyData }: Props = $props();

	let expanded = $state(false);
	let searchQuery = $state(initialQuery);
	let searching = $state(false);
	let results: Record<SeedSite, SeedSearchResult[]> | null = $state(null);
	let searchErrors: string[] = $state([]);

	let scrapeUrl = $state('');
	let scraping = $state(false);
	let scrapeError: string | null = $state(null);

	let scrapingProduct: string | null = $state(null);

	const SITES: SeedSite[] = ['johnnyseeds', 'bakercreek', 'burpee', 'territorial'];

	async function handleSearch() {
		if (!searchQuery.trim()) return;
		searching = true;
		results = null;
		searchErrors = [];

		try {
			const res = await fetch('/api/plants/search-seeds', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: searchQuery.trim() })
			});
			const data = await res.json();
			results = data.results;
			searchErrors = data.errors || [];
		} catch {
			searchErrors = ['Search failed. Please try again.'];
		} finally {
			searching = false;
		}
	}

	async function handleScrapeUrl() {
		if (!scrapeUrl.trim()) return;
		scraping = true;
		scrapeError = null;

		try {
			const res = await fetch('/api/plants/scrape-url', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: scrapeUrl.trim() })
			});
			const data = await res.json();
			if (res.ok) {
				onApplyData(data);
				scrapeUrl = '';
			} else {
				scrapeError = data.error || 'Failed to scrape URL';
			}
		} catch {
			scrapeError = 'Failed to scrape URL. Please try again.';
		} finally {
			scraping = false;
		}
	}

	async function handleUseResult(result: SeedSearchResult) {
		scrapingProduct = result.url;

		try {
			const res = await fetch('/api/plants/scrape-url', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: result.url })
			});
			const data = await res.json();
			if (res.ok) {
				onApplyData(data);
			}
		} catch {
			// Silently fail - the user can try again
		} finally {
			scrapingProduct = null;
		}
	}

	let totalResults = $derived.by(() => {
		if (!results) return 0;
		return SITES.reduce((sum, site) => sum + (results![site]?.length || 0), 0);
	});

	function handleImageError(event: Event) {
		const img = event.target as HTMLImageElement;
		img.style.display = 'none';
	}
</script>

<div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
	<!-- Collapsible header -->
	<button
		onclick={() => (expanded = !expanded)}
		class="flex w-full items-center justify-between p-5 text-left transition hover:bg-slate-50"
	>
		<div>
			<h2 class="text-base font-semibold text-slate-900">Search Seed Sites</h2>
			<p class="text-sm text-slate-500">
				Search Johnny's, Baker Creek, Burpee, and Territorial for plant data.
			</p>
		</div>
		<svg
			class="h-5 w-5 flex-shrink-0 text-slate-400 transition-transform {expanded ? 'rotate-180' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if expanded}
		<div class="border-t border-slate-100 p-5 pt-4">
			<!-- Search input -->
			<div class="flex gap-2">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search for a plant variety..."
					onkeydown={(e) => e.key === 'Enter' && handleSearch()}
					class="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
				/>
				<button
					onclick={handleSearch}
					disabled={searching}
					class="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
				>
					{searching ? 'Searching...' : 'Search'}
				</button>
			</div>

			<!-- URL paste -->
			<div class="mt-3">
				<div class="flex gap-2">
					<input
						type="url"
						bind:value={scrapeUrl}
						placeholder="Or paste a product URL from Johnny's, Baker Creek, Burpee, or Territorial..."
						onkeydown={(e) => e.key === 'Enter' && handleScrapeUrl()}
						class="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
					/>
					<button
						onclick={handleScrapeUrl}
						disabled={scraping || !scrapeUrl.trim()}
						class="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
					>
						{scraping ? 'Scraping...' : 'Scrape URL'}
					</button>
				</div>
				{#if scrapeError}
					<p class="mt-1.5 text-xs text-red-500">{scrapeError}</p>
				{/if}
			</div>

			<!-- Errors -->
			{#if searchErrors.length > 0}
				<div class="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
					<p class="text-xs font-medium text-amber-700">Some sites couldn't be reached:</p>
					{#each searchErrors as err}
						<p class="text-xs text-amber-600">{err}</p>
					{/each}
				</div>
			{/if}

			<!-- Results -->
			{#if searching}
				<div class="mt-4 flex items-center justify-center py-8">
					<div class="flex items-center gap-2 text-sm text-slate-500">
						<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
						</svg>
						Searching seed sites...
					</div>
				</div>
			{:else if results}
				{#if totalResults === 0}
					<div class="mt-4 py-8 text-center">
						<p class="text-sm text-slate-500">No results found across any seed sites.</p>
					</div>
				{:else}
					<div class="mt-4 space-y-4">
						{#each SITES as site}
							{@const siteResults = results[site] || []}
							{#if siteResults.length > 0}
								<div>
									<h3 class="mb-2 text-sm font-semibold text-slate-700">
										{SITE_DISPLAY_NAMES[site]}
										<span class="font-normal text-slate-400">({siteResults.length} result{siteResults.length !== 1 ? 's' : ''})</span>
									</h3>
									<div class="space-y-1.5">
										{#each siteResults.slice(0, 5) as result (result.url)}
											<div class="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
												{#if result.imageUrl}
													<img
														src={result.imageUrl}
														alt={result.name}
														referrerpolicy="no-referrer"
														class="h-12 w-12 flex-shrink-0 rounded-md object-cover"
														onerror={handleImageError}
													/>
												{:else}
													<div class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-lg">
														<span>🌱</span>
													</div>
												{/if}
												<div class="min-w-0 flex-1">
													<p class="truncate text-sm font-medium text-slate-700">{result.name}</p>
													{#if result.price}
														<p class="text-xs text-slate-500">{result.price}</p>
													{/if}
												</div>
												<button
													onclick={() => handleUseResult(result)}
													disabled={scrapingProduct === result.url}
													class="flex-shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
												>
													{scrapingProduct === result.url ? 'Loading...' : 'Use This'}
												</button>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</div>
