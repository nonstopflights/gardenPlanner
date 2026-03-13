<script lang="ts">
	interface Props {
		datesWithEntries: Set<string>;
		selectedDate: string | null;
		onSelectDate: (date: string | null) => void;
	}

	let { datesWithEntries, selectedDate, onSelectDate }: Props = $props();

	const todayDate = new Date();
	let viewYear = $state(todayDate.getFullYear());
	let viewMonth = $state(todayDate.getMonth());

	const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
	const MONTH_NAMES = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	let cells = $derived.by(() => {
		const firstDay = new Date(viewYear, viewMonth, 1).getDay();
		const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
		const arr: (number | null)[] = [];
		for (let i = 0; i < firstDay; i++) arr.push(null);
		for (let d = 1; d <= daysInMonth; d++) arr.push(d);
		while (arr.length % 7 !== 0) arr.push(null);
		return arr;
	});

	function toDateStr(day: number): string {
		return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
	}

	function handleDayClick(day: number | null) {
		if (!day) return;
		const ds = toDateStr(day);
		if (!datesWithEntries.has(ds)) return;
		onSelectDate(selectedDate === ds ? null : ds);
	}

	function prevMonth() {
		if (viewMonth === 0) { viewMonth = 11; viewYear--; }
		else viewMonth--;
	}

	function nextMonth() {
		if (viewMonth === 11) { viewMonth = 0; viewYear++; }
		else viewMonth++;
	}

	function isToday(day: number): boolean {
		return viewYear === todayDate.getFullYear() &&
			viewMonth === todayDate.getMonth() &&
			day === todayDate.getDate();
	}
</script>

<div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
	<div class="mb-3 flex items-center justify-between">
		<button
			onclick={prevMonth}
			class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</button>
		<span class="text-sm font-semibold text-slate-700">{MONTH_NAMES[viewMonth]} {viewYear}</span>
		<button
			onclick={nextMonth}
			class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</button>
	</div>

	<div class="mb-1 grid grid-cols-7 gap-px">
		{#each DAY_LABELS as d}
			<div class="text-center text-[10px] font-medium text-slate-400">{d}</div>
		{/each}
	</div>

	<div class="grid grid-cols-7 gap-px">
		{#each cells as day}
			{#if day === null}
				<div class="h-8"></div>
			{:else}
				{@const ds = toDateStr(day)}
				{@const hasEntry = datesWithEntries.has(ds)}
				{@const isSelected = selectedDate === ds}
				{@const today = isToday(day)}
				<button
					onclick={() => handleDayClick(day)}
					disabled={!hasEntry}
					class="relative flex h-8 flex-col items-center justify-center rounded text-xs transition
						{hasEntry ? 'cursor-pointer hover:bg-emerald-50' : 'cursor-default text-slate-300'}
						{isSelected ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}
						{today && !isSelected ? 'font-bold text-slate-900 underline' : ''}
					"
				>
					{day}
					{#if hasEntry}
						<span class="absolute bottom-0.5 h-1 w-1 rounded-full {isSelected ? 'bg-white/70' : 'bg-emerald-500'}"></span>
					{/if}
				</button>
			{/if}
		{/each}
	</div>

	{#if selectedDate}
		<button
			onclick={() => onSelectDate(null)}
			class="mt-3 w-full rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
		>
			Clear date filter
		</button>
	{/if}
</div>
