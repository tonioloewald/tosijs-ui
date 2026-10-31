import type { ExamplePolicy } from '../example-policy.js';
/** A doc as it appears in the extracted corpus (docs.json). */
interface CorpusDoc {
    title?: string;
    headTitle?: string;
    filename: string;
    path?: string;
    text?: string;
    description?: string;
    hidden?: boolean;
    noindex?: boolean;
    pin?: 'top' | 'bottom';
    order?: number;
    parent?: string;
}
interface LlmsEntry {
    title: string;
    description: string;
    /** rendered-doc URL (corpus mode) or dist/*.js path (legacy scan) */
    link: string;
    /** the page's markdown copy, when the site writes one */
    markdown?: string;
    /** the nav section this page sits in (its top-level ancestor), '' at the top level */
    section?: string;
}
export interface LlmsTxtMeta {
    name?: string;
    description?: string;
    /**
     * Site **ORIGIN ONLY** — `https://example.github.io`, not
     * `https://example.github.io/repo`. The path the site is mounted under is `basePath`,
     * and this module applies it (#144). Putting the path here doubles it in every
     * canonical URL and sitemap entry, because `generate-site` adds `basePath` on top.
     */
    baseUrl?: string;
    /** URL prefix the site is mounted under — mirrors `SiteConfig.basePath`. */
    basePath?: string;
    /** project links — `github` / `npm` (or any) become Source/npm links */
    projectLinks?: Record<string, string | undefined>;
    /** optional framing line(s) under the description */
    tagline?: string;
    /**
     * @deprecated Ignored since 1.16.16. It used to add a paragraph about driving the dev
     * server with the `hj` CLI; `llms.txt` is for whoever consumes the library, so that note
     * belongs in the project's own agent instructions. Kept so existing callers still compile.
     */
    haltijaDev?: boolean | 'tunnel';
    /**
     * Mirrors `SiteConfig.markdownPages` (default true): the build writes `index.md` beside
     * every page, so the index says so. Pass false when the site ships HTML only — pointing a
     * reader at a file that is not there costs more than not mentioning it.
     */
    markdownPages?: boolean;
    /** Mirrors `SiteConfig.liveExamples`: which fences are live decides the examples note. */
    liveExamples?: ExamplePolicy;
}
/**
 * Build entries from the extracted corpus — every doc that was actually
 * extracted (`.md`, `.ts`/`.js`/`.css` doc comments, auto-created sections),
 * linking to its rendered URL, in nav order. This is what the build uses: it
 * reflects the real docs and needs no `dist/` library output.
 */
export declare function entriesFromCorpus(corpus: CorpusDoc[], meta: LlmsTxtMeta): LlmsEntry[];
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
export declare function generateLlmsTxt(outputPath: string, meta?: LlmsTxtMeta, corpus?: CorpusDoc[]): void;
/**
 * Write `llms-full.txt`: the whole indexed corpus as one markdown file, in nav order (#3564).
 * For a reader that wants everything in one fetch rather than following the index. Each page
 * is its own markdown, under a `# title` when it has none, with its URL after it.
 */
export declare function generateLlmsFullTxt(outputPath: string, meta: LlmsTxtMeta, corpus: CorpusDoc[]): void;
export {};
