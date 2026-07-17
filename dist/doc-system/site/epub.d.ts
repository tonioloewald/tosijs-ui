import type { SiteConfig } from './site-config';
import { DEFAULT_BOOK_CSS, stripDocMeta } from '../book-html';
export { DEFAULT_BOOK_CSS, stripDocMeta };
declare global {
    var Bun: any;
}
export interface BookMeta {
    title: string;
    author: string;
    language: string;
    /** unique identifier (a URL or urn:) */
    identifier: string;
    /** dcterms:modified timestamp, e.g. 2026-06-28T00:00:00Z */
    modified: string;
}
export interface BuildEpubOptions {
    /** corpus path; default config.docsJson ?? 'demo/docs.json' */
    docsJson?: string;
    /** output .epub path; default `${outputDir}/${slug(name)}.epub` */
    output?: string;
    /** book title; default config.name */
    title?: string;
    /** author / publisher line */
    author?: string;
    /** BCP-47 language; default 'en' */
    language?: string;
    /** override the whole book stylesheet */
    css?: string;
    /** extra CSS appended to the default stylesheet (ignored if `css` is set) */
    extraCss?: string;
    /** ISO timestamp for dcterms:modified; default now (seconds precision) */
    modified?: string;
    /**
     * Cover image path (png/jpeg/gif). If omitted, a cover is generated from the
     * book title + a glyph (see `coverIcon`), rasterized to PNG via @resvg/resvg-js.
     */
    cover?: string;
    /**
     * SVG glyph embedded into the GENERATED cover, in place of the site favicon.
     * A root-relative served path (e.g. '/tosi-book.svg', resolved from the output
     * dir) or a repo-relative path. Must be a flat, self-contained SVG with
     * concrete colors (no CSS vars / <foreignObject>), since resvg rasterizes plain
     * SVG. Ignored when `cover` (a full image) is set.
     */
    coverIcon?: string;
    /** background color for the generated cover, default '#1f2933' */
    coverColor?: string;
}
export declare function escapeXml(s: string): string;
/**
 * Best-effort normalize marked's HTML output to well-formed XHTML: self-close
 * void elements and escape bare `&` that isn't already part of an entity.
 */
export declare function toXhtml(html: string): string;
/**
 * Rewrite in-book cross-links so they resolve INSIDE the EPUB (#15). renderDocMarkdown
 * emits site paths — `/slug/` (wikilinks + the auto-generated section TOCs) and legacy
 * `?filename` — which an e-reader can't follow. Any link pointing at a doc that IS in
 * this book becomes its `<slug>.xhtml` chapter (README → `index.xhtml`), preserving a
 * trailing `#anchor`. External, protocol, relative, and out-of-book links are left
 * untouched. `bookFiles` maps in-book slug → chapter filename.
 */
export declare function rewriteInBookLinks(html: string, bookFiles: Map<string, string>, slugMap: Record<string, string>, basePath?: string): string;
/**
 * Build an EPUB 3 book from the extracted corpus. Returns the output path.
 */
export declare function buildEpub(config: SiteConfig, opts?: BuildEpubOptions): Promise<string>;
