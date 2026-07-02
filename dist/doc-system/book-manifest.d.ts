export interface BookManifest {
    /**
     * Globs selecting which docs are in the book (matched against each doc's
     * `path` AND `filename`, so `chapters/**` or `*.md` both work). Default: every
     * visible doc.
     */
    include?: string[];
    /** Globs removed from the selection, applied after `include`. */
    exclude?: string[];
    /**
     * Explicit reading order, by filename (with or without extension), slug, or
     * title. Listed docs lead in this exact sequence; everything else follows in
     * normal order. Unmatched keys are ignored.
     */
    order?: string[];
    /**
     * Baseline order for docs you neither pinned via metadata nor named in
     * `order`: `'nav'` (default — today's pin / `order` / title sort) or
     * `'filename'` (natural sort, so `01-*.md`, `02-*.md`, … sequence with zero
     * metadata). A per-doc `order` still wins over `'filename'`.
     */
    sort?: 'nav' | 'filename';
}
interface BookDocLike {
    filename: string;
    path?: string;
    title?: string;
    order?: number;
}
/**
 * Apply a book manifest to the (already visible) corpus. Returns a NEW array of
 * shallow-copied docs with `order` overlaid for book sequencing. Pure — never
 * mutates the input, so the caller's site-nav copy is untouched.
 */
export declare function selectBookDocs<T extends BookDocLike>(docs: T[], manifest?: BookManifest): T[];
export {};
