/** Fence languages that EXECUTE. Everything else is display-only. */
export declare const EXECUTABLE_LANGS: Set<string>;
/**
 * Make fences in `lang` live examples, as an example's source block.
 *
 * You normally call `registerDialect` (which calls this). Call it directly only in a BUILD
 * process that must agree with the page: the static highlighter runs at build time, where the
 * page's `registerDialect` calls never happen, so a dialect named like a highlighter grammar
 * (`python`, say) would be tokenized there and the example would read markup instead of code.
 * Registering the name in your site config avoids that.
 */
export declare function registerLiveLanguage(lang: string): void;
/** Is `lang` an example's source language — `js`, `tjs`, `ts`, or a registered dialect? */
export declare function isDialectLanguage(lang: string): boolean;
/**
 * The fence language of a `<code class="language-…">`, **as written** (case preserved), or `''`.
 *
 * Case matters: fence languages are lowercase (`parseFenceInfo` reads `[a-z]+`), so ```` ```JS ````
 * is not a live example. 1.16.1's first cut matched classes case-insensitively in one place
 * and not the others, and an uppercase fence became live in `insertExamples` but not in
 * save-to-source's scan — its content vanished from the page and every later save landed
 * on the wrong block. Use `langOfClass` (lowercased) only for grammar lookups.
 */
export declare function languageOfClass(className: string | null | undefined): string;
/**
 * - `'auto'` — the six executable languages become live examples (the web default).
 * - `'opt-in'` — only a fence that asks, via `:inline` / `:iframe` / `:ide`.
 * - `'none'` — **nothing here is live.** For a target that cannot run examples at all: an
 *   ePub, a printed page, a PDF. Without it, `buildEpub` defaulted to `'auto'` and skipped
 *   every `js`/`ts`/`tjs`/`html`/`css`/`test` fence — buying nothing, because a book has no
 *   live examples to protect — and left **237 of 284 code blocks unhighlighted** in our own
 *   ePub while the CHANGELOG said "highlighted in the ePub and in print".
 */
export type ExamplePolicy = 'auto' | 'opt-in' | 'none';
/**
 * Will this fence become a live example?
 *
 * @param lang  the fence language as written (`js`, `html`, `typescript`, …); case-sensitive
 * @param mode  the `:<mode>` suffix, if any (`inline` | `iframe` | `ide` | `static`)
 * @param policy `'auto'` (executables run) or `'opt-in'` (only fences that ask)
 */
export declare function isLiveFence(lang: string, mode: string | undefined, policy?: ExamplePolicy): boolean;
/**
 * THE fence-info parser. `js`, `css#anchor`, `js:iframe`, `ts:ide#demo`, `ts#demo:ide`,
 * `tjs {"runTests": "report"}`.
 *
 * `:mode` (inline | iframe | ide | static) sets the live example's execution mode; `#id` gives
 * it a stable anchor. `#id` is `[A-Za-z0-9_-]+` and `:mode` is `[a-z]+`, so the two cannot
 * overlap and each is parsed independently, order-free.
 *
 * A JSON object after the head is the example's **options**, passed to its dialect (#184). It
 * is split off FIRST: `{"debug":true}` contains `:true`, which the mode pattern would
 * otherwise read as a mode. Options that are not a JSON object are reported in
 * `optionsError` rather than dropped, so an author sees why their options did nothing.
 *
 * Extracted because a SECOND, worse copy existed in `save-to-source.ts` — a regex that
 * captured the language as `[\w-]*` and therefore stopped dead at the colon, so it could not
 * see `:static` at all. With a `:static` fence in a document, its example ordinals diverged
 * from the ones `insert-examples` assigns, and an edit saved over a DIFFERENT block than the
 * one edited. Silently: the "couldn't locate this example" guard only fires when the ordinal
 * is out of range, and here a group existed at that index.
 *
 * This is the same failure the `isLiveFence` docblock above describes, one layer down: the
 * rule was stated twice and the copies disagreed. Parse fence info here or not at all.
 */
export declare function parseFenceInfo(info: string): {
    lang: string;
    mode?: string;
    id?: string;
    options?: Record<string, unknown>;
    optionsError?: string;
};
