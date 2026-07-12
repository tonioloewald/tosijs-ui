import { test, expect, describe } from 'bun:test'
import {
  TJS_EDITOR_SPECIFIER,
  tjsEditorExternal,
  tjsEditorLeakedAsExternal,
  classicScriptSyntaxError,
} from './bundle-guard'

describe('tjsEditorExternal', () => {
  test('bundles the extension in (returns no externals) when tjs-lang resolves', () => {
    // tjs-lang is a devDependency here, so it resolves from the repo root.
    expect(tjsEditorExternal(process.cwd())).toEqual([])
  })

  test('externalizes it when tjs-lang cannot be resolved', () => {
    // A directory with no node_modules above it that has tjs-lang.
    expect(tjsEditorExternal('/')).toEqual([TJS_EDITOR_SPECIFIER])
  })
})

describe('tjsEditorLeakedAsExternal', () => {
  test('a bundled extension leaves no specifier behind', () => {
    const bundled = `var tjsCompletionSource=e=>e;console.log(tjsCompletionSource)`
    expect(tjsEditorLeakedAsExternal(bundled)).toBe(false)
  })

  test('an externalized extension leaves its specifier in an import()', () => {
    const externalized = `const m=await import("tjs-lang/editors/codemirror");m.tjsCompletionSource()`
    expect(tjsEditorLeakedAsExternal(externalized)).toBe(true)
  })

  test('the identifier alone is NOT taken as proof it was bundled', () => {
    // This is the trap: the import SITE names tjsCompletionSource either way, so a
    // grep for the identifier passes in exactly the broken (externalized) case.
    const externalized = `import("tjs-lang/editors/codemirror").then(({tjsCompletionSource})=>tjsCompletionSource)`
    expect(externalized).toContain('tjsCompletionSource')
    expect(tjsEditorLeakedAsExternal(externalized)).toBe(true)
  })
})

describe('classicScriptSyntaxError', () => {
  test('accepts a valid classic script', () => {
    expect(classicScriptSyntaxError('var a = 1; console.log(a)')).toBeNull()
  })

  test('rejects a real import.meta reference', () => {
    const err = classicScriptSyntaxError('var u = import.meta.url')
    expect(err).not.toBeNull()
    expect(String(err)).toMatch(/import\.meta/i)
  })

  test('does NOT fire on "import.meta" inside a string literal', () => {
    // The regression this guard exists for: bundling a JS parser (acorn, via the tjs
    // CodeMirror extension) inlines error-message strings containing "import.meta",
    // which made the old substring check warn on every single build.
    const js = `var msg = "Cannot use 'import.meta' outside a module"; console.log(msg)`
    expect(js).toContain('import.meta')
    expect(classicScriptSyntaxError(js)).toBeNull()
  })

  test('does NOT fire on "import.meta" inside a comment or template literal', () => {
    const js = 'var t = `import.meta`; /* import.meta */ console.log(t)'
    expect(classicScriptSyntaxError(js)).toBeNull()
  })

  test('dynamic import() stays legal in a classic script', () => {
    expect(classicScriptSyntaxError('import("./x.js").then(m=>m)')).toBeNull()
  })

  test('catches unrelated syntax breakage too', () => {
    expect(classicScriptSyntaxError('function (){')).not.toBeNull()
  })
})
