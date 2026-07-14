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

declare global {
  var Bun: any
}

/** The specifier that must NOT survive in the bundle when tjs-lang is installed. */
export const TJS_EDITOR_SPECIFIER = 'tjs-lang/editors/codemirror'

/**
 * Externalize the tjs CodeMirror extension ONLY when tjs-lang isn't installed.
 *
 * When it IS installed we bundle it in, so it shares the editor's single CodeMirror
 * instance. When it's absent, bundling would fail to resolve, so we externalize it and
 * the runtime import degrades to plain TS highlighting.
 *
 * Returns [] (i.e. "bundle it") when tjs-lang resolves, else [TJS_EDITOR_SPECIFIER].
 */
export function tjsEditorExternal(root: string): string[] {
  try {
    Bun.resolveSync(TJS_EDITOR_SPECIFIER, root)
    return []
  } catch {
    return [TJS_EDITOR_SPECIFIER]
  }
}

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
export function tjsEditorLeakedAsExternal(bundleJs: string): boolean {
  const spec = TJS_EDITOR_SPECIFIER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // `import("x")`, `require("x")`, bun's `__require("x")` — with any quoting/spacing.
  return new RegExp(
    `(?:^|[^.\\w])(?:__)?(?:require|import)\\s*\\(\\s*["'\`]${spec}["'\`]`
  ).test(bundleJs)
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
export function classicScriptSyntaxError(bundleJs: string): string | null {
  try {
    new Function(bundleJs)
    return null
  } catch (e) {
    return e instanceof SyntaxError ? e.message : null
  }
}

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
export async function classicScriptSyntaxErrorInChild(
  bundlePath: string
): Promise<string | null> {
  const self = `${import.meta.dir}/bundle-guard.ts`
  const cli = (await Bun.file(self).exists())
    ? self
    : `${import.meta.dir}/bundle-guard.js`
  const child = Bun.spawn(['bun', cli, bundlePath], {
    stdout: 'ignore',
    stderr: 'pipe',
  })
  // ALWAYS drain stderr, not just on failure: an unconsumed pipe stays open and its
  // buffer is retained, which turns this guard into a per-rebuild leak of its own.
  const [code, message] = await Promise.all([
    child.exited,
    new Response(child.stderr).text(),
  ])
  if (code === 0) return null
  return message.trim() || 'the bundle does not parse as a classic <script>'
}

// CLI entry (the child above): `bun bundle-guard.ts <bundle.js>` — exits 1 with the
// syntax error on stderr, 0 if the bundle is a valid classic script.
if (import.meta.main) {
  const file = process.argv[2]
  if (!file) {
    console.error('bundle-guard: expected a bundle path')
    process.exit(1)
  }
  const error = classicScriptSyntaxError(await Bun.file(file).text())
  if (error) {
    console.error(error)
    process.exit(1)
  }
}
