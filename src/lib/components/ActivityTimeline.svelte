<script lang="ts">
	const ACTIVITY_TYPES = ['planted', 'watered', 'fertilized', 'harvested', 'pruned', 'note'] as const;
	type ActivityType = (typeof ACTIVITY_TYPES)[number];

	const ACTIVITY_COLORS: Record<ActivityType, { pill: string; dot: string }> = {
		planted: {
			pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
			dot: 'bg-emerald-500'
		},
		watered: {
			pill: 'bg-sky-50 text-sky-700 border-sky-200',
			dot: 'bg-sky-500'
		},
		fertilized: {
			pill: 'bg-amber-50 text-amber-700 border-amber-200',
			dot: 'bg-amber-500'
		},
		harvested: {
			pill: 'bg-green-50 text-green-700 border-green-200',
			dot: 'bg-green-500'
		},
		pruned: {
			pill: 'bg-orange-50 text-orange-700 border-orange-200',
			dot: 'bg-orange-500'
		},
		note: {
			pill: 'bg-slate-50 text-slate-700 border-slate-200',
			dot: 'bg-slate-400'
		}
	};

	interface Activity {
		id: number;
		activityType: string;
		description: string | null;
		activityDate: string;
		createdAt: string;
	}

	interface Props {
		activities: Activity[];
		onAddActivity: (activity: {
			activityType: string;
			description: string;
			activityDate: string;
		}) => void;
		onDeleteActivity: (id: number) => void;
	}

	let { activities, onAddActivity, onDeleteActivity }: Props = $props();

	let selectedType: ActivityType | null = $state(null);
	let description = $state('');
	let activityDate = $state(new Date().toISOString().split('T')[0]);

	let sortedActivities = $derived(
		[...activities].sort(
			(a, b) => new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime()
		)
	);

	function getColors(type: string) {
		return ACTIVITY_COLORS[type as ActivityType] ?? ACTIVITY_COLORS.note;
	}

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr + 'T00:00:00');
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function handleSelectType(type: ActivityType) {
		if (selectedType === type) {
			selectedType = null;
		} else {
			selectedType = type;
			activityDate = new Date().toISOString().split('T')[0];
			description = '';
		}
	}

	function handleSave() {
		if (!selectedType) return;
		onAddActivity({
			activityType: selectedType,
			description: description.trim(),
			activityDate
		});
		selectedType = null;
		description = '';
		activityDate = new Date().toISOString().split('T')[0];
	}

	function handleCancel() {
		selectedType = null;
		description = '';
		activityDate = new Date().toISOString().split('T')[0];
	}
</script>

<div class="space-y-6">
	<!-- Quick-add bar -->
	<div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
		<p class="mb-3 text-sm font-medium text-slate-600">Log activity</p>
		<div class="flex flex-wrap gap-2">
			{#each ACTIVITY_TYPES as type}
				<button
					onclick={() => handleSelectType(type)}
					class="rounded-full border px-3 py-1 text-sm font-medium capitalize transition-all {getColors(type).pill} {selectedType === type ? 'ring-2 ring-slate-400 ring-offset-1' : 'hover:shadow-sm'}"
				>
					{type}
				</button>
			{/each}
		</div>

		<!-- Inline form -->
		{#if selectedType}
			<div class="mt-4 space-y-3 border-t border-slate-100 pt-4">
				<div class="flex items-center gap-2">
					<span class="text-sm text-slate-500">Adding:</span>
					<span
						class="rounded-full border px-2.5 py-0.5 text-sm font-medium capitalize {getColors(selectedType).pill}"
					>
						{selectedType}
					</span>
				</div>
				<textarea
					bind:value={description}
					placeholder="Description (optional)"
					rows="2"
					class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
				></textarea>
				<div class="flex flex-wrap items-center gap-3">
					<input
						type="date"
						bind:value={activityDate}
						class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
					/>
					<div class="flex gap-2">
						<button
							onclick={handleSave}
							class="rounded-lg bg-slate-800 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
						>
							Save
						</button>
						<button
							onclick={handleCancel}
							class="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Timeline -->
	{#if sortedActivities.length === 0}
		<p class="py-8 text-center text-sm text-slate-400">
			No activities yet. Log your first activity above.
		</p>
	{:else}
		<div class="relative ml-3 border-l-2 border-slate-200 pl-6">
			{#each sortedActivities as activity (activity.id)}
				{@const colors = getColors(activity.activityType)}
				<div class="group relative pb-6 last:pb-0">
					<!-- Dot on the timeline -->
					<div
						class="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-white {colors.dot}"
					></div>

					<!-- Card -->
					<div
						class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
					>
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0 flex-1">
								<div class="mb-1 flex flex-wrap items-center gap-2">
									<span
										class="rounded-full border px-2 py-0.5 text-xs font-medium capitalize {colors.pill}"
									>
										{activity.activityType}
									</span>
									<span class="text-xs text-slate-400">
										{formatDate(activity.activityDate)}
									</span>
								</div>
								{#if activity.description}
									<p class="text-sm text-slate-600">{activity.description}</p>
								{/if}
							</div>
							<button
								onclick={() => onDeleteActivity(activity.id)}
								class="flex-shrink-0 rounded p-1 text-slate-300 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
								aria-label="Delete activity"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-4 w-4"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clip-rule="evenodd"
									/>
								</svg>
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
