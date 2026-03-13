<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';

	interface Props {
		content?: string;
		minHeight?: string;
		onchange?: (html: string) => void;
	}

	let { content = '', minHeight = '120px', onchange }: Props = $props();

	let editorEl: HTMLDivElement;
	let editor: Editor | null = null;
	let tick = $state(0);

	onMount(() => {
		editor = new Editor({
			element: editorEl,
			extensions: [StarterKit],
			content,
			editorProps: {
				attributes: {
					class: 'prose prose-sm prose-slate max-w-none focus:outline-none px-3 py-2',
					style: `min-height: ${minHeight}`
				}
			},
			onTransaction: () => {
				tick++;
			},
			onUpdate: ({ editor: e }) => {
				const html = e.getHTML();
				onchange?.(html === '<p></p>' ? '' : html);
			}
		});
	});

	onDestroy(() => {
		editor?.destroy();
	});

	function isActive(type: string, attrs?: Record<string, unknown>) {
		tick; // reactive dependency
		return editor?.isActive(type, attrs) ?? false;
	}
</script>

<div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
	<div class="flex items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-1.5 py-1">
		<button
			type="button"
			onclick={() => editor?.chain().focus().toggleBold().run()}
			class="rounded p-1.5 text-xs font-bold transition {isActive('bold')
				? 'bg-slate-200 text-slate-900'
				: 'text-slate-500 hover:bg-slate-100'}"
		>B</button>
		<button
			type="button"
			onclick={() => editor?.chain().focus().toggleItalic().run()}
			class="rounded p-1.5 text-xs italic transition {isActive('italic')
				? 'bg-slate-200 text-slate-900'
				: 'text-slate-500 hover:bg-slate-100'}"
		>I</button>
		<div class="mx-1 h-4 w-px bg-slate-200"></div>
		<button
			type="button"
			onclick={() => editor?.chain().focus().toggleBulletList().run()}
			class="rounded p-1.5 transition {isActive('bulletList')
				? 'bg-slate-200 text-slate-900'
				: 'text-slate-500 hover:bg-slate-100'}"
			title="Bullet list"
		>
			<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
		</button>
		<button
			type="button"
			onclick={() => editor?.chain().focus().toggleOrderedList().run()}
			class="rounded p-1.5 transition {isActive('orderedList')
				? 'bg-slate-200 text-slate-900'
				: 'text-slate-500 hover:bg-slate-100'}"
			title="Numbered list"
		>
			<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
				<path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 6a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 6a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
			</svg>
		</button>
		<div class="mx-1 h-4 w-px bg-slate-200"></div>
		<button
			type="button"
			onclick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
			class="rounded p-1.5 text-xs font-semibold transition {isActive('heading', { level: 3 })
				? 'bg-slate-200 text-slate-900'
				: 'text-slate-500 hover:bg-slate-100'}"
			title="Heading"
		>H</button>
	</div>
	<div bind:this={editorEl}></div>
</div>
