declare global {
    var Bun: any;
}
/** The specifier that must NOT survive in the bundle when tjs-lang is installed. */
export declare const TJS_EDITOR_SPECIFIER = "tjs-lang/editors/codemirror";
/**
 * Externalize the tjs CodeMirror extension ONLY when tjs-lang isn't installed.
 *
 * When it IS installed we bundle it in, so it shares the editor's single CodeMirror
 * instance. When it's absent, bundling would fail to resolve, so we externalize it and
 * the runtime import degrades to plain TS highlighting.
 *
 * Returns [] (i.e. "bundle it") when tjs-lang resolves, else [TJS_EDITOR_SPECIFIER].
 */
export declare function tjsEditorExternal(root: string): string[];
/**
 * Did the tjs CodeMirror extension get externalized out of the bundle?
 *
 * If it was bundled, the module's code is inlined and nothing IMPORTS the specifier. If
 * it was externalized, the bundler leaves behind a live `import("…")` / `require("…")`
 * call. So look for the *call*, not for the string.
 *
 * This used to be a bare `bundleJs.includes(TJS_EDITOR_SPECIFIER)` — and it false-
 * positived the moment a source file mentioned the specifier in a **string literal**
 * (a `console.warn` telling the developer to check that tjs-lang still exports
 * `tjsEditorExtension` was enough to fail the build). That is precisely the bug the
 * sibling guard below already learned: its own comment records that
 * `includes('import.meta')` fired on every build that bundled a JS parser, because
 * acorn's error messages contain the string. Same lesson, other half of the file —
 * **a substring is not a semantic.**
 *
 * Checking the identifier (`tjsCompletionSource`) instead would be useless: the import
 * SITE names it either way, so that grep passes in exactly the broken case.
 */
export declare function tjsEditorLeakedAsExternal(bundleJs: string): boolean;
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
export declare function classicScriptSyntaxError(bundleJs: string): string | null;
/**
 * The same check, run in a CHILD process — this is what the build calls.
 *
 * Compiling the bundle strands memory in the parent: JSC caches the compiled code, so
 * `new Function()` over a 1.2MB bundle retains ~378KB *per call* even after a forced
 * GC. The build runs on every dev rebuild in a process that lives for days, so that is
 * exactly the shape of leak this release just fixed elsewhere — parsing to guard
 * against a leak while leaking would be a poor joke. The child hands it all back on
 * exit. (Cost: one ~30ms process. See oven-sh/bun#34053 for the family.)
 */
export declare function classicScriptSyntaxErrorInChild(bundlePath: string): Promise<string | null>;
