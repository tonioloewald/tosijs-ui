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

export interface ExampleSource {
  html: string
  css: string
}

/** What a chat panel gets: the example's source, and a way to replace it. */
export interface ExampleChatSession {
  /** The `<tosi-example>` element the panel belongs to. */
  example: HTMLElement
  /** The example's current markup and stylesheet, edits included. */
  source(): ExampleSource
  /**
   * Replace the markup, the stylesheet, or both, and re-run the example. The new markup goes
   * through `sanitize` → insert → `hydrate`, exactly as an edit does.
   */
  apply(source: Partial<ExampleSource>): Promise<void>
  /** Aborted when the example leaves the page. */
  signal: AbortSignal
}

export interface ExampleHooks {
  /**
   * Called with the example's markup, parsed but inert (a `<template>`'s content: nothing in it
   * has loaded or run), before it enters the preview. Clean it in place, or return the fragment
   * to insert instead. Runs on every run, so an edit or a chat reply is cleaned too.
   */
  sanitize?: (
    fragment: DocumentFragment,
    example: HTMLElement
  ) => DocumentFragment | void
  /**
   * Called once the markup is in the preview (and after the example's script, if it has one).
   * `signal` aborts when the example re-runs or leaves the page: drop bindings and listeners
   * then.
   */
  hydrate?: (
    preview: HTMLElement,
    signal: AbortSignal,
    example: HTMLElement
  ) => void | Promise<void>
  /**
   * Build a chat panel for one example. It becomes the code panel's Chat tab (unless the site's
   * or the fence's `tabs` leave `chat` out).
   */
  chat?: (session: ExampleChatSession) => HTMLElement
}

let hooks: ExampleHooks = {}

/**
 * Register the page's example hooks, replacing any registered before. Call it before the doc
 * system inserts examples (in your `bundleEntry`); an example already on the page picks up
 * `sanitize` and `hydrate` on its next run, and `chat` when its code panel is first opened.
 */
export function setExampleHooks(next: ExampleHooks): void {
  hooks = { ...next }
}

export function exampleHooks(): Readonly<ExampleHooks> {
  return hooks
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
export function sanitizeExampleHtml(
  html: string,
  example: HTMLElement
): string | DocumentFragment {
  const { sanitize } = hooks
  if (!sanitize || !html) return html
  const template = document.createElement('template')
  template.innerHTML = html
  const result = sanitize(template.content, example) ?? template.content
  if (result instanceof DocumentFragment) return result
  const fragment = document.createDocumentFragment()
  fragment.append(result)
  return fragment
}
