<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { loadSeasons, switchSeason, activeSeason, allSeasons } from '$lib/stores/season';
	import SeasonSelector from '$lib/components/SeasonSelector.svelte';
	import NewSeasonDialog from '$lib/components/NewSeasonDialog.svelte';

	let { children } = $props();

	let showNewSeason = $state(false);
	let mobileMenuOpen = $state(false);

	onMount(async () => {
		await loadSeasons();
	});

	async function handleSeasonChange(seasonId: number) {
		await switchSeason(seasonId);
	}

	async function handleNewSeason(data: {
		name: string;
		year: number;
		type: string;
		startDate: string;
		endDate: string;
		copyFromSeasonId?: number;
	}) {
		const res = await fetch('/api/seasons', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});

		if (res.ok) {
			const newSeason = await res.json();

			if (data.copyFromSeasonId) {
				await fetch(`/api/seasons/${newSeason.id}/copy-from`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ fromSeasonId: data.copyFromSeasonId })
				});
			}

			await switchSeason(newSeason.id);
		}

		showNewSeason = false;
	}

	const navItems = [
		{ href: '/', label: 'Dashboard' },
		{ href: '/beds', label: 'Beds' },
		{ href: '/plants', label: 'Plants' },
		{ href: '/journal', label: 'Journal' }
	];

	function isActive(href: string, pathname: string): boolean {
		if (href === '/') return pathname === '/';
		return pathname.startsWith(href);
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>Garden Planner</title>
</svelte:head>

<div class="min-h-screen bg-slate-50">
	<header class="sticky top-0 z-30 border-b border-slate-200/60 bg-white/80 backdrop-blur">
		<div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
			<div class="flex items-center gap-6">
				<a href="/" class="flex items-center gap-2.5">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-900 shadow-sm"
					>
						<span class="text-sm font-bold">GP</span>
					</div>
					<span class="hidden text-sm font-semibold text-slate-900 sm:block"
						>Garden Planner</span
					>
				</a>
				<nav class="hidden items-center gap-1 md:flex">
					{#each navItems as item}
						<a
							href={item.href}
							class="rounded-md px-3 py-1.5 text-sm font-medium transition {isActive(
								item.href,
								$page.url.pathname
							)
								? 'bg-slate-100 text-slate-900'
								: 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}"
						>
							{item.label}
						</a>
					{/each}
				</nav>
			</div>

			<div class="flex items-center gap-3">
				<SeasonSelector
					seasons={$allSeasons}
					activeSeason={$activeSeason}
					onSeasonChange={handleSeasonChange}
					onNewSeason={() => (showNewSeason = true)}
				/>
				<button
					onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
					class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 md:hidden"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						{#if mobileMenuOpen}
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						{:else}
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 6h16M4 12h16M4 18h16"
							/>
						{/if}
					</svg>
				</button>
			</div>
		</div>

		{#if mobileMenuOpen}
			<div class="border-t border-slate-200/60 bg-white px-4 py-2 md:hidden">
				{#each navItems as item}
					<a
						href={item.href}
						onclick={() => (mobileMenuOpen = false)}
						class="block rounded-md px-3 py-2 text-sm font-medium {isActive(
							item.href,
							$page.url.pathname
						)
							? 'bg-slate-100 text-slate-900'
							: 'text-slate-500 hover:text-slate-700'}"
					>
						{item.label}
					</a>
				{/each}
			</div>
		{/if}
	</header>

	<main class="mx-auto max-w-7xl px-4 py-6 sm:px-6">
		{@render children()}
	</main>
</div>

{#if showNewSeason}
	<NewSeasonDialog
		seasons={$allSeasons}
		onSave={handleNewSeason}
		onClose={() => (showNewSeason = false)}
	/>
{/if}
