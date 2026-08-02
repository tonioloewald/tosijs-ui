/*
Which ePubs does this build produce, and where do they land?

The output filename is DERIVED — from the project name and, for a named volume, the
`book` value (`foresight-rpg` + `book: "foresight-1986"` →
`foresight-rpg-foresight-1986.epub`). Nothing published that derivation, so a consumer
wanting to link their own book had to reverse-engineer it from the source and re-derive it
by hand every time a volume was renamed.

That is not a documentation gap, it is a missing seam: foresight-rpg shipped a valid ePub
that **nobody could download**, because the site built the file and then linked to nothing.
It was caught on review rather than by anyone noticing — which is the tell. A build that
produces an artifact should be able to say where it is.

One definition, used by three callers: the ePub build names its output with it, the
orchestrator writes a manifest from it, and `<!-- epub-downloads -->` in any page renders
from it. Consumers can import it directly rather than hard-coding a filename.
*/
import { DEFAULT_BOOK, namedBooks, partitionByBook } from '../book-target.js';
import { buildSlugMap } from '../routing.js';
/** Lowercase, hyphenated — the same shape the ePub build uses for filenames. */
function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}
/**
 * The identity of one volume. `bookTarget` undefined means the default volume.
 *
 * Kept deliberately pure and dependency-free so the ePub builder, the site build and an
 * adopter's own script all agree by construction rather than by comment.
 */
export function epubVolumeIdentity(config, bookTarget) {
    const epub = typeof config.epub === 'object' ? config.epub : {};
    const baseTitle = epub.title ?? config.name ?? 'book';
    const title = bookTarget
        ? (epub.volumeTitles?.[bookTarget] ?? `${baseTitle} — ${bookTarget}`)
        : baseTitle;
    const filename = bookTarget
        ? `${slugify(baseTitle)}-${slugify(bookTarget)}.epub`
        : `${slugify(baseTitle)}.epub`;
    const base = (config.basePath ?? '/').replace(/\/+$/, '');
    return { book: bookTarget ?? DEFAULT_BOOK, title, filename, url: `${base}/${filename}` };
}
/**
 * Every volume this corpus will produce, default first.
 *
 * Empty when the corpus has no publishable docs at all — which is a real state (everything
 * hidden, or everything `book: "none"`) and must not be reported as one nameless volume.
 */
export function listEpubVolumes(corpus, config) {
    const slugs = buildSlugMap(corpus);
    const partitioned = partitionByBook(corpus, slugs);
    const books = [
        ...(partitioned.get(DEFAULT_BOOK)?.length ? [undefined] : []),
        ...namedBooks(corpus, slugs),
    ];
    return books.map((b) => epubVolumeIdentity(config, b));
}
/** The marker a consumer drops into a page to get the download list. */
export const EPUB_DOWNLOADS_MARKER = /<!--\s*epub-downloads\s*-->/g;
/**
 * Replace `<!-- epub-downloads -->` with a markdown list of the built volumes.
 *
 * Substituted at BUILD time, into the doc text, so the statically-rendered page and the
 * hydrated SPA show the same thing and the client needs no new data source. A marker in a
 * corpus that builds no ePub renders as nothing rather than an empty list or a stray
 * comment.
 */
export function renderEpubDownloads(text, volumes) {
    /*
    No `.test()` guard — but as simplification, not a bug fix.
  
    A `/g` regex carries `lastIndex`, and `.test()` advances it, which LOOKS like it should
    make a `test`-then-`replace` pair stateful. It does not: `String.replace` with `/g`
    resets `lastIndex` to 0, and a failing `.test()` resets it too, so the pair is
    self-correcting. (Verified rather than reasoned — an earlier version of this comment
    confidently described an alternating no-op that mutation testing showed does not exist.)
  
    The guard is dropped because `replace` already returns the input unchanged when nothing
    matches, so it only bought a redundant scan and a subtlety to explain.
    */
    const list = volumes
        .map((v) => `- [${v.title}](${v.url}) *(ePub)*`)
        .join('\n');
    return text.replace(EPUB_DOWNLOADS_MARKER, list);
}
