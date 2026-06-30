import { NavNode, NavDoc } from './nav-tree';
export interface BookDoc {
    filename: string;
    title: string;
    text: string;
    parent?: string;
    hidden?: boolean;
}
export declare const DEFAULT_BOOK_CSS = "/* doc-system book stylesheet */\nhtml { font-size: 100%; }\nbody {\n  font-family: Georgia, 'Times New Roman', serif;\n  line-height: 1.5;\n  margin: 0 1em;\n  color: #1a1a1a;\n}\nh1, h2, h3, h4, h5, h6 {\n  font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;\n  line-height: 1.2;\n  margin: 1.4em 0 0.5em;\n}\nh1 { font-size: 1.8em; }\nh2 { font-size: 1.4em; }\nh3 { font-size: 1.2em; }\np { margin: 0.6em 0; }\na { color: #08c; text-decoration: none; }\nul, ol { margin: 0.6em 0; padding-left: 1.4em; }\nblockquote {\n  margin: 0.8em 0;\n  padding: 0 0 0 1em;\n  border-left: 3px solid #ccc;\n  color: #555;\n}\nimg { max-width: 100%; height: auto; }\ntable { border-collapse: collapse; margin: 0.8em 0; font-size: 0.85em; }\nth, td { border: 1px solid #ccc; padding: 0.3em 0.6em; text-align: left; }\ncode, pre {\n  font-family: 'SF Mono', Menlo, Consolas, monospace;\n  font-size: 0.8em;\n}\n:not(pre) > code {\n  background: #f3f3f3;\n  padding: 0.1em 0.3em;\n  border-radius: 3px;\n}\npre {\n  background: #f6f8fa;\n  border: 1px solid #e1e4e8;\n  border-radius: 4px;\n  padding: 0.7em 0.9em;\n  margin: 0.8em 0;\n  white-space: pre-wrap;\n  word-break: break-word;\n  overflow-wrap: anywhere;\n}\npre code { background: none; padding: 0; }\n/* the in-flow Contents page (ePub spine TOC) */\n.toc-title { text-align: center; }\nol.toc, ol.toc ol { list-style: none; padding-left: 0; }\nol.toc ol { padding-left: 1.2em; }\nol.toc li { margin: 0.3em 0; }\nol.toc > li > a { font-weight: bold; }\n/* per-example \"run this live\" deep link */\n.example-live-link { margin: 0.6em 0 0; font-size: 0.85em; }\n.example-live-link a { color: #08c; font-weight: bold; }\n";
export declare const PRINT_CSS = "\n@page { margin: 18mm 16mm; }\n.book-title { text-align: center; margin: 30vh 0 1em; }\n.book-toc { page-break-after: always; }\n.book-toc h2 { page-break-before: avoid; }\n.book-toc ol { list-style: none; padding-left: 0; }\n.book-toc ol ol { padding-left: 1.2em; }\n.book-toc a { color: inherit; }\n.chapter { page-break-before: always; }\n";
export declare function escapeHtml(s: string): string;
export declare function slugify(s: string): string;
/** Drop the `<!--{ … }-->` metadata directives the extractor leaves in the text. */
export declare function stripDocMeta(text: string): string;
/** Flatten a nav-tree depth-first into reading order. */
export declare function flatten<T extends NavDoc>(nodes: NavNode<T>[]): NavNode<T>[];
export interface BookHtmlOptions {
    title: string;
    /** full stylesheet (defaults to DEFAULT_BOOK_CSS + PRINT_CSS) */
    css?: string;
    lang?: string;
    /** inject a script that opens the print dialog once the page has loaded */
    autoPrint?: boolean;
}
/** Assemble the whole corpus into one self-contained printable HTML document. */
export declare function buildBookHtml(docs: BookDoc[], opts: BookHtmlOptions): string;
