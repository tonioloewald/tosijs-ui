/** A doc as it appears in the extracted corpus (docs.json). */
interface CorpusDoc {
    title?: string;
    filename: string;
    text?: string;
    description?: string;
    hidden?: boolean;
}
interface LlmsEntry {
    title: string;
    description: string;
    /** rendered-doc URL (corpus mode) or dist/*.js path (legacy scan) */
    link: string;
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
     * Mirrors `SiteConfig.haltijaDev`. When set, `llms.txt` tells an agent it can DRIVE the
     * running page rather than reason about it from source — which is the single most useful
     * thing an agent can know about a project it is working on, and was previously discoverable
     * only by reading the doc-site-system page in full.
     *
     * `'tunnel'` also carries that meaning — it is `true` plus a remote path — so the note is
     * written on truthiness, not on `=== true`. Getting that wrong would silently drop the note
     * for exactly the projects that enabled the MORE capable mode.
     */
    haltijaDev?: boolean | 'tunnel';
    /**
     * Mirrors `SiteConfig.markdownPages` (default true): the build writes `index.md` beside
     * every page, so the index says so. Pass false when the site ships HTML only — pointing a
     * reader at a file that is not there costs more than not mentioning it.
     */
    markdownPages?: boolean;
}
/**
 * Build entries from the extracted corpus — every doc that was actually
 * extracted (`.md`, `.ts`/`.js`/`.css` doc comments, auto-created sections),
 * linking to its rendered URL. This is what the build uses: it reflects the real
 * docs and needs no `dist/` library output.
 */
export declare function entriesFromCorpus(corpus: CorpusDoc[], meta: LlmsTxtMeta): LlmsEntry[];
/**
 * Write an `llms.txt` index. Pass the extracted `corpus` (the build does) to
 * index every doc by its rendered URL; omit it to fall back to the legacy
 * `src/*.ts`-with-`dist/*.js` scan.
 */
export declare function generateLlmsTxt(outputPath: string, meta?: LlmsTxtMeta, corpus?: CorpusDoc[]): void;
export {};
