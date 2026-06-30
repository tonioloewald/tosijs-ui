/** Render a doc's markdown text to HTML (synchronous, default marked options). */
export declare function renderDocMarkdown(text: string): string;
/**
 * Derive a clean <meta name="description"> from a doc's first prose paragraph.
 * Skips the title heading, code fences, tables, quotes, html and image/link-only
 * lines; strips inline markdown; drops low-value "This is a…" leads; and truncates
 * on a sentence boundary where possible (never mid-clause ending in a comma).
 * Pages can override this entirely via their JSON metadata `description`.
 */
export declare function docDescription(text: string, maxLength?: number): string;
