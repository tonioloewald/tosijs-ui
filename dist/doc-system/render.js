/*
Shared markdown rendering for the static doc system.

`renderDocMarkdown` MUST stay in lockstep with how <tosi-md> renders doc text
(see src/markdown-viewer.ts: `marked(source, this.options)` with default options),
so the build-time pre-render is byte-identical to what the component would produce
on the client. Fenced code blocks are left as <pre><code class="language-*"> so the
static page shows readable, indexable code AND the component can later upgrade
consecutive blocks into <live-example> widgets via insertExamples().
*/
import { marked } from 'marked';
export const docMarkedOptions = {};
/** Render a doc's markdown text to HTML (synchronous, default marked options). */
export function renderDocMarkdown(text) {
    return marked(text, docMarkedOptions);
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
    return slice.slice(0, wordEnd).replace(/[,;:.\s]+$/, '').trim() + '…';
}
