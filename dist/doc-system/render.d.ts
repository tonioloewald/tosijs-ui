import { MarkedOptions } from 'marked';
export declare const docMarkedOptions: MarkedOptions;
/** Render a doc's markdown text to HTML (synchronous, default marked options). */
export declare function renderDocMarkdown(text: string): string;
/**
 * First prose line of a doc, for <meta name="description">. Skips the title
 * heading, code fences, blockquotes, tables and other non-sentence lines, then
 * truncates to a sensible length on a word boundary.
 */
export declare function docDescription(text: string, maxLength?: number): string;
