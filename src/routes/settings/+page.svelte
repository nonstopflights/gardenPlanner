<script lang="ts">
	import { page } from '$app/stores';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';

	let { data } = $props();

	let model = $state<string>('');
	$effect(() => {
		// Initialize from server data once (or when page data first arrives)
		if (!model && data?.model) {
			model = data.model;
		}
	});

	const saved = $derived($page.url.searchParams.get('saved') === '1');
	const backedUp = $derived($page.url.searchParams.get('backed-up') === '1');

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="mx-auto max-w-2xl space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-slate-900">Settings</h1>
		<p class="mt-1 text-sm text-slate-500">Configure AI and app behavior.</p>
	</div>

	{#if saved}
		<div class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
			Saved.
		</div>
	{/if}

	{#if backedUp}
		<div class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
			Backup created successfully.
		</div>
	{/if}

	<Card>
		<CardHeader>
			<CardTitle>AI model</CardTitle>
			<CardDescription>Choose which OpenAI model the app uses for plant enrichment and classification.</CardDescription>
		</CardHeader>
		<CardContent>
			<form method="POST" action="?/setModel" class="space-y-4">
				<input type="hidden" name="model" value={model} />
				<div class="space-y-2">
					<Label for="model">Model</Label>
					<Select.Root type="single" bind:value={model}>
						<Select.Trigger id="model" class="w-full">
							<span data-slot="select-value">{model || 'Select a model'}</span>
						</Select.Trigger>
						<Select.Content>
							{#each data.allowedModels as m}
								<Select.Item value={m}>{m}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<p class="text-xs text-slate-500">
						Default is <span class="font-medium text-slate-700">gpt-5.4-mini</span>. This setting is stored in a cookie.
					</p>
				</div>

				<div class="flex justify-end">
					<Button type="submit">Save</Button>
				</div>
			</form>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Data backup</CardTitle>
			<CardDescription>
				Backups include the database and all images. The last 5 are kept automatically.
				Backups also sync to iCloud when running on the server.
			</CardDescription>
			<p class="mt-2 flex items-center gap-1.5 font-mono text-xs text-slate-400">
				<svg class="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
				</svg>
				{data.backupDir}
			</p>
		</CardHeader>
		<CardContent class="space-y-4">
			<form method="POST" action="?/backup" class="flex justify-end">
				<Button type="submit" variant="outline">Create backup now</Button>
			</form>

			{#if data.backups.length === 0}
				<p class="text-sm text-slate-500">No backups found.</p>
			{:else}
				<div class="divide-y divide-slate-100 rounded-lg border border-slate-200">
					{#each data.backups as backup}
						<div class="flex items-center justify-between px-4 py-3">
							<div>
								<p class="text-sm font-medium text-slate-800">{formatDate(backup.created)}</p>
								<p class="text-xs text-slate-400">{backup.name}</p>
							</div>
							<span class="text-xs text-slate-500">{formatSize(backup.size)}</span>
						</div>
					{/each}
				</div>
			{/if}
		</CardContent>
	</Card>
</div>
