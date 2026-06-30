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
}
export declare function escapeXml(s: string): string;
/**
 * Best-effort normalize marked's HTML output to well-formed XHTML: self-close
 * void elements and escape bare `&` that isn't already part of an entity.
 */
export declare function toXhtml(html: string): string;
/**
 * Build an EPUB 3 book from the extracted corpus. Returns the output path.
 */
export declare function buildEpub(config: SiteConfig, opts?: BuildEpubOptions): Promise<string>;
