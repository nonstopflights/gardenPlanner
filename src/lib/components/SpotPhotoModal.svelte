<script lang="ts">
	import { onMount } from 'svelte';

	interface SpotImage {
		id: number;
		imagePath: string;
		caption: string | null;
		takenAt: string | null;
		uploadedAt: string;
	}

	interface Props {
		plantId: number;
		plantName: string;
		bedId: number;
		bedName: string;
		zone: string;
		seasonId: number;
		seasonName: string;
		onClose: () => void;
	}

	let { plantId, plantName, bedId, bedName, zone, seasonId, seasonName, onClose }: Props = $props();

	let images: SpotImage[] = $state([]);
	let loading = $state(true);

	function zoneLabel(z: string): string {
		return z.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
	}

	function formatDate(dateStr: string): string {
		const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	onMount(async () => {
		try {
			const res = await fetch(
				`/api/plants/${plantId}/images/spot?bedId=${bedId}&zone=${encodeURIComponent(zone)}&seasonId=${seasonId}`
			);
			if (res.ok) {
				images = await res.json();
			}
		} catch (err) {
			console.error('Failed to load spot images:', err);
		} finally {
			loading = false;
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
	onclick={handleBackdropClick}
>
	<div class="relative mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl">
		<!-- Header -->
		<div class="flex items-start justify-between border-b border-slate-100 px-6 py-4">
			<div>
				<h2 class="text-lg font-semibold text-slate-900">{plantName}</h2>
				<p class="mt-0.5 text-sm text-slate-500">
					{bedName} &middot; {zoneLabel(zone)}
				</p>
				<span class="mt-1 inline-block rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
					{seasonName}
				</span>
			</div>
			<button
				onclick={onClose}
				class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
				aria-label="Close"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto p-6">
			{#if loading}
				<div class="flex items-center justify-center py-12">
					<p class="text-sm text-slate-400">Loading photos...</p>
				</div>
			{:else if images.length === 0}
				<div class="flex flex-col items-center justify-center py-12">
					<p class="text-sm text-slate-400">No photos tagged for this spot and season yet.</p>
					<a
						href="/plants/{plantId}"
						class="mt-3 text-sm font-medium text-slate-600 underline decoration-slate-300 hover:text-slate-900 hover:decoration-slate-500"
					>
						Go to plant page to add photos
					</a>
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-3">
					{#each images as img (img.id)}
						<div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
							<img
								src={img.imagePath}
								alt={img.caption ?? 'Plant photo'}
								class="h-40 w-full object-cover"
							/>
							<div class="px-3 py-2">
								{#if img.caption}
									<p class="text-sm italic text-slate-500">{img.caption}</p>
								{/if}
								<p class="mt-0.5 text-xs text-slate-400">
									{formatDate(img.takenAt ?? img.uploadedAt)}
								</p>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="border-t border-slate-100 px-6 py-3">
			<a
				href="/plants/{plantId}"
				class="text-sm font-medium text-slate-600 hover:text-slate-900"
			>
				View all photos &rarr;
			</a>
		</div>
	</div>
</div>
