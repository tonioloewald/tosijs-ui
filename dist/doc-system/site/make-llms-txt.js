import * as fs from 'fs';
import * as path from 'path';
import { buildSlugMap, pathForSlug } from '../routing';
const SRC = 'src';
const DIST = 'dist';
function extractTitle(text) {
    const match = text.match(/^#+ (.+)/m);
    return match ? match[1].trim() : '';
}
function extractDescription(text) {
    const lines = text.split('\n');
    let inCodeBlock = false;
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            continue;
        }
        if (inCodeBlock)
            continue;
        // Skip non-prose lines
        if (!trimmed ||
            trimmed.startsWith('#') ||
            trimmed.startsWith('<') ||
            trimmed.startsWith('[') ||
            trimmed.startsWith('>') ||
            trimmed.startsWith('|') ||
            trimmed.startsWith('-') ||
            trimmed.startsWith('*')) {
            continue;
        }
        // Truncate long descriptions
        return trimmed.length > 120 ? trimmed.slice(0, 117) + '...' : trimmed;
    }
    return '';
}
/**
 * Build entries from the extracted corpus — every doc that was actually
 * extracted (`.md`, `.ts`/`.js`/`.css` doc comments, auto-created sections),
 * linking to its rendered URL. This is what the build uses: it reflects the real
 * docs and needs no `dist/` library output.
 */
export function entriesFromCorpus(corpus, meta) {
    const slugMap = buildSlugMap(corpus);
    const base = (meta.baseUrl ?? '').replace(/\/$/, '');
    return corpus
        .filter((doc) => doc.title && !doc.hidden)
        .map((doc) => ({
        title: doc.title,
        description: doc.description?.trim() || extractDescription(doc.text ?? ''),
        link: base + pathForSlug(slugMap[doc.filename]),
    }))
        .sort((a, b) => a.title.localeCompare(b.title));
}
/**
 * Legacy fallback when no corpus is passed (e.g. running this file directly):
 * scan `src/*.ts` for doc-comment blocks that have a built `dist/*.js` sibling.
 */
function entriesFromSrcScan() {
    const entries = [];
    let files = [];
    try {
        files = fs.readdirSync(SRC).filter((f) => f.endsWith('.ts'));
    }
    catch {
        return entries;
    }
    for (const file of files) {
        const content = fs.readFileSync(path.join(SRC, file), 'utf8');
        const match = content.match(/\/\*#([\s\S]+?)\*\//);
        if (!match)
            continue;
        const markdown = match[1].trim();
        const title = extractTitle(markdown);
        if (!title)
            continue;
        const distFile = file.replace(/\.ts$/, '.js');
        if (!fs.existsSync(path.join(DIST, distFile)))
            continue;
        entries.push({
            title,
            description: extractDescription(markdown),
            link: `dist/${distFile}`,
        });
    }
    return entries.sort((a, b) => a.title.localeCompare(b.title));
}
/**
 * Write an `llms.txt` index. Pass the extracted `corpus` (the build does) to
 * index every doc by its rendered URL; omit it to fall back to the legacy
 * `src/*.ts`-with-`dist/*.js` scan.
 */
export function generateLlmsTxt(outputPath, meta = {}, corpus) {
    // package.json supplies fallback name/version/description, but a doc site
    // isn't guaranteed to have one (or it may be unreadable) — degrade gracefully
    // rather than aborting the whole build.
    let pkg = {};
    try {
        pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    }
    catch {
        console.warn('llms.txt: no readable package.json — using config values only');
    }
    const entries = corpus ? entriesFromCorpus(corpus, meta) : entriesFromSrcScan();
    // Only orient agents about the live-example execution model when the corpus
    // actually has live examples (a book / pure-docs site has none).
    const exampleFence = /```(js|tjs|ts|html|css)\b/;
    const hasLiveExamples = !!corpus && corpus.some((d) => exampleFence.test(d.text ?? ''));
    const liveExampleNote = hasLiveExamples
        ? [
            'Live examples run inline on the shared page by default (not sandboxed):',
            'each has its own `preview` element, but they share one tosijs module, so',
            '`tosi()` state singletons are shared across every example on a page. This is',
            'deliberate (it shows tosi isolation and lets you drive demos via the global',
            'singleton). Namespace example state with unique top-level keys so examples',
            "don't clobber each other; the `iframe` attribute isolates DOM/CSS, not state.",
            '',
        ]
        : [];
    const name = meta.name ?? pkg.name ?? '';
    const description = meta.description ?? pkg.description ?? '';
    const links = [];
    if (meta.baseUrl)
        links.push(`- Docs: ${meta.baseUrl}`);
    if (meta.projectLinks?.github)
        links.push(`- Source: ${meta.projectLinks.github}`);
    const npm = meta.projectLinks?.npm ??
        (pkg.name ? `https://www.npmjs.com/package/${pkg.name}` : undefined);
    if (npm)
        links.push(`- npm: ${npm}`);
    const lines = [
        `# ${name}${pkg.version ? ` v${pkg.version}` : ''}`,
        '',
        description,
        ...(meta.tagline ? ['', meta.tagline] : []),
        '',
        ...links,
        '',
        '## Documentation',
        '',
        'Full documentation, with live code examples, is at the links below.',
        '',
        ...liveExampleNote,
        '## Pages',
        '',
    ];
    for (const entry of entries) {
        lines.push(`- ${entry.link} — ${entry.title}`);
        if (entry.description) {
            lines.push(`  ${entry.description}`);
        }
    }
    lines.push('');
    fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
    console.log(`llms.txt generated (${entries.length} entries)`);
}
// Allow running directly (no corpus — uses the legacy src/*.ts scan)
if (import.meta.main) {
    generateLlmsTxt('dist/llms.txt');
}
