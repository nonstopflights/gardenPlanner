<script lang="ts">
	import type { Plant } from '$lib/db/queries';

	interface Props {
		plants: Plant[];
	}

	let { plants }: Props = $props();

	// Lancaster, PA frost dates
	const LAST_FROST_MONTH = 3; // April (0-indexed)
	const LAST_FROST_DAY = 28;
	const FIRST_FROST_MONTH = 9; // October (0-indexed)
	const FIRST_FROST_DAY = 11;

	const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const YEAR = new Date().getFullYear();

	// Convert a date to a fraction of the year (0–1)
	function dateToFraction(month: number, day: number): number {
		const date = new Date(YEAR, month, day);
		const start = new Date(YEAR, 0, 1);
		const end = new Date(YEAR + 1, 0, 1);
		return (date.getTime() - start.getTime()) / (end.getTime() - start.getTime());
	}

	// Get fraction for "weeks relative to last frost"
	function weeksFromLastFrost(weeks: number): number {
		const date = new Date(YEAR, LAST_FROST_MONTH, LAST_FROST_DAY);
		date.setDate(date.getDate() + weeks * 7);
		return dateToFraction(date.getMonth(), date.getDate());
	}

	// Get fraction for "weeks relative to first frost" (fall)
	function weeksFromFirstFrost(weeks: number): number {
		const date = new Date(YEAR, FIRST_FROST_MONTH, FIRST_FROST_DAY);
		date.setDate(date.getDate() + weeks * 7);
		return dateToFraction(date.getMonth(), date.getDate());
	}

	const lastFrostFrac = dateToFraction(LAST_FROST_MONTH, LAST_FROST_DAY);
	const firstFrostFrac = dateToFraction(FIRST_FROST_MONTH, FIRST_FROST_DAY);
	const todayFrac = dateToFraction(new Date().getMonth(), new Date().getDate());

	interface CalendarBar {
		label: string;
		left: number;
		width: number;
		color: string;
	}

	interface PlantRow {
		plant: Plant;
		bars: CalendarBar[];
	}

	let calendarPlants = $derived.by(() => {
		const rows: PlantRow[] = [];

		for (const plant of plants) {
			if (!plant.plantingSeason) continue;

			const bars: CalendarBar[] = [];
			const isFall = plant.plantingSeason === 'fall';

			if (plant.startIndoorsWeeks != null) {
				// Start indoors: spans ~2 weeks from the given point
				const startWeeks = isFall
					? weeksFromFirstFrost(-plant.startIndoorsWeeks)
					: weeksFromLastFrost(-plant.startIndoorsWeeks);
				const endFrac = startWeeks + (14 / 365); // ~2 week window
				bars.push({
					label: 'Start Indoors',
					left: Math.max(0, startWeeks) * 100,
					width: Math.max(0, Math.min(1, endFrac) - Math.max(0, startWeeks)) * 100,
					color: 'bg-violet-400'
				});
			}

			if (plant.transplantWeeks != null) {
				const startFrac = isFall
					? weeksFromFirstFrost(-plant.transplantWeeks)
					: weeksFromLastFrost(plant.transplantWeeks);
				const endFrac = startFrac + (14 / 365);
				bars.push({
					label: 'Transplant',
					left: Math.max(0, startFrac) * 100,
					width: Math.max(0, Math.min(1, endFrac) - Math.max(0, startFrac)) * 100,
					color: 'bg-emerald-400'
				});
			}

			if (plant.directSowWeeks != null) {
				const startFrac = isFall
					? weeksFromFirstFrost(-plant.directSowWeeks)
					: weeksFromLastFrost(plant.directSowWeeks);
				const endFrac = startFrac + (14 / 365);
				bars.push({
					label: 'Direct Sow',
					left: Math.max(0, startFrac) * 100,
					width: Math.max(0, Math.min(1, endFrac) - Math.max(0, startFrac)) * 100,
					color: 'bg-amber-400'
				});
			}

			// Harvest window based on daysToMaturity from the latest planting action
			if (plant.daysToMaturity) {
				const sowWeeks = plant.directSowWeeks ?? plant.transplantWeeks;
				if (sowWeeks != null) {
					const plantFrac = isFall
						? weeksFromFirstFrost(-(plant.directSowWeeks ?? plant.transplantWeeks!))
						: weeksFromLastFrost(plant.directSowWeeks ?? plant.transplantWeeks!);
					const harvestStart = plantFrac + (plant.daysToMaturity / 365);
					const harvestEnd = harvestStart + (21 / 365); // ~3 week harvest window
					bars.push({
						label: 'Harvest',
						left: Math.max(0, harvestStart) * 100,
						width: Math.max(0, Math.min(1, harvestEnd) - Math.max(0, harvestStart)) * 100,
						color: 'bg-green-400'
					});
				}
			}

			if (bars.length > 0) {
				rows.push({ plant, bars });
			}
		}

		return rows;
	});
</script>

{#if calendarPlants.length > 0}
	<div class="rounded-2xl border border-stone-200 bg-stone-50 p-6">
		<h2 class="font-display mb-1 text-base font-semibold text-slate-900">Planting Calendar</h2>
		<p class="mb-4 text-sm text-stone-500">
			Based on Lancaster, PA frost dates
			<span class="inline-flex items-center gap-1 ml-1">
				<span class="h-1.5 w-1.5 rounded-full bg-red-300"></span>
				<span>Last frost: <strong class="font-semibold text-stone-700">Apr 28</strong></span>
			</span>
			<span class="mx-1 text-stone-300">·</span>
			<span class="inline-flex items-center gap-1">
				<span class="h-1.5 w-1.5 rounded-full bg-blue-300"></span>
				<span>First frost: <strong class="font-semibold text-stone-700">Oct 11</strong></span>
			</span>
		</p>

		<!-- Legend -->
		<div class="mb-4 flex flex-wrap gap-3">
			<div class="flex items-center gap-1.5">
				<div class="h-2.5 w-5 rounded-sm bg-violet-400"></div>
				<span class="text-xs text-stone-600">Start Indoors</span>
			</div>
			<div class="flex items-center gap-1.5">
				<div class="h-2.5 w-5 rounded-sm bg-emerald-400"></div>
				<span class="text-xs text-stone-600">Transplant</span>
			</div>
			<div class="flex items-center gap-1.5">
				<div class="h-2.5 w-5 rounded-sm bg-amber-400"></div>
				<span class="text-xs text-stone-600">Direct Sow</span>
			</div>
			<div class="flex items-center gap-1.5">
				<div class="h-2.5 w-5 rounded-sm bg-green-400"></div>
				<span class="text-xs text-stone-600">Harvest</span>
			</div>
			<div class="flex items-center gap-1.5">
				<div class="h-3.5 w-0 border-l-2 border-dashed border-red-400"></div>
				<span class="text-xs text-stone-600">Last Frost</span>
			</div>
			<div class="flex items-center gap-1.5">
				<div class="h-3.5 w-0 border-l-2 border-dashed border-blue-400"></div>
				<span class="text-xs text-stone-600">First Frost</span>
			</div>
		</div>

		<!-- Scrollable calendar -->
		<div class="overflow-x-auto">
			<div class="min-w-[640px]">
				<!-- Month headers -->
				<div class="relative mb-1 flex">
					<div class="w-32 flex-shrink-0"></div>
					<div class="relative flex-1">
						<div class="flex">
					{#each MONTHS as month}
							<div class="flex-1 text-center text-xs font-medium text-stone-500">{month}</div>
						{/each}
						</div>
					</div>
				</div>

				<!-- Grid lines + frost markers shared container -->
				<div class="space-y-0">
					{#each calendarPlants as row (row.plant.id)}
						<div class="group flex items-center border-t border-stone-200 py-2 transition hover:bg-stone-100/60 -mx-2 px-2 rounded">
							<!-- Plant name -->
							<div class="w-32 flex-shrink-0 pr-3">
								<p class="font-display truncate text-sm font-medium text-slate-700">{row.plant.name}</p>
								{#if row.plant.variety}
									<p class="truncate text-xs italic text-stone-400">{row.plant.variety}</p>
								{/if}
							</div>

							<!-- Timeline bar area -->
							<div class="relative h-8 flex-1 rounded bg-stone-100/60">
								<!-- Month grid lines -->
								{#each MONTHS as _, i}
									<div
										class="absolute top-0 h-full border-l border-stone-200/60"
										style="left: {(i / 12) * 100}%"
									></div>
								{/each}

								<!-- Last frost line -->
								<div
									class="absolute top-0 z-10 h-full border-l-2 border-dashed border-red-300"
									style="left: {lastFrostFrac * 100}%"
								></div>

								<!-- First frost line -->
								<div
									class="absolute top-0 z-10 h-full border-l-2 border-dashed border-blue-300"
									style="left: {firstFrostFrac * 100}%"
								></div>

								<!-- Today marker -->
								<div
									class="absolute top-0 z-20 h-full w-0.5 bg-slate-800"
									style="left: {todayFrac * 100}%"
								></div>

								<!-- Bars -->
								{#each row.bars as bar}
									<div
										class="absolute top-1 z-10 h-5 rounded-sm {bar.color} opacity-80 transition-opacity hover:opacity-100"
										style="left: {bar.left}%; width: {Math.max(bar.width, 0.8)}%"
										title="{bar.label}"
									></div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-6 text-center">
		<p class="text-sm text-stone-500">No planting schedules yet. Edit a plant and set its planting season to see the calendar.</p>
	</div>
{/if}
