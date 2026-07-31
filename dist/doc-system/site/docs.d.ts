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
     * Which book this doc binds into: a name, or `'none'` to keep it on the site but out
     * of every book. Unset means the default book.
     *
     * Inherited down the `parent` chain, nearest declaration winning — so you mark a
     * section, and an individual chapter can still divert to another volume or opt out.
     */
    book?: string;
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
