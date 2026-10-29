import { EPUB_IMAGE_EXIT } from './epub-volumes.js';
import type { SiteConfig } from './site-config.js';
import { DEFAULT_BOOK_CSS, stripDocMeta } from '../book-html.js';
import { type EpubAccessibilityOptions } from './epub-a11y.js';
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
    /**
     * Which book to bind: a doc `book` name, or omitted for the default volume.
     *
     * Distinct from `config.book`, which is the MANIFEST (include/exclude/order) applied
     * within a volume. This selects WHICH volume; that shapes it.
     */
    bookTarget?: string;
    /** book title; default config.name */
    title?: string;
    /** per-volume titles, keyed by `book` name — for volumes with real book names */
    volumeTitles?: Record<string, string>;
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
    /**
     * `false` keeps the cover out of Print as PDF, which otherwise opens with the default
     * volume's cover. The ePub's own cover is unaffected.
     */
    printCover?: boolean;
    /**
     * With the site's `accessibility` mode on (#3522): what the package metadata says about the
     * book beyond what the build derives. A summary is generated and hazards default to none.
     */
    accessibility?: EpubAccessibilityOptions;
    /**
     * Check the finished book with DAISY Ace, when the project has it, and claim conformance only
     * if it passes. `buildSite` sets it on release builds (never under a dev server).
     */
    verifyAccessibility?: boolean;
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
export { EPUB_IMAGE_EXIT };
/** Thrown by buildEpub under `strict` when a local image cannot be bound into the book. */
export declare class EpubImageError extends Error {
    name: string;
}
/** An image bound into the book: where it lives in OEBPS, and where it came from. */
export interface BookImage {
    /** path inside OEBPS, e.g. `images/figs/a.jpg` */
    file: string;
    mediaType: string;
    /** absolute path of the source file */
    source: string;
}
/**
 * Rewrite the local images in `html` (`<img src>` and each `srcset` candidate) to book-local
 * paths, registering each file in `images` (keyed by absolute source path, so a figure used
 * twice is bound once). Root-absolute srcs have `basePath` stripped; relative ones resolve
 * against `pagePath`, the page's own site path. Local srcs that cannot be bound are added to
 * `unbound` and left untouched. Not handled: `<picture><source>` and SVG `<image>`.
 */
export declare function embedLocalImages(html: string, webRoot: string, basePath: string | undefined, images: Map<string, BookImage>, unbound?: Set<string>, pagePath?: string): string;
/**
 * Build an EPUB 3 book from the extracted corpus. Returns the output path.
 */
export declare function versionAnchoredDate(version: string, override?: string): string;
/**
 * Build the ePub for `config`'s corpus and return its path. Under `config.strict`, throws
 * {@link EpubImageError} when a local image cannot be bound into the book.
 */
export declare function buildEpub(config: SiteConfig, opts?: BuildEpubOptions): Promise<string>;
