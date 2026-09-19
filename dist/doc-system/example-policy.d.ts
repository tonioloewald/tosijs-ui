/** Fence languages that EXECUTE. Everything else is display-only. */
export declare const EXECUTABLE_LANGS: Set<string>;
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
 * @param lang  the fence language, lowercased (`js`, `html`, `typescript`, …)
 * @param mode  the `:<mode>` suffix, if any (`inline` | `iframe` | `ide` | `static`)
 * @param policy `'auto'` (executables run) or `'opt-in'` (only fences that ask)
 */
export declare function isLiveFence(lang: string, mode: string | undefined, policy?: ExamplePolicy): boolean;
/**
 * THE fence-info parser. `js`, `css#anchor`, `js:iframe`, `ts:ide#demo`, `ts#demo:ide`.
 *
 * `:mode` (inline | iframe | ide | static) sets the live example's execution mode; `#id` gives
 * it a stable anchor. `#id` is `[A-Za-z0-9_-]+` and `:mode` is `[a-z]+`, so the two cannot
 * overlap and each is parsed independently, order-free.
 *
 * Extracted because a SECOND, worse copy existed in `save-to-source.ts` — a regex that
 * captured the language as `[\w-]*` and therefore stopped dead at the colon, so it could not
 * see `:static` at all. With a `:static` fence in a document, its example ordinals diverged
 * from the ones `insert-examples` assigns, and an edit saved over a DIFFERENT block than the
 * one edited. Silently: the "couldn't locate this example" guard only fires when the ordinal
 * is out of range, and here a group existed at that index — the wrong one.
 *
 * This is the same failure the `isLiveFence` docblock above describes, one layer down: the
 * rule was stated twice and the copies disagreed. Parse fence info here or not at all.
 */
export declare function parseFenceInfo(info: string): {
    lang: string;
    mode?: string;
    id?: string;
};
