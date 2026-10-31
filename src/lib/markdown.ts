/**
 * Tiny, dependency-free markdown renderer for lesson notes and announcements.
 * Safety model: the whole input is HTML-escaped first, then a small set of
 * patterns is turned into tags. Links/images only allow http(s) URLs.
 */
const escapeHtml = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const SAFE_URL = /^https?:\/\/[^\s"'<>]+$/i;

function inline(s: string): string {
	return s
		.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, url) =>
			SAFE_URL.test(url) ? `<img src="${url}" alt="${alt}" loading="lazy" />` : m
		)
		.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, url) =>
			SAFE_URL.test(url) ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>` : m
		)
		.replace(/`([^`]+)`/g, '<code>$1</code>')
		.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
		.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
		.replace(/(^|[\s(])(https?:\/\/[^\s<]+)/g, (m, pre, url) =>
			`${pre}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
		);
}

export function renderMarkdown(src: string | null | undefined): string {
	if (!src) return '';
	const lines = escapeHtml(src.replace(/\r\n?/g, '\n')).split('\n');
	const out: string[] = [];
	let list: 'ul' | 'ol' | null = null;
	let para: string[] = [];

	const flushPara = () => {
		if (para.length) out.push(`<p>${para.map(inline).join('<br />')}</p>`);
		para = [];
	};
	const closeList = () => {
		if (list) out.push(`</${list}>`);
		list = null;
	};

	for (const raw of lines) {
		const line = raw.trimEnd();
		let m: RegExpMatchArray | null;
		if (!line.trim()) {
			flushPara();
			closeList();
		} else if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
			flushPara();
			closeList();
			out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`);
		} else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
			flushPara();
			if (list !== 'ul') {
				closeList();
				out.push('<ul>');
				list = 'ul';
			}
			out.push(`<li>${inline(m[1])}</li>`);
		} else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
			flushPara();
			if (list !== 'ol') {
				closeList();
				out.push('<ol>');
				list = 'ol';
			}
			out.push(`<li>${inline(m[1])}</li>`);
		} else if ((m = line.match(/^&gt;\s?(.*)$/))) {
			flushPara();
			closeList();
			out.push(`<blockquote>${inline(m[1])}</blockquote>`);
		} else {
			closeList();
			para.push(line);
		}
	}
	flushPara();
	closeList();
	return out.join('\n');
}
