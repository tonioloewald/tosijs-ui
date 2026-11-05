export interface ExampleSource {
    html: string;
    css: string;
}
/** What a chat panel gets: the example's source, and a way to replace it. */
export interface ExampleChatSession {
    /** The `<tosi-example>` element the panel belongs to. */
    example: HTMLElement;
    /** The example's current markup and stylesheet, edits included. */
    source(): ExampleSource;
    /**
     * Replace the markup, the stylesheet, or both, and re-run the example. The new markup goes
     * through `sanitize` → insert → `hydrate`, exactly as an edit does.
     */
    apply(source: Partial<ExampleSource>): Promise<void>;
    /** Aborted when the example leaves the page. */
    signal: AbortSignal;
}
export interface ExampleHooks {
    /**
     * Called with the example's markup, parsed but inert (a `<template>`'s content: nothing in it
     * has loaded or run), before it enters the preview. Clean it in place, or return the fragment
     * to insert instead. Runs on every run, so an edit or a chat reply is cleaned too.
     */
    sanitize?: (fragment: DocumentFragment, example: HTMLElement) => DocumentFragment | void;
    /**
     * Called once the markup is in the preview (and after the example's script, if it has one).
     * `signal` aborts when the example re-runs or leaves the page: drop bindings and listeners
     * then.
     */
    hydrate?: (preview: HTMLElement, signal: AbortSignal, example: HTMLElement) => void | Promise<void>;
    /**
     * Build a chat panel for one example. It becomes the code panel's Chat tab (unless the site's
     * or the fence's `tabs` leave `chat` out).
     */
    chat?: (session: ExampleChatSession) => HTMLElement;
}
/**
 * Register the page's example hooks, replacing any registered before. Call it before the doc
 * system inserts examples (in your `bundleEntry`); an example already on the page picks up
 * `sanitize` and `hydrate` on its next run, and `chat` when its code panel is first opened.
 */
export declare function setExampleHooks(next: ExampleHooks): void;
export declare function exampleHooks(): Readonly<ExampleHooks>;
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
export declare function sanitizeExampleHtml(html: string, example: HTMLElement): string | DocumentFragment;
