<script lang="ts">
	interface Props {
		seasons: { id: number; name: string }[];
		onSave: (data: {
			name: string;
			year: number;
			type: string;
			startDate: string;
			endDate: string;
			copyFromSeasonId?: number;
		}) => void;
		onClose: () => void;
	}

	let { seasons, onSave, onClose }: Props = $props();

	const currentYear = new Date().getFullYear();
	const seasonTypes = ['Spring', 'Summer', 'Fall', 'Winter', 'Full Year'] as const;

	let type = $state<string>('Spring');
	let year = $state<number>(currentYear);
	let name = $state<string>(`Spring ${currentYear}`);
	let startDate = $state<string>('');
	let endDate = $state<string>('');
	let copyFromSeasonId = $state<number | undefined>(undefined);

	let nameManuallyEdited = $state(false);

	$effect(() => {
		if (!nameManuallyEdited) {
			name = `${type} ${year}`;
		}
	});

	function handleNameInput(event: Event) {
		const target = event.target as HTMLInputElement;
		name = target.value;
		nameManuallyEdited = true;
	}

	function handleTypeChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		type = target.value;
		nameManuallyEdited = false;
	}

	function handleYearChange(event: Event) {
		const target = event.target as HTMLInputElement;
		year = Number(target.value);
		nameManuallyEdited = false;
	}

	function handleSubmit(event: Event) {
		event.preventDefault();
		onSave({
			name,
			year,
			type,
			startDate,
			endDate,
			...(copyFromSeasonId !== undefined ? { copyFromSeasonId } : {})
		});
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
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
	onclick={handleBackdropClick}
>
	<div
		class="mx-4 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg"
		role="dialog"
		aria-modal="true"
		aria-labelledby="new-season-title"
	>
		<h2 id="new-season-title" class="text-lg font-semibold text-slate-900">New Season</h2>

		<form class="mt-5 space-y-4" onsubmit={handleSubmit}>
			<!-- Type -->
			<div>
				<label for="season-type" class="block text-sm font-medium text-slate-700">Type</label>
				<select
					id="season-type"
					class="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
					value={type}
					onchange={handleTypeChange}
				>
					{#each seasonTypes as seasonType}
						<option value={seasonType}>{seasonType}</option>
					{/each}
				</select>
			</div>

			<!-- Year -->
			<div>
				<label for="season-year" class="block text-sm font-medium text-slate-700">Year</label>
				<input
					id="season-year"
					type="number"
					class="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
					value={year}
					oninput={handleYearChange}
					min={2000}
					max={2100}
				/>
			</div>

			<!-- Name -->
			<div>
				<label for="season-name" class="block text-sm font-medium text-slate-700">Name</label>
				<input
					id="season-name"
					type="text"
					class="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
					value={name}
					oninput={handleNameInput}
					required
					placeholder="e.g. Spring 2025"
				/>
			</div>

			<!-- Start Date -->
			<div>
				<label for="season-start" class="block text-sm font-medium text-slate-700"
					>Start Date</label
				>
				<input
					id="season-start"
					type="date"
					class="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
					bind:value={startDate}
					required
				/>
			</div>

			<!-- End Date -->
			<div>
				<label for="season-end" class="block text-sm font-medium text-slate-700">End Date</label>
				<input
					id="season-end"
					type="date"
					class="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
					bind:value={endDate}
					required
				/>
			</div>

			<!-- Copy from -->
			<div>
				<label for="season-copy" class="block text-sm font-medium text-slate-700"
					>Copy bed layouts from</label
				>
				<select
					id="season-copy"
					class="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
					onchange={(e) => {
						const val = (e.target as HTMLSelectElement).value;
						copyFromSeasonId = val ? Number(val) : undefined;
					}}
				>
					<option value="">None</option>
					{#each seasons as season (season.id)}
						<option value={season.id}>{season.name}</option>
					{/each}
				</select>
			</div>

			<!-- Actions -->
			<div class="flex items-center justify-end gap-3 pt-2">
				<button
					type="button"
					class="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
					onclick={onClose}
				>
					Cancel
				</button>
				<button
					type="submit"
					class="rounded-md border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
				>
					Create
				</button>
			</div>
		</form>
	</div>
</div>
