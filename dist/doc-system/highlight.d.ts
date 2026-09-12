import { type ExamplePolicy } from './example-policy.js';
/**
 * Supply a Prism grammar for a fence language. Overrides the built-in alias mapping.
 * Call before the first highlight — at module scope in a bundle entry, or in `prebuild`.
 */
export declare function registerGrammar(fenceLang: string, grammar: unknown): void;
/** Registered grammars, for tests and diagnostics. */
export declare function registeredGrammars(): string[];
export declare function grammarFor(fenceLang: string): string;
/** Grammars this build can load — for tests, diagnostics, and the docs. */
export declare function loadableGrammars(): string[];
/**
 * Load Prism and the grammar for `lang`. Returns false when the grammar does not exist —
 * an unknown language is not an error, it is a code block that stays plain.
 *
 * Grammar files are loaded by dynamic import so a bundler can code-split them and a build
 * only pays for the languages its corpus actually uses.
 */
export declare function ensureGrammar(lang: string): Promise<boolean>;
/**
 * Highlight `code` as `lang`, returning HTML with `<span class="token …">` markup.
 * Returns null when the grammar is unavailable, so the caller leaves the block alone
 * rather than emitting something worse than plain text.
 *
 * `ensureGrammar` must have resolved true for this language first — kept separate because
 * the DOM pass wants to load every grammar a page needs before touching anything, so a
 * page never highlights half its blocks.
 */
export declare function highlight(code: string, lang: string): string | null;
/**
 * Highlight every static code block under `root`, in place.
 *
 * Skips anything inside a live example — those are CodeMirror's, and double-highlighting
 * would fight it — and anything already highlighted, which is what keeps the build's output
 * and the client's hydration byte-identical.
 *
 * Returns the number of blocks highlighted, so a caller can report or assert on it. A
 * silent zero is indistinguishable from "nothing needed doing", which is the ambiguity this
 * codebase has been burned by; the count makes it answerable.
 */
export declare function highlightBlocks(root: ParentNode, opts?: {
    liveExampleTag?: string;
}): Promise<number>;
/** Every fence language present in rendered markdown — what grammars a page needs. */
export declare function languagesIn(html: string): string[];
/**
 * Highlight every code block in rendered-markdown HTML.
 *
 * Leaves a block alone when its grammar is unavailable — an unknown language is a plain code
 * block, not a build failure. Already-highlighted blocks are skipped by the same
 * `data-highlighted` marker the DOM pass uses, so running both is safe.
 */
export declare function highlightHtml(html: string, policy?: ExamplePolicy): Promise<string>;
