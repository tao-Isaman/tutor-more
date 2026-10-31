<script lang="ts">
	import { renderMarkdown } from '#lib/markdown.ts';
	let { source, class: klass = '' }: { source: string | null | undefined; class?: string } = $props();
</script>

<!-- renderMarkdown escapes all input before adding a fixed set of tags -->
<div class="prose-read {klass}">{@html renderMarkdown(source)}</div>
