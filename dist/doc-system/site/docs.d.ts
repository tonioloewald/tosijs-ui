export interface Doc {
    text: string;
    title: string;
    filename: string;
    path: string;
    pin?: 'top' | 'bottom';
    /** sub-order within a pin bucket (lower first); section docs use this */
    order?: number;
    /** parent doc name or slug — groups this doc into a nav section */
    parent?: string;
    /**
     * Not published AT ALL — absent from docs.json, from the generated pages, from every
     * book, and from llms.txt. For incomplete chapters and working notes.
     *
     * Inherited by descendants: hiding a section hides what is inside it. A child cannot
     * un-hide itself, because accidentally publishing one chapter of a withheld section is
     * the failure worth preventing.
     *
     * (`draft: true` in YAML frontmatter sets this.) Previously this only removed a doc
     * from the nav and books while leaving its full text in docs.json AND giving it a
     * pre-rendered public page — so "drafts don't ship" was false twice over.
     */
    hidden?: boolean;
    /**
     * Which book(s) this doc binds into. A name, a list of names, or `'none'` to keep it
     * on the site and out of every book. Unset means the default book; `'default'` names
     * the default book so a list can include it — `["default", "appendices"]` binds the
     * doc into both, which is how shared front matter or a glossary works.
     *
     * Inherited down the `parent` chain, nearest declaration winning outright (a list
     * replaces an inherited value rather than adding to it) — so you mark a section, and an
     * individual chapter can still divert, join several volumes, or opt out.
     */
    book?: string | string[];
    /**
     * Opt this page out of the reading column.
     *
     * Prose wants a measure — 44em is roughly the line length people read comfortably, and it is
     * the default for good reason. But a doc site is not only prose: a demo, a dashboard, a wide
     * table or a canvas is *worse* squeezed into a column, and having to choose one habit for the
     * whole site is what makes people build a second site.
     *
     * `'full-width'` keeps the nav and the chrome and drops the measure. Set it the same way as
     * `pin` or `order`: the JSON metadata block in code or markdown, or `layout:` in YAML
     * frontmatter. Unset means the reading column, so nothing changes for a corpus that does not
     * ask.
     *
     * `'full-screen'` drops the measure AND puts the nav away, so the page is the whole viewport —
     * for a demo, a canvas, an embedded app. It needed `<tosi-sidenav navHidden>` to exist first:
     * the nav width and the nav's own `display` are both INLINE styles, so no stylesheet could
     * reach them from out here.
     */
    layout?: 'full-width' | 'full-screen';
    headTitle?: string;
    description?: string;
    keywords?: string | string[];
    image?: string;
    noindex?: boolean;
    bakes?: Array<[string, {
        dialect: string;
        js: string;
    }]>;
    author?: string;
    date?: string;
}
export interface ExtractDocsOptions {
    paths: string[];
    ignore?: string[];
    output?: string;
}
/**
 * Parse & strip a leading YAML frontmatter block (`---\n…\n---`). Every prose
 * toolchain (Jekyll/Hugo/Astro/Obsidian/Pandoc) uses it, so authors paste it in;
 * without this the `---` was rendered as content (and became the doc title).
 *
 * A minimal, dependency-free subset: `key: value` lines mapped onto doc metadata
 * (`title`, `order`→number, `author`, `date`, `draft: true`→hidden). Only strips
 * when the block actually parses as ≥1 key/value pair, so a genuine leading `---`
 * horizontal rule is left alone. Frontmatter wins over the JSON-comment metadata.
 */
export declare function parseFrontmatter(content: string): {
    data: Partial<Doc>;
    body: string;
};
export declare function extractDocs(options: ExtractDocsOptions): Doc[];
export declare function saveDocsJSON(docs: Doc[], outputPath: string): void;
