<script lang="ts">
	import { browser } from '$app/environment';

	interface Props {
		seasons: { id: number; name: string; isActive: boolean }[];
		activeSeason: { id: number; name: string } | null;
		onSeasonChange: (seasonId: number) => void;
		onNewSeason: () => void;
	}

	let { seasons, activeSeason, onSeasonChange, onNewSeason }: Props = $props();

	let isOpen = $state(false);
	let containerEl: HTMLDivElement | undefined = $state();

	function toggle() {
		isOpen = !isOpen;
	}

	function selectSeason(seasonId: number) {
		onSeasonChange(seasonId);
		isOpen = false;
	}

	function handleNewSeason() {
		onNewSeason();
		isOpen = false;
	}

	function handleClickOutside(event: MouseEvent) {
		if (containerEl && !containerEl.contains(event.target as Node)) {
			isOpen = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			isOpen = false;
		}
	}

	$effect(() => {
		if (!browser) return;
		if (isOpen) {
			document.addEventListener('click', handleClickOutside, true);
			document.addEventListener('keydown', handleKeydown);
		}
		return () => {
			document.removeEventListener('click', handleClickOutside, true);
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<div class="relative inline-block" bind:this={containerEl}>
	<button
		type="button"
		class="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
		onclick={toggle}
		aria-haspopup="listbox"
		aria-expanded={isOpen}
	>
		<span>{activeSeason?.name ?? 'No Season'}</span>
		<svg
			class="h-4 w-4 text-slate-400 transition-transform {isOpen ? 'rotate-180' : ''}"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 20 20"
			fill="currentColor"
			aria-hidden="true"
		>
			<path
				fill-rule="evenodd"
				d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
				clip-rule="evenodd"
			/>
		</svg>
	</button>

	{#if isOpen}
		<div
			class="absolute left-0 z-50 mt-1 min-w-[12rem] rounded-md border border-slate-200 bg-white py-1 shadow-lg"
			role="listbox"
			aria-label="Select a season"
		>
			{#each seasons as season (season.id)}
				<button
					type="button"
					class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition {season.id === activeSeason?.id ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-700 hover:bg-slate-50'}"
					role="option"
					aria-selected={season.id === activeSeason?.id}
					onclick={() => selectSeason(season.id)}
				>
					{#if season.id === activeSeason?.id}
						<svg
							class="h-4 w-4 shrink-0 text-slate-600"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							aria-hidden="true"
						>
							<path
								fill-rule="evenodd"
								d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
								clip-rule="evenodd"
							/>
						</svg>
					{:else}
						<span class="inline-block h-4 w-4 shrink-0"></span>
					{/if}
					<span>{season.name}</span>
				</button>
			{/each}

			{#if seasons.length > 0}
				<div class="my-1 border-t border-slate-100"></div>
			{/if}

			<button
				type="button"
				class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50"
				onclick={handleNewSeason}
			>
				<svg
					class="h-4 w-4 shrink-0"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
					aria-hidden="true"
				>
					<path
						d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"
					/>
				</svg>
				<span>New Season</span>
			</button>
		</div>
	{/if}
</div>
