/*
THE ONE RULE for "does this fence become a live example?"

Two places need the answer and they must agree:

  - `insertExamples` (client) turns matching blocks into `<tosi-example>`;
  - `highlightHtml` (build) must NOT touch those blocks, because a live example reads its
    source out of the `<code>` element and syntax-highlighting it replaces that source with
    `<span class="token …">` markup.

They did not agree for one build. The static highlighter tokenized the `html` fence of every
grouped example, `insertExamples` then read spans instead of markup, and seven doc tests
across two pages failed with "Expected 0 to be 4" and a null `querySelector` — an example that
rendered nothing, reported as a broken component rather than a broken pipeline.

This module exists so the rule cannot be stated twice again. It is deliberately tiny and
dependency-free so both the build and the browser can import it.
*/
/** Fence languages that EXECUTE. Everything else is display-only. */
export const EXECUTABLE_LANGS = new Set([
    'js',
    'ts',
    'tjs',
    'html',
    'css',
    'test',
]);
/**
 * Will this fence become a live example?
 *
 * @param lang  the fence language, lowercased (`js`, `html`, `typescript`, …)
 * @param mode  the `:<mode>` suffix, if any (`inline` | `iframe` | `ide` | `static`)
 * @param policy `'auto'` (executables run) or `'opt-in'` (only fences that ask)
 */
export function isLiveFence(lang, mode, policy = 'auto') {
    // Nothing is live in a book or on paper — skipping a fence there protects nothing and
    // costs the reader the highlighting.
    if (policy === 'none')
        return false;
    if (!EXECUTABLE_LANGS.has(lang.toLowerCase()))
        return false;
    // `:static` opts out under any policy, so one corpus can target all of them.
    if (mode === 'static')
        return false;
    return policy === 'opt-in' ? mode !== undefined : true;
}
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
export function parseFenceInfo(info) {
    const text = String(info || '');
    return {
        lang: text.match(/^[a-z]+/)?.[0] ?? '',
        mode: text.match(/:([a-z]+)/)?.[1],
        id: text.match(/#([A-Za-z0-9_-]+)/)?.[1],
    };
}
