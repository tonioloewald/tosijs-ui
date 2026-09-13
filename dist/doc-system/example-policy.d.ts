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
