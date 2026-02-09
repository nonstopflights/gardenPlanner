<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import JournalEntryCard from '$lib/components/JournalEntryCard.svelte';
	import { activeSeason } from '$lib/stores/season';

	let loading = $state(true);
	let dashboardData: any = $state(null);
	let mounted = $state(false);
	let lastSeasonId = $state<number | null>(null);

	async function loadDashboard() {
		loading = true;
		try {
			const season = get(activeSeason);
			const seasonParam = season?.id ? `?seasonId=${season.id}` : '';
			const res = await fetch(`/api/dashboard${seasonParam}`);
			if (res.ok) {
				dashboardData = await res.json();
			}
		} catch (error) {
			console.error('Failed to load dashboard:', error);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		mounted = true;
		const season = get(activeSeason);
		lastSeasonId = season?.id ?? null;
		loadDashboard();
	});

	$effect(() => {
		// Only reload if mounted and season actually changed
		if (!mounted) return;
		
		const season = $activeSeason;
		const currentSeasonId = season?.id ?? null;
		
		// Only reload if the season ID actually changed
		if (currentSeasonId !== lastSeasonId) {
			lastSeasonId = currentSeasonId;
			loadDashboard();
		}
	});

	let stats = $derived(
		dashboardData?.stats ?? { totalPlants: 0, currentPlants: 0, wantPlants: 0, totalBeds: 0 }
	);
	let recentJournal = $derived(dashboardData?.recentJournal ?? []);
	let upcomingHarvests = $derived(dashboardData?.upcomingHarvests ?? []);

	function daysUntilHarvest(harvestDate: string): number {
		const now = new Date();
		const harvest = new Date(harvestDate);
		return Math.ceil((harvest.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
	}
</script>

{#if loading}
	<div class="flex items-center justify-center py-24">
		<p class="text-sm text-slate-400">Loading dashboard...</p>
	</div>
{:else}
	<!-- Page title + active season subtitle -->
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-slate-900">Dashboard</h1>
		<p class="mt-1 text-sm text-slate-500">
			{$activeSeason?.name ?? 'No active season'}
		</p>
	</div>

	<!-- Stat cards -->
	<div class="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
		<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<p class="text-3xl font-bold text-slate-900">{stats.totalPlants}</p>
			<p class="mt-1 text-sm text-slate-500">Total Plants</p>
		</div>
		<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<p class="text-3xl font-bold text-slate-900">{stats.currentPlants}</p>
			<p class="mt-1 text-sm text-slate-500">Currently Planted</p>
		</div>
		<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<p class="text-3xl font-bold text-slate-900">{stats.wantPlants}</p>
			<p class="mt-1 text-sm text-slate-500">Want to Plant</p>
		</div>
		<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<p class="text-3xl font-bold text-slate-900">{stats.totalBeds}</p>
			<p class="mt-1 text-sm text-slate-500">Total Beds</p>
		</div>
	</div>

	<!-- Two-column grid: Recent Journal + Upcoming Harvests -->
	<div class="mb-8 grid gap-6 lg:grid-cols-2">
		<!-- Recent Journal -->
		<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-semibold text-slate-900">Recent Journal</h2>
				<a href="/journal" class="text-sm font-medium text-slate-500 hover:text-slate-700">
					View all
				</a>
			</div>
			{#if recentJournal.length === 0}
				<div class="py-8 text-center">
					<p class="text-sm text-slate-400">No journal entries yet.</p>
					<a
						href="/journal"
						class="mt-2 inline-block text-sm font-medium text-slate-600 hover:text-slate-800"
					>
						Write your first entry
					</a>
				</div>
			{:else}
				<div class="space-y-3">
					{#each recentJournal.slice(0, 5) as entry (entry.id)}
						<JournalEntryCard {entry} compact />
					{/each}
				</div>
			{/if}
		</div>

		<!-- Upcoming Harvests -->
		<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-semibold text-slate-900">Upcoming Harvests</h2>
				<a href="/plants" class="text-sm font-medium text-slate-500 hover:text-slate-700">
					View all plants
				</a>
			</div>
			{#if upcomingHarvests.length === 0}
				<div class="py-8 text-center">
					<p class="text-sm text-slate-400">No upcoming harvests in the next 30 days.</p>
					<a
						href="/plants/new"
						class="mt-2 inline-block text-sm font-medium text-slate-600 hover:text-slate-800"
					>
						Add a plant with planting info
					</a>
				</div>
			{:else}
				<div class="space-y-3">
					{#each upcomingHarvests as plant (plant.id)}
						{@const days = daysUntilHarvest(plant.harvestDate)}
						<a
							href="/plants/{plant.id}"
							class="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 transition-shadow hover:shadow-sm"
						>
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium text-slate-900">{plant.name}</p>
								{#if plant.variety}
									<p class="text-xs text-slate-400">{plant.variety}</p>
								{/if}
							</div>
							<span
								class="ml-3 flex-shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium {days <=
								7
									? 'border-amber-200 bg-amber-50 text-amber-700'
									: 'border-emerald-200 bg-emerald-50 text-emerald-700'}"
							>
								{days} {days === 1 ? 'day' : 'days'}
							</span>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Quick actions -->
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		<a
			href="/plants/new"
			class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
		>
			Add Plant
		</a>
		<a
			href="/journal"
			class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
		>
			New Journal Entry
		</a>
		<a
			href="/beds"
			class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
		>
			Manage Beds
		</a>
		<a
			href="/plants"
			class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
		>
			Plant Library
		</a>
	</div>
{/if}
