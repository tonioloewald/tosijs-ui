import { NavNode } from '../nav-tree';
import type { Doc } from './docs';
import type { SiteConfig } from './site-config';
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
/** Drop the `<!--{ … }-->` metadata directives the extractor leaves in the text. */
export declare function stripDocMeta(text: string): string;
export declare const DEFAULT_BOOK_CSS = "/* tosijs-ui ePub default stylesheet */\nhtml { font-size: 100%; }\nbody {\n  font-family: Georgia, 'Times New Roman', serif;\n  line-height: 1.5;\n  margin: 0 1em;\n  color: #1a1a1a;\n}\nh1, h2, h3, h4, h5, h6 {\n  font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;\n  line-height: 1.2;\n  margin: 1.4em 0 0.5em;\n}\nh1 { font-size: 1.8em; page-break-before: always; }\nh2 { font-size: 1.4em; }\nh3 { font-size: 1.2em; }\np { margin: 0.6em 0; }\na { color: #08c; text-decoration: none; }\nul, ol { margin: 0.6em 0; padding-left: 1.4em; }\nblockquote {\n  margin: 0.8em 0;\n  padding: 0 0 0 1em;\n  border-left: 3px solid #ccc;\n  color: #555;\n}\nimg { max-width: 100%; height: auto; }\ntable { border-collapse: collapse; margin: 0.8em 0; font-size: 0.85em; }\nth, td { border: 1px solid #ccc; padding: 0.3em 0.6em; text-align: left; }\n/* Code: force-wrap so listings never overflow a page (no horizontal scroll in a book) */\ncode, pre {\n  font-family: 'SF Mono', Menlo, Consolas, monospace;\n  font-size: 0.8em;\n}\n:not(pre) > code {\n  background: #f3f3f3;\n  padding: 0.1em 0.3em;\n  border-radius: 3px;\n}\npre {\n  background: #f6f8fa;\n  border: 1px solid #e1e4e8;\n  border-radius: 4px;\n  padding: 0.7em 0.9em;\n  margin: 0.8em 0;\n  white-space: pre-wrap;\n  word-break: break-word;\n  overflow-wrap: anywhere;\n}\npre code { background: none; padding: 0; }\n";
/** Flatten a nav-tree depth-first into spine / reading order. */
export declare function flatten(nodes: NavNode<Doc>[]): NavNode<Doc>[];
/**
 * Build an EPUB 3 book from the extracted corpus. Returns the output path.
 */
export declare function buildEpub(config: SiteConfig, opts?: BuildEpubOptions): Promise<string>;
