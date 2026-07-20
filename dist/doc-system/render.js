/*
Shared markdown rendering for the static doc system.

Both the build-time pre-render and the client (doc-browser) call THIS function, so
the static page hydrates byte-identically. Fenced code blocks are left as
<pre><code class="language-*"> so the static page shows readable, indexable code
AND the component can later upgrade consecutive blocks into <live-example> widgets
via insertExamples(). A fence info string may carry a `#id` (```js#my-example) to
give that example a stable anchor — see the docMarked renderer below.
*/
import { Marked, Renderer } from 'marked';
const baseRenderer = new Renderer();
let currentBakes;
const docMarked = new Marked();
docMarked.use({
    renderer: {
        code(token) {
            // Fence info grammar: `<lang>` optionally with a `:<mode>` and/or `#<id>` in
            // EITHER order — `js`, `css#anchor`, `js:iframe`, `ts:ide#demo`, `ts#demo:ide`.
            // `:mode` (inline | iframe | ide) sets the live example's execution mode; `#id`
            // gives it a stable anchor. `#id` is `[A-Za-z0-9_-]+` and `:mode` is `[a-z]+`, so
            // the two can't overlap — parse each independently, order-free. Both are stripped
            // so the language stays clean (`language-js`) for grouping/highlighting.
            const info = String(token.lang || '');
            const lang = info.match(/^[a-z]+/)?.[0] ?? '';
            const id = info.match(/#([A-Za-z0-9_-]+)/)?.[1] ?? '';
            const mode = info.match(/:([a-z]+)/)?.[1] ?? '';
            const bake = currentBakes?.get(token.text);
            if (!id && !mode && !bake)
                return false; // default rendering — byte-identical
            let html = baseRenderer.code({ ...token, lang });
            const attrs = [
                id && `data-example-id="${id}"`,
                mode && `data-example-mode="${mode}"`,
            ]
                .filter(Boolean)
                .join(' ');
            if (attrs)
                html = html.replace(/^<pre>/, `<pre ${attrs}>`);
            if (bake) {
                // `<` → < prevents a `</script>` inside the JS from breaking the tag;
                // JSON.parse decodes it unchanged at hydration.
                const json = JSON.stringify(bake.js).replace(/</g, '\\u003c');
                html += `<script type="application/tosi-transpiled" data-dialect="${bake.dialect}">${json}</script>`;
            }
            return html;
        },
    },
});
// ── Prose Markdown: wikilinks + footnotes ────────────────────────────────────
// Enabled by default because each activates ONLY on its own syntax ([[…]] /
// [^id]) — a doc that doesn't use them renders byte-identically (tosijs-ui's own
// docs use neither). marked core supports neither; both are common in prose.
function slugify(s) {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// Per-parse footnote state. `parse()` is synchronous and Marked tokenizes fully
// before rendering, so a module-level object is safe: preprocess resets it, the
// tokenizers fill it (defs during the block pass, refs during inline — refs set
// the number by first-appearance order), postprocess renders the endnotes.
const plainMarked = new Marked(); // renders footnote-definition markdown (no extensions)
let footnoteDefs = new Map();
let footnoteOrder = [];
docMarked.use({
    hooks: {
        preprocess(markdown) {
            footnoteDefs = new Map();
            footnoteOrder = [];
            return markdown;
        },
        postprocess(html) {
            if (footnoteOrder.length === 0)
                return html;
            const items = footnoteOrder
                .map((id) => {
                const body = plainMarked.parseInline(footnoteDefs.get(id) ?? '');
                const eid = slugify(id);
                return `<li id="fn-${eid}"><p>${body} <a href="#fnref-${eid}" class="footnote-backref" aria-label="Back to reference">↩</a></p></li>`;
            })
                .join('\n');
            return `${html}\n<section class="footnotes" role="doc-endnotes">\n<hr />\n<ol>\n${items}\n</ol>\n</section>\n`;
        },
    },
    extensions: [
        {
            // [[slug]] / [[slug|label]] → link to /slug/. Not matched inside code spans
            // (Marked tokenizes those first). Resolves by slugifying the target.
            name: 'wikilink',
            level: 'inline',
            start(src) {
                return src.match(/\[\[/)?.index;
            },
            tokenizer(src) {
                const m = /^\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/.exec(src);
                if (!m)
                    return undefined;
                return {
                    type: 'wikilink',
                    raw: m[0],
                    target: m[1].trim(),
                    label: (m[2] ?? m[1]).trim(),
                };
            },
            renderer(token) {
                return `<a href="/${slugify(token.target)}/" class="wikilink">${escapeHtml(token.label)}</a>`;
            },
        },
        {
            // [^id]: definition (single line) — collected, rendered as endnotes.
            name: 'footnoteDef',
            level: 'block',
            start(src) {
                return src.match(/^\[\^[^\]]+\]:/m)?.index;
            },
            tokenizer(src) {
                const m = /^\[\^([^\]]+)\]:[ \t]*([^\n]*)(?:\n|$)/.exec(src);
                if (!m)
                    return undefined;
                footnoteDefs.set(m[1].trim(), m[2].trim());
                return { type: 'footnoteDef', raw: m[0] }; // collected; renders nothing inline
            },
            renderer() {
                return '';
            },
        },
        {
            // [^id] reference → superscript link to the endnote.
            name: 'footnoteRef',
            level: 'inline',
            start(src) {
                return src.match(/\[\^/)?.index;
            },
            tokenizer(src) {
                const m = /^\[\^([^\]]+)\]/.exec(src);
                if (!m)
                    return undefined;
                const id = m[1].trim();
                if (!footnoteOrder.includes(id))
                    footnoteOrder.push(id);
                return { type: 'footnoteRef', raw: m[0], id };
            },
            renderer(token) {
                const n = footnoteOrder.indexOf(token.id) + 1;
                const eid = slugify(token.id);
                return `<sup class="footnote-ref"><a href="#fn-${eid}" id="fnref-${eid}">${n}</a></sup>`;
            },
        },
    ],
});
/** Render a doc's markdown text to HTML (synchronous, default marked options). */
export function renderDocMarkdown(text, opts = {}) {
    currentBakes = opts.bakes;
    try {
        return docMarked.parse(text);
    }
    finally {
        currentBakes = undefined;
    }
}
/**
 * Derive a clean <meta name="description"> from a doc's first prose paragraph.
 * Skips the title heading, code fences, tables, quotes, html and image/link-only
 * lines; strips inline markdown; drops low-value "This is a…" leads; and truncates
 * on a sentence boundary where possible (never mid-clause ending in a comma).
 * Pages can override this entirely via their JSON metadata `description`.
 */
export function docDescription(text, maxLength = 160) {
    const lines = text.split('\n');
    let inFence = false;
    const prose = [];
    for (const raw of lines) {
        const line = raw.trim();
        if (line.startsWith('```') || line.startsWith('~~~')) {
            inFence = !inFence;
            continue;
        }
        if (inFence)
            continue;
        if (line === '') {
            if (prose.length)
                break; // end of the first prose paragraph
            continue;
        }
        if (line.startsWith('#'))
            continue; // headings
        if (line.startsWith('<!--') || line.startsWith('/*'))
            continue; // metadata
        if (line.startsWith('<'))
            continue; // raw html
        if (line.startsWith('|') || line.startsWith('>'))
            continue; // tables, quotes
        if (line.startsWith('![') || /^\[.*\]\(.*\)$/.test(line))
            continue; // image/link-only
        prose.push(line);
        if (prose.join(' ').length >= maxLength)
            break;
    }
    let s = prose
        .join(' ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/^This (?:is|component is|widget is)\s+(?:a|an|the)\s+/i, '')
        .trim();
    if (!s)
        return '';
    s = s.charAt(0).toUpperCase() + s.slice(1);
    if (s.length <= maxLength)
        return s.replace(/[,;:\s]+$/, '');
    const slice = s.slice(0, maxLength);
    const sentenceEnd = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
    if (sentenceEnd > maxLength * 0.6)
        return slice.slice(0, sentenceEnd + 1).trim();
    const wordEnd = slice.lastIndexOf(' ');
    return (slice
        .slice(0, wordEnd)
        .replace(/[,;:.\s]+$/, '')
        .trim() + '…');
}
