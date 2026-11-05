/*
What a host page can plug into every live example (tosijs-ui#246): a sanitizer for the markup,
a hydrator for the preview, and a chat panel.

They exist for the no-code mode (`liveExamples: 'no-code'`), where an example is HTML and CSS
and a host makes it live WITHOUT code: the markup is cleaned (`sanitize`), then bound to the
host's state (`hydrate`), and an assistant can rewrite it (`chat`). None of them constructs a
function, so the whole path runs under a CSP without `'unsafe-eval'`. They apply in every mode,
though: sanitizing an example's markup or binding its preview is as useful beside a script.

Registered once, by the page (a site's `bundleEntry`), because they are code and a site config
is data: nothing in `tosijs-site.config.ts` reaches the browser except as JSON.
*/
let hooks = {};
/**
 * Register the page's example hooks, replacing any registered before. Call it before the doc
 * system inserts examples (in your `bundleEntry`); an example already on the page picks up
 * `sanitize` and `hydrate` on its next run, and `chat` when its code panel is first opened.
 */
export function setExampleHooks(next) {
    hooks = { ...next };
}
export function exampleHooks() {
    return hooks;
}
/**
 * The example's markup after the page's `sanitize` hook, or unchanged when there is none.
 * Parsed in a `<template>`, so nothing in it loads or runs before the hook has seen it.
 *
 * With a hook, the result is the hook's FRAGMENT, which the preview inserts as it is. It used to
 * be serialized and parsed again, and HTML does not round-trip: foreign content (MathML, SVG)
 * re-parses into a different tree, so markup the hook had judged harmless came back as a live
 * `<img onerror>` (mXSS; the 1.17.0 review ran it in all three engines). What the hook saw must
 * be what the page gets.
 */
export function sanitizeExampleHtml(html, example) {
    const { sanitize } = hooks;
    if (!sanitize || !html)
        return html;
    const template = document.createElement('template');
    template.innerHTML = html;
    const result = sanitize(template.content, example) ?? template.content;
    if (result instanceof DocumentFragment)
        return result;
    const fragment = document.createDocumentFragment();
    fragment.append(result);
    return fragment;
}
