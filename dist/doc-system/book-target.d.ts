/** The main book's internal key — what a doc with no `book` lands in. */
export declare const DEFAULT_BOOK = "";
/** `book: "none"` — on the site, in no book. */
export declare const NO_BOOK = "none";
/**
 * The writable name for the default volume, so an array can include it:
 * `book: ["default", "field-guide"]` binds the doc into both.
 */
export declare const DEFAULT_BOOK_NAME = "default";
export interface BookTargetDoc {
    filename: string;
    title?: string;
    parent?: string;
    /** one book, several books, or `'none'` */
    book?: string | string[];
    hidden?: boolean;
}
type SlugMap = Record<string, string>;
/**
 * The doc itself, then each ancestor nearest-first. Stops at an unresolvable parent and
 * at a cycle, so a self-parented doc yields just itself rather than hanging.
 */
export declare function chain<T extends BookTargetDoc>(doc: T, docs: T[], slugMap?: SlugMap): T[];
/**
 * Every book this doc belongs to. Empty means none.
 *
 * The NEAREST declaration wins outright — an array replaces an inherited value rather
 * than adding to it, so a child can opt out of a section's book (`"none"`), divert into
 * another, or bind into several (`["default", "appendices"]`).
 */
export declare function resolveBooks<T extends BookTargetDoc>(doc: T, docs: T[], slugMap?: SlugMap): string[];
/**
 * Hidden here or anywhere above.
 *
 * Hiding a section must hide what is inside it — otherwise "hide this unfinished part"
 * silently publishes every chapter of it, which is the opposite of what was asked for.
 */
export declare function isHidden<T extends BookTargetDoc>(doc: T, docs: T[], slugMap?: SlugMap): boolean;
/** Drop every hidden doc (and every descendant of one). */
export declare function withoutHidden<T extends BookTargetDoc>(docs: T[], slugMap?: SlugMap): T[];
/**
 * Group docs by book. Key `DEFAULT_BOOK` ('') is the main volume; `book: "none"` docs
 * appear in no group at all. Hidden docs are excluded — they are not published anywhere.
 *
 * Insertion order is preserved within each book, so whatever ordering the caller already
 * applied survives.
 */
export declare function partitionByBook<T extends BookTargetDoc>(docs: T[], slugMap?: SlugMap): Map<string, T[]>;
/** Named books only, in stable order — the extra volumes beside the default one. */
export declare function namedBooks<T extends BookTargetDoc>(docs: T[], slugMap?: SlugMap): string[];
export {};
