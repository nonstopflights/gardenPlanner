<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		editing: boolean;
		onStartEdit: () => void;
		onSave: () => void;
		onClear: () => void;
		children: Snippet;
		editChildren: Snippet;
	}

	let { title, editing, onStartEdit, onSave, onClear, children, editChildren }: Props = $props();

	let containerElement: HTMLDivElement;

	function handleClickOutside(event: MouseEvent) {
		if (!editing || !containerElement) return;
		if (!containerElement.contains(event.target as Node)) {
			onSave();
		}
	}

	onMount(() => {
		document.addEventListener('mousedown', handleClickOutside);
	});

	onDestroy(() => {
		document.removeEventListener('mousedown', handleClickOutside);
	});
</script>

<div bind:this={containerElement} class="rounded-2xl border border-slate-200 bg-white shadow-sm transition {editing ? 'ring-2 ring-slate-300' : ''}">
	{#if editing}
		<div class="p-6">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-base font-semibold text-slate-900">{title}</h2>
				<div class="flex gap-2">
					<button
						type="button"
						onclick={onClear}
						class="rounded px-2.5 py-1 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
					>Clear</button>
					<button
						type="button"
						onclick={onSave}
						class="rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-slate-800"
					>Save</button>
				</div>
			</div>
			{@render editChildren()}
		</div>
	{:else}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			onclick={onStartEdit}
			class="group cursor-pointer rounded-2xl p-6 transition hover:bg-slate-50/50"
		>
			<div class="flex items-center justify-between">
				<h2 class="text-base font-semibold text-slate-900">{title}</h2>
				<div class="flex items-center gap-1 text-xs text-slate-400 opacity-0 transition group-hover:opacity-100">
					<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
					</svg>
					Click to edit
				</div>
			</div>
			{@render children()}
		</div>
	{/if}
</div>
