<script lang="ts">
	import type { PlantLookupResult } from '$lib/services/openaiEnrichment';

	interface Props {
		initialQuery?: string;
		onApplyData: (data: PlantLookupResult) => void;
	}

	let { initialQuery = '', onApplyData }: Props = $props();

	let expanded = $state(true);
	let searchQuery = $state(initialQuery);
	let searching = $state(false);
	let result: PlantLookupResult | null = $state(null);
	let searchError: string | null = $state(null);

	async function handleSearch() {
		if (!searchQuery.trim()) return;
		searching = true;
		result = null;
		searchError = null;

		try {
			const res = await fetch('/api/plants/search-seeds', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: searchQuery.trim() })
			});
			const data = await res.json();

			if (!res.ok) {
				searchError = data.error || 'Lookup failed. Please try again.';
				return;
			}

			console.log('[SeedSearch] API response:', JSON.stringify(data, null, 2));
			result = data;
			onApplyData(data);
		} catch {
			searchError = 'Lookup failed. Please try again.';
		} finally {
			searching = false;
		}
	}
</script>

<div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
	<!-- Collapsible header -->
	<button
		onclick={() => (expanded = !expanded)}
		class="flex w-full items-center justify-between p-5 text-left transition hover:bg-slate-50"
	>
		<div>
			<h2 class="text-base font-semibold text-slate-900">Plant Lookup</h2>
			<p class="text-sm text-slate-500">
				Search for any plant to auto-fill growing data.
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
					placeholder="Search for a plant (e.g., 'Zinnia Pink Senorita')"
					onkeydown={(e) => e.key === 'Enter' && handleSearch()}
					class="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
				/>
				<button
					onclick={handleSearch}
					disabled={searching || !searchQuery.trim()}
					class="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
				>
					{searching ? 'Looking up...' : 'Look Up'}
				</button>
			</div>

			<!-- Error -->
			{#if searchError}
				<div class="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2">
					<p class="text-xs text-red-600">{searchError}</p>
				</div>
			{/if}

			<!-- Loading -->
			{#if searching}
				<div class="mt-4 flex items-center justify-center py-8">
					<div class="flex items-center gap-2 text-sm text-slate-500">
						<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
						</svg>
						Looking up plant data...
					</div>
				</div>
			{:else if result}
				<div class="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
					<p class="text-sm font-medium text-emerald-700">
						Found data for "{result.name}"{result.variety ? ` - ${result.variety}` : ''}
					</p>
					<p class="mt-0.5 text-xs text-emerald-600">Form has been auto-filled with AI-generated plant data.</p>
				</div>
			{/if}
		</div>
	{/if}
</div>
