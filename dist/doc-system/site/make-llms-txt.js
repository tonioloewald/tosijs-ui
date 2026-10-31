import * as fs from 'fs';
import * as path from 'path';
import { buildSlugMap, pathForSlug, withBase } from '../routing.js';
import { buildNavTree } from '../nav-tree.js';
import { flatten, stripDocMeta } from '../book-html.js';
import { liveFenceLanguages } from './build-warnings.js';
import { pageDescription } from './page-metadata.js';
import { docDescription } from '../render.js';
const SRC = 'src';
const DIST = 'dist';
function extractTitle(text) {
    const match = text.match(/^#+ (.+)/m);
    return match ? match[1].trim() : '';
}
/** The pages an index lists: titled, not hidden, not noindex. */
function indexable(corpus) {
    // A noindex page is one the author asked not to be found; the sitemap and the markdown
    // copies already leave it out, and an index for agents is no different.
    return corpus.filter((doc) => !!doc.title && !doc.hidden && !doc.noindex);
}
/**
 * The indexable pages in NAV order, each with its top-level section (#3564). An index sorted
 * by title reads a book's chapters out of order, and the nav order is the author's.
 */
function inNavOrder(corpus) {
    const docs = indexable(corpus);
    const roots = buildNavTree(docs, buildSlugMap(corpus));
    const out = [];
    for (const root of roots) {
        const section = root.children.length ? root.doc.title : '';
        for (const node of flatten([root]))
            out.push({ doc: node.doc, section });
    }
    return out;
}
/**
 * Build entries from the extracted corpus — every doc that was actually
 * extracted (`.md`, `.ts`/`.js`/`.css` doc comments, auto-created sections),
 * linking to its rendered URL, in nav order. This is what the build uses: it
 * reflects the real docs and needs no `dist/` library output.
 */
export function entriesFromCorpus(corpus, meta) {
    const slugMap = buildSlugMap(corpus);
    const base = (meta.baseUrl ?? '').replace(/\/$/, '');
    return inNavOrder(corpus).map(({ doc, section }) => {
        const link = base + withBase(meta.basePath, pathForSlug(slugMap[doc.filename]));
        return {
            // The <title> a search result shows names the page better than a terse nav label.
            title: doc.headTitle?.trim() || doc.title,
            // The page's own description, by the rule its <head> uses; no site fallback, which
            // would repeat the summary on every line.
            description: pageDescription({ ...doc, title: doc.title }).text,
            link,
            markdown: meta.markdownPages === false
                ? undefined
                : `${link.endsWith('/') ? link : link + '/'}index.md`,
            section,
        };
    });
}
/**
 * Legacy fallback when no corpus is passed (e.g. running this file directly):
 * scan `src/*.ts` for doc-comment blocks that have a built `dist/*.js` sibling.
 */
function entriesFromSrcScan() {
    const entries = [];
    let files;
    try {
        /*
        `.tjs` too — and note `'x.tjs'.endsWith('.ts')` is FALSE, so the old test excluded it
        silently rather than catching it by accident. Same root as tosijs-ui#108: a module ported
        from `.ts` to `.tjs` dropped out of both the doc corpus and this index at once.
        */
        files = fs
            .readdirSync(SRC)
            .filter((f) => f.endsWith('.ts') || f.endsWith('.tjs'));
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
            description: docDescription(markdown),
            link: `dist/${distFile}`,
        });
    }
    return entries.sort((a, b) => a.title.localeCompare(b.title));
}
/**
 * Write an `llms.txt` index in the llmstxt.org shape (#3564): an H1 with the project's name, its
 * summary as a blockquote, notes, then H2 sections of `- [title](url): description` lines. Pages
 * are in nav order, and a nav section with pages under it is a section of its own; the
 * top-level pages are `## Docs`. Each link is the page's markdown copy when the site writes
 * them, which is what an agent fetching from the index wants.
 *
 * Pass the extracted `corpus` (the build does) to index every doc by its rendered URL; omit it
 * to fall back to the legacy `src/*.ts`-with-`dist/*.js` scan.
 */
export function generateLlmsTxt(outputPath, meta = {}, corpus) {
    const pkg = readPackage();
    const entries = corpus
        ? entriesFromCorpus(corpus, meta)
        : entriesFromSrcScan();
    // Only orient agents about the live-example execution model when the corpus
    // actually has live examples (a book / pure-docs site has none).
    // THE shared rule (build-warnings.ts), under the site's policy — this was a regex of its
    // own, which told an opt-in prose site about live examples it does not have.
    const hasLiveExamples = !!corpus && liveFenceLanguages(corpus, meta.liveExamples).size > 0;
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
    const markdownLinks = !!corpus && meta.markdownPages !== false;
    const pagesNote = markdownLinks
        ? [
            "Each link below is the page's markdown. Drop `index.md` from it for the HTML page" +
                (hasLiveExamples ? ', where the examples run.' : '.'),
            ...(meta.baseUrl
                ? [`The whole corpus, as one markdown file: ${fullTxtUrl(meta)}`]
                : []),
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
        `# ${name}`,
        '',
        ...(description ? [`> ${description}`, ''] : []),
        ...(meta.tagline ? [meta.tagline, ''] : []),
        ...(pkg.version ? [`Version ${pkg.version}.`, ''] : []),
        ...(links.length ? [...links, ''] : []),
        ...pagesNote,
        ...liveExampleNote,
    ];
    let section;
    for (const entry of entries) {
        const heading = entry.section || 'Docs';
        if (heading !== section) {
            if (section !== undefined)
                lines.push('');
            section = heading;
            lines.push(`## ${heading}`, '');
        }
        const url = (markdownLinks && entry.markdown) || entry.link;
        lines.push(`- [${linkText(entry.title)}](${url})` +
            (entry.description ? `: ${oneLine(entry.description)}` : ''));
    }
    lines.push('');
    fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
    console.log(`llms.txt generated (${entries.length} entries)`);
}
/**
 * Write `llms-full.txt`: the whole indexed corpus as one markdown file, in nav order (#3564).
 * For a reader that wants everything in one fetch rather than following the index. Each page
 * is its own markdown, under a `# title` when it has none, with its URL after it.
 */
export function generateLlmsFullTxt(outputPath, meta, corpus) {
    const pkg = readPackage();
    const name = meta.name ?? pkg.name ?? '';
    const description = meta.description ?? pkg.description ?? '';
    const slugMap = buildSlugMap(corpus);
    const base = (meta.baseUrl ?? '').replace(/\/$/, '');
    const parts = [
        `# ${name}` + (description ? `\n\n> ${description}` : '') + '\n',
    ];
    for (const { doc } of inNavOrder(corpus)) {
        const text = stripDocMeta(doc.text ?? '').trim();
        const url = base + withBase(meta.basePath, pathForSlug(slugMap[doc.filename]));
        parts.push((/^#\s/m.test(text) ? '' : `# ${doc.title}\n\n`) +
            text +
            `\n\nSource: ${url}\n`);
    }
    fs.writeFileSync(outputPath, parts.join('\n---\n\n'), 'utf8');
}
function fullTxtUrl(meta) {
    return ((meta.baseUrl ?? '').replace(/\/$/, '') +
        withBase(meta.basePath, '/llms-full.txt'));
}
/** package.json's fallbacks; a doc site isn't guaranteed one, so degrade, never abort. */
function readPackage() {
    try {
        return JSON.parse(fs.readFileSync('package.json', 'utf8'));
    }
    catch {
        console.warn('llms.txt: no readable package.json — using config values only');
        return {};
    }
}
/** Link text cannot hold an unbalanced bracket. */
function linkText(title) {
    return title.replace(/[[\]]/g, '\\$&');
}
/** One entry is one line. */
function oneLine(text) {
    return text.replace(/\s+/g, ' ').trim();
}
// Allow running directly (no corpus — uses the legacy src/*.ts scan)
if (import.meta.main) {
    generateLlmsTxt('dist/llms.txt');
}
