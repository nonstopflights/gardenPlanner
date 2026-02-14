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
						Default is <span class="font-medium text-slate-700">gpt-5-mini</span>. This setting is stored in a cookie.
					</p>
				</div>

				<div class="flex justify-end">
					<Button type="submit">Save</Button>
				</div>
			</form>
		</CardContent>
	</Card>
</div>

