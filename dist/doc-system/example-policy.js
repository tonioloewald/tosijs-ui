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
 * The languages that are an example's SOURCE block (its one executable slot). `js`, `tjs` and
 * `ts` are built in; `registerLiveLanguage` adds more (`registerDialect` in
 * `tosijs-ui/live-example` calls it, so a registered dialect's fences run).
 *
 * Kept here, beside `EXECUTABLE_LANGS`, because the same fence is judged in four places
 * (grouping, save-to-source, the highlighter, the ePub) and they must all see a registered
 * dialect or none of them may.
 */
export const BUILT_IN_DIALECTS = new Set([
    'js',
    'ts',
    'tjs',
]);
const SOURCE_LANGS = new Set(BUILT_IN_DIALECTS);
/**
 * `SiteConfig.dialects` as the rest of the system compares it: lowercased (fence languages
 * are lowercase), so `dialects: ['TJS']` means `tjs` everywhere, not in some places.
 */
export function normalizeDialectNames(names = []) {
    return [...new Set(names.map((name) => name.toLowerCase()))];
}
/**
 * Make fences in `lang` live examples, as an example's source block.
 *
 * You normally call `registerDialect` (which calls this). Call it directly only in a BUILD
 * process that must agree with the page: the static highlighter runs at build time, where the
 * page's `registerDialect` calls never happen, so a dialect named like a highlighter grammar
 * (`python`, say) would be tokenized there and the example would read markup instead of code.
 * Registering the name in your site config avoids that.
 */
export function registerLiveLanguage(lang) {
    const name = lang.toLowerCase();
    if (!/^[a-z]+$/.test(name)) {
        throw new Error(`registerLiveLanguage: "${lang}" is not a fence language (lowercase letters only, since the fence parser reads \`[a-z]+\`)`);
    }
    if (EXECUTABLE_LANGS.has(name) && !SOURCE_LANGS.has(name)) {
        throw new Error(`registerLiveLanguage: "${name}" is already an example block (html/css/test) and cannot be a dialect`);
    }
    SOURCE_LANGS.add(name);
}
/** Is `lang` an example's source language — `js`, `tjs`, `ts`, or a registered dialect? */
export function isDialectLanguage(lang) {
    return SOURCE_LANGS.has(lang);
}
/**
 * THE `language-*` class pattern, and the only place it is written.
 *
 * It was spelled `[A-Za-z0-9_+#-]+` four times in `highlight.ts` and `[\w-]+` once in
 * `epub.ts`, so a `c++` or `c#` fence was read as a language by one and as `c` by the other.
 * `+` and `#` are in the class deliberately: they are real language names. It lives here, not
 * in `highlight.ts`, because live examples need it too and must not import the highlighter's
 * grammar map to get it.
 */
export const LANGUAGE_NAME = '[A-Za-z0-9_+#-]+';
const LANGUAGE_CLASS = new RegExp(`language-(${LANGUAGE_NAME})`);
/**
 * The fence language of a `<code class="language-…">`, **as written** (case preserved), or `''`.
 *
 * Case matters: fence languages are lowercase (`parseFenceInfo` reads `[a-z]+`), so ```` ```JS ````
 * is not a live example. 1.16.1's first cut matched classes case-insensitively in one place
 * and not the others, and an uppercase fence became live in `insertExamples` but not in
 * save-to-source's scan — its content vanished from the page and every later save landed
 * on the wrong block. Use `langOfClass` (lowercased) only for grammar lookups.
 */
export function languageOfClass(className) {
    return String(className ?? '').match(LANGUAGE_CLASS)?.[1] ?? '';
}
/**
 * Will this fence become a live example?
 *
 * @param lang  the fence language as written (`js`, `html`, `typescript`, …); case-sensitive
 * @param mode  the `:<mode>` suffix, if any (`inline` | `iframe` | `ide` | `static`)
 * @param policy `'auto'` (executables run) or `'opt-in'` (only fences that ask)
 */
export function isLiveFence(lang, mode, policy = 'auto') {
    // Nothing is live in a book or on paper — skipping a fence there protects nothing and
    // costs the reader the highlighting.
    if (policy === 'none')
        return false;
    // Case-sensitive, like `parseFenceInfo`: see `languageOfClass`.
    if (!EXECUTABLE_LANGS.has(lang) && !SOURCE_LANGS.has(lang))
        return false;
    // `:static` opts out under any policy, so one corpus can target all of them.
    if (mode === 'static')
        return false;
    return policy === 'opt-in' ? mode !== undefined : true;
}
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
export function parseFenceInfo(info) {
    const text = String(info || '');
    const brace = text.indexOf('{');
    const head = brace === -1 ? text : text.slice(0, brace);
    const parsed = {
        lang: head.match(/^[a-z]+/)?.[0] ?? '',
        mode: head.match(/:([a-z]+)/)?.[1],
        id: head.match(/#([A-Za-z0-9_-]+)/)?.[1],
    };
    if (brace !== -1) {
        const json = text.slice(brace).trim();
        try {
            const value = JSON.parse(json);
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                parsed.options = value;
            }
            else {
                parsed.optionsError = `fence options must be a JSON object, got ${json}`;
            }
        }
        catch (error) {
            parsed.optionsError = `fence options are not valid JSON (${error.message}): ${json}`;
        }
    }
    return parsed;
}
