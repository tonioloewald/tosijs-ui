/*
Guards on the emitted hydration bundle.

Two invariants that both fail SILENTLY at runtime, which is why they're checked at
build time against the actual emitted bytes rather than against the config:

1. `import.meta` must not survive into an IIFE — it's a SyntaxError in a classic
   <script>, so the whole bundle fails to evaluate and the page never hydrates.
2. tjs-lang's CodeMirror extension must be BUNDLED, not externalized — a separately
   loaded copy carries its own `@codemirror/state` and silently no-ops (no error, no
   warning; tjs highlighting and autocomplete just quietly stop working).

Build-time only. Never import from browser code.
*/
/** The specifier that must NOT survive in the bundle when tjs-lang is installed. */
export const TJS_EDITOR_SPECIFIER = 'tjs-lang/editors/codemirror';
/**
 * Externalize the tjs CodeMirror extension ONLY when tjs-lang isn't installed.
 *
 * When it IS installed we bundle it in, so it shares the editor's single CodeMirror
 * instance. When it's absent, bundling would fail to resolve, so we externalize it and
 * the runtime import degrades to plain TS highlighting.
 *
 * Returns [] (i.e. "bundle it") when tjs-lang resolves, else [TJS_EDITOR_SPECIFIER].
 */
export function tjsEditorExternal(root) {
    try {
        Bun.resolveSync(TJS_EDITOR_SPECIFIER, root);
        return [];
    }
    catch {
        return [TJS_EDITOR_SPECIFIER];
    }
}
/**
 * Did the tjs CodeMirror extension get externalized out of the bundle?
 *
 * If it was bundled, its specifier is gone (the module's code is inlined). If it was
 * externalized, the bundler leaves the specifier behind in an `import("…")`. So the
 * presence of the specifier in the emitted JS means the invariant is broken.
 *
 * Checking the identifier (`tjsCompletionSource`) instead would be useless: the import
 * SITE names it either way, so that grep passes in exactly the broken case.
 */
export function tjsEditorLeakedAsExternal(bundleJs) {
    return bundleJs.includes(TJS_EDITOR_SPECIFIER);
}
/**
 * Compile (without running) the bundle as a classic script body, and return the syntax
 * error if it isn't valid. `import.meta` is a SyntaxError outside a module, so this
 * catches the real failure.
 *
 * The naive `bundleJs.includes('import.meta')` this replaces false-positived on EVERY
 * build that bundled a JS parser: acorn's own error-message string literals contain
 * "import.meta", so the guard fired while the bundle was perfectly fine — and its advice
 * ("mark that dep external") would have undone the deliberate decision to bundle the tjs
 * CodeMirror extension. A guard that cries wolf on every build trains everyone to ignore
 * the real hit.
 */
export function classicScriptSyntaxError(bundleJs) {
    try {
        // eslint-disable-next-line no-new-func
        new Function(bundleJs);
        return null;
    }
    catch (e) {
        return e instanceof SyntaxError ? e.message : null;
    }
}
