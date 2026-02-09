<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';

	interface Props {
		content: string;
		placeholder?: string;
		onSave: (html: string) => void;
	}

	let { content, placeholder = 'Click to add content...', onSave }: Props = $props();

	let editing = $state(false);
	let editor: Editor | null = $state(null);
	let editorElement: HTMLDivElement;
	let containerElement: HTMLDivElement;
	let originalContent = '';

	function startEditing() {
		if (editing) return;
		editing = true;
		originalContent = content;

		// Create editor on next tick after DOM updates
		requestAnimationFrame(() => {
			if (!editorElement) return;
			editor = new Editor({
				element: editorElement,
				extensions: [StarterKit],
				content: content || '',
				editorProps: {
					attributes: {
						class: 'prose prose-sm prose-slate max-w-none focus:outline-none min-h-[80px] px-3 py-2'
					}
				}
			});
			editor.commands.focus('end');
		});
	}

	function save() {
		if (!editor) return;
		const html = editor.getHTML();
		// Tiptap returns <p></p> for empty content
		const isEmpty = html === '<p></p>' || html === '';
		const newContent = isEmpty ? '' : html;
		onSave(newContent);
		stopEditing();
	}

	function clear() {
		onSave('');
		stopEditing();
	}

	function stopEditing() {
		if (editor) {
			editor.destroy();
			editor = null;
		}
		editing = false;
	}

	function handleClickOutside(event: MouseEvent) {
		if (!editing || !containerElement) return;
		if (!containerElement.contains(event.target as Node)) {
			// Auto-save on click away
			if (editor) {
				const html = editor.getHTML();
				const isEmpty = html === '<p></p>' || html === '';
				const newContent = isEmpty ? '' : html;
				if (newContent !== originalContent) {
					onSave(newContent);
				}
			}
			stopEditing();
		}
	}

	onMount(() => {
		document.addEventListener('mousedown', handleClickOutside);
	});

	onDestroy(() => {
		document.removeEventListener('mousedown', handleClickOutside);
		if (editor) {
			editor.destroy();
			editor = null;
		}
	});

	function isActive(type: string, attrs?: Record<string, unknown>): boolean {
		return editor?.isActive(type, attrs) ?? false;
	}
</script>

<div bind:this={containerElement}>
	{#if editing}
		<!-- Toolbar -->
		<div class="mb-1 flex items-center gap-0.5 rounded-t-lg border border-b-0 border-slate-200 bg-slate-50 px-1.5 py-1">
			<button
				type="button"
				onclick={() => editor?.chain().focus().toggleBold().run()}
				class="rounded p-1.5 text-xs font-bold transition {isActive('bold') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}"
				title="Bold"
			>B</button>
			<button
				type="button"
				onclick={() => editor?.chain().focus().toggleItalic().run()}
				class="rounded p-1.5 text-xs italic transition {isActive('italic') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}"
				title="Italic"
			>I</button>
			<div class="mx-1 h-4 w-px bg-slate-200"></div>
			<button
				type="button"
				onclick={() => editor?.chain().focus().toggleBulletList().run()}
				class="rounded p-1.5 transition {isActive('bulletList') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}"
				title="Bullet List"
			>
				<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			</button>
			<button
				type="button"
				onclick={() => editor?.chain().focus().toggleOrderedList().run()}
				class="rounded p-1.5 transition {isActive('orderedList') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}"
				title="Numbered List"
			>
				<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
					<path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 6a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 6a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
				</svg>
			</button>
			<div class="mx-1 h-4 w-px bg-slate-200"></div>
			<button
				type="button"
				onclick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
				class="rounded p-1.5 text-xs font-semibold transition {isActive('heading', { level: 3 }) ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}"
				title="Heading"
			>H</button>

			<div class="flex-1"></div>

			<button
				type="button"
				onclick={clear}
				class="rounded px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
			>Clear</button>
			<button
				type="button"
				onclick={save}
				class="rounded bg-slate-900 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-slate-800"
			>Save</button>
		</div>

		<!-- Editor -->
		<div
			bind:this={editorElement}
			class="rounded-b-lg border border-slate-200 bg-white"
		></div>
	{:else}
		<!-- View mode - clickable -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			onclick={startEditing}
			class="group cursor-pointer rounded-lg border border-transparent px-3 py-2 transition hover:border-slate-200 hover:bg-slate-50/50"
		>
			{#if content}
				<div class="prose prose-sm prose-slate max-w-none">
					{@html content}
				</div>
			{:else}
				<p class="text-sm italic text-slate-400">{placeholder}</p>
			{/if}
			<div class="mt-1 flex items-center gap-1 text-xs text-slate-400 opacity-0 transition group-hover:opacity-100">
				<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
				</svg>
				Click to edit
			</div>
		</div>
	{/if}
</div>
