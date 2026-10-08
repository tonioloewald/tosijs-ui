/*
Single-sourcing: write a passage once, publish it in several places (#217).

Two directives, both spelled like the doc metadata block and both resolved at EXTRACTION, so
the corpus that reaches the site, the ePub, `llms.txt` and the markdown pages has already been
assembled and no consumer needs to know either exists:

  <!--{ "inset": "install.md#with-bun" }-->        another doc, or one heading's section of it
  <!--{ "only": "book" }--> … <!--{ "end": "only" }-->   text for the site or for books only

Resolving here rather than at render is what makes an inset's live examples and tests run
where they are inset: by the time anything looks for a fence, the fence is in the page.

The directives are found with marked's own lexer, as top-level HTML blocks. Nothing here scans
lines: a directive shown inside a code fence is an illustration, and only the parser the pages
are rendered with knows which is which (see `code-fences.ts` for how that was learned).

Failures are build errors, never warnings. An inset that resolves nowhere, an include cycle and
an unbalanced `only` each leave a page silently missing text, and a book is the medium where
that cannot be corrected after the fact.
*/
import * as fs from 'fs';
import * as path from 'path';
import { marked } from 'marked';
import { buildSlugMap, resolveParent, slugify } from '../routing.js';
import { mayHaveSingleSourceDirective } from '../book-target.js';
export class SingleSourceError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SingleSourceError';
    }
}
const DIRECTIVE = /^\s*<!--\s*(\{[\s\S]*\})\s*-->\s*$/;
/** The directive a top-level HTML token spells, or null for ordinary HTML. */
function directiveOf(token) {
    if (token.type !== 'html')
        return null;
    const m = DIRECTIVE.exec(token.raw);
    if (!m)
        return null;
    let data;
    try {
        data = JSON.parse(m[1]);
    }
    catch {
        return null;
    }
    if (!data || typeof data !== 'object')
        return null;
    if (typeof data.inset === 'string')
        return { kind: 'inset', ref: data.inset };
    if (data.only !== undefined) {
        const targets = (Array.isArray(data.only) ? data.only : [data.only]).map((t) => String(t).trim().toLowerCase());
        return { kind: 'only', targets };
    }
    if (data.end === 'only')
        return { kind: 'end' };
    return null;
}
/** Is this JSON directive single-sourcing rather than doc metadata? */
export function isSingleSourceDirective(json) {
    try {
        const data = JSON.parse(json);
        return (!!data &&
            typeof data === 'object' &&
            (typeof data.inset === 'string' ||
                data.only !== undefined ||
                data.end === 'only'));
    }
    catch {
        return false;
    }
}
const mayHaveDirective = mayHaveSingleSourceDirective;
const headingSlug = (token) => slugify(String(token.text ?? '').replace(/`/g, ''));
/*
What an inset contributes: the passage, not its place in some other page's outline.

A whole doc loses its metadata block and its title heading; a section loses its own heading.
The host supplies the heading at the level that fits where the passage now sits, which is the
only place that level can be known.
*/
function bodyOf(text, anchor, ref) {
    const tokens = marked.lexer(text);
    if (!anchor) {
        let seenTitle = false;
        let seenMeta = false;
        return tokens
            .filter((t) => {
            // The doc's own metadata block: the first JSON comment that is not a directive.
            if (!seenMeta &&
                t.type === 'html' &&
                DIRECTIVE.test(t.raw) &&
                !directiveOf(t)) {
                seenMeta = true;
                return false;
            }
            if (!seenTitle && t.type === 'heading' && t.depth === 1) {
                seenTitle = true;
                return false;
            }
            return true;
        })
            .map((t) => t.raw)
            .join('')
            .trim();
    }
    const want = slugify(anchor);
    const start = tokens.findIndex((t) => t.type === 'heading' && headingSlug(t) === want);
    if (start < 0) {
        const have = tokens
            .filter((t) => t.type === 'heading')
            .map((t) => `#${headingSlug(t)}`);
        throw new SingleSourceError(`inset "${ref}": no heading "#${anchor}" in that document.\n` +
            `   Headings there: ${have.join(', ') || '(none)'}`);
    }
    const depth = tokens[start].depth;
    let end = tokens.length;
    for (let i = start + 1; i < tokens.length; i++) {
        if (tokens[i].type === 'heading' && tokens[i].depth <= depth) {
            end = i;
            break;
        }
    }
    return tokens
        .slice(start + 1, end)
        .map((t) => t.raw)
        .join('')
        .trim();
}
/*
Replace every inset directive in the corpus with the text it names.

A reference is tried as a DOC first (filename, slug or title, the same matcher `parent` uses)
and then as a FILE relative to the including doc's source. The second form is what lets a
fragment exist without being a page: a file whose name starts with `_` is skipped by extraction
and can still be inset.

Mutates `docs` in place and returns how many insets were resolved.
*/
export function resolveInsets(docs, options = {}) {
    if (!docs.some((d) => mayHaveDirective(d.text)))
        return 0;
    const root = path.resolve(options.root ?? process.cwd());
    const readFile = options.readFile ??
        ((p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : undefined));
    const slugMap = buildSlugMap(docs);
    const raw = new Map(docs.map((d) => [d.filename, d.text]));
    const byFilename = new Map(docs.map((d) => [d.filename, d]));
    const done = new Map();
    let count = 0;
    // `id` names a source for cycle reporting; `dir` is what a file inset is relative to.
    const expand = (text, id, dir, stack) => {
        if (!mayHaveDirective(text))
            return text;
        if (stack.includes(id)) {
            throw new SingleSourceError(`inset cycle: ${[...stack, id].join(' → ')}`);
        }
        const tokens = marked.lexer(text);
        if (!tokens.some((t) => directiveOf(t)?.kind === 'inset'))
            return text;
        return tokens
            .map((t) => {
            const d = directiveOf(t);
            if (d?.kind !== 'inset')
                return t.raw;
            count++;
            const [target, anchor] = d.ref.split('#');
            const next = [...stack, id];
            let source;
            let sourceId = '';
            let sourceDir;
            const docFile = resolveParent(target, docs, slugMap);
            if (docFile) {
                sourceId = docFile;
                const doc = byFilename.get(docFile);
                sourceDir = doc.path ? path.dirname(doc.path) : undefined;
                source = raw.get(docFile);
            }
            else if (dir !== undefined) {
                const abs = path.resolve(root, dir, target);
                if (abs !== root && !abs.startsWith(root + path.sep)) {
                    throw new SingleSourceError(`inset "${d.ref}" in ${id}: resolves outside the project.`);
                }
                sourceId = path.relative(root, abs);
                sourceDir = path.dirname(sourceId);
                // A fragment is not extracted, so its frontmatter was never stripped for it.
                source = readFile(abs)?.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
            }
            if (source === undefined) {
                throw new SingleSourceError(`inset "${d.ref}" in ${id}: no such document or file.\n` +
                    `   Tried a doc named "${target}" (filename, slug or title)` +
                    (dir !== undefined
                        ? `, then the file ${path.join(dir, target)}.`
                        : '.'));
            }
            const expanded = expand(source, sourceId, sourceDir, next);
            return bodyOf(expanded, anchor, d.ref) + '\n\n';
        })
            .join('');
    };
    for (const doc of docs) {
        if (!mayHaveDirective(doc.text))
            continue;
        const dir = doc.path ? path.dirname(doc.path) : undefined;
        done.set(doc.filename, expand(doc.text, doc.filename, dir, []));
    }
    for (const [filename, text] of done)
        byFilename.get(filename).text = text;
    return count;
}
/** Where conditional text can be aimed. */
const TARGETS = ['site', 'book'];
/*
One source, two variants: what the site shows and what a book binds.

`only` blocks do not nest. Nesting has no meaning with two targets (site inside book is
nothing), so a second `only` before an `end` is far more likely a forgotten `end` than an
intention, and it is reported as one.
*/
export function splitConditions(text, where = 'document') {
    if (!mayHaveDirective(text))
        return { site: text, book: text };
    const tokens = marked.lexer(text);
    if (!tokens.some((t) => directiveOf(t) && directiveOf(t).kind !== 'inset'))
        return { site: text, book: text };
    let site = '';
    let book = '';
    let open = null;
    for (const t of tokens) {
        const d = directiveOf(t);
        if (d?.kind === 'only') {
            if (open) {
                throw new SingleSourceError(`${where}: an "only" block opens inside another. Is an {"end": "only"} missing?`);
            }
            const unknown = d.targets.filter((x) => !TARGETS.includes(x));
            if (unknown.length || !d.targets.length) {
                throw new SingleSourceError(`${where}: "only" must name ${TARGETS.map((x) => `"${x}"`).join(' or ')}, not ${JSON.stringify(unknown.join(', '))}.`);
            }
            open = d.targets;
            continue;
        }
        if (d?.kind === 'end') {
            if (!open) {
                throw new SingleSourceError(`${where}: {"end": "only"} with no "only" block open.`);
            }
            open = null;
            continue;
        }
        if (!open || open.includes('site'))
            site += t.raw;
        if (!open || open.includes('book'))
            book += t.raw;
    }
    if (open) {
        throw new SingleSourceError(`${where}: an "only" block is never closed with {"end": "only"}.`);
    }
    return { site, book };
}
/*
Assemble the corpus: insets first, so a condition inside an inset passage travels with it,
then split each doc. `text` becomes the site's variant and `bookText` is set only where a book
differs, so every consumer that has never heard of conditions keeps reading the right thing and
only the two that bind books (`epub.ts`, `book-html.ts`) need to ask.
*/
export function assembleCorpus(docs, options = {}) {
    resolveInsets(docs, options);
    for (const doc of docs) {
        const { site, book } = splitConditions(doc.text, doc.filename);
        doc.text = site;
        if (book !== site)
            doc.bookText = book;
        else
            delete doc.bookText;
    }
}
