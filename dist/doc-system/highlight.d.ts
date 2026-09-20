import { type ExamplePolicy } from './example-policy.js';
/**
 * Supply a Prism grammar for a fence language. Overrides the built-in alias mapping.
 * Call before the first highlight — at module scope in a bundle entry, or in `prebuild`.
 */
export declare function registerGrammar(fenceLang: string, grammar: unknown): void;
/** Registered grammars, for tests and diagnostics. */
export declare function registeredGrammars(): string[];
/**
 * The Prism grammar NAME a fence language resolves to — `ts` → `typescript`, `sh` → `bash`.
 *
 * Registration-aware: once `registerGrammar('tjs', …)` has run, `grammarFor('tjs')` is
 * `'tjs'`, not the `javascript` alias. It used to consult `ALIASES` only, so it disagreed
 * with `highlight()` — which installs a registered grammar under the fence name and uses it —
 * for exactly the language a consumer had just gone to the trouble of supplying. A companion
 * function that contradicts the main one on the one case you care about is worse than no
 * companion function.
 *
 * Returns a grammar NAME, not a grammar.
 */
export declare function grammarFor(fenceLang: string): string;
/** Grammars this build can load — for tests, diagnostics, and the docs. */
export declare function loadableGrammars(): string[];
/** The fence language of a `<code class="language-…">`, lowercased, or `''`. */
export declare function langOfClass(className: string | null | undefined): string;
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
    policy?: ExamplePolicy;
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
/**
 * Clear every piece of module state this file caches — for TESTS only.
 *
 * `prism`, the in-flight `grammarLoads` promises and the `registered` grammar map are all
 * module-scoped, and Bun shares module state across every test file in a process. So a test
 * that seeds a fake Prism or registers a fake grammar leaks it into whatever runs next, and
 * the symptom surfaces somewhere unrelated. Two tests in this repo were already doing exactly
 * that with no cleanup.
 *
 * Not part of the public API and not exported from `tosijs-ui/site`.
 */
export declare function resetHighlightStateForTest(): void;
