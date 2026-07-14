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

// ── the guard must not fire on a STRING LITERAL ─────────────────────────────
// A substring is not a semantic. This guard was `bundleJs.includes(SPECIFIER)`, and it
// failed the build the moment a source file merely MENTIONED the specifier — a
// console.warn telling a developer to check that tjs-lang still exports
// `tjsEditorExtension` was enough. Its sibling guard in this file already learned the
// same lesson the hard way (`includes('import.meta')` fired on acorn's error strings).

test('a mention of the specifier inside a string does NOT count as externalized', () => {
  const bundled = `
    console.warn("check that tjs-lang/editors/codemirror still exports tjsEditorExtension")
    var tjsEditorExtension = function () { /* inlined module body */ }
  `
  expect(tjsEditorLeakedAsExternal(bundled)).toBe(false)
})

test('a real external import IS caught', () => {
  expect(
    tjsEditorLeakedAsExternal(`await import("tjs-lang/editors/codemirror")`)
  ).toBe(true)
  expect(
    tjsEditorLeakedAsExternal(`__require("tjs-lang/editors/codemirror")`)
  ).toBe(true)
  expect(
    tjsEditorLeakedAsExternal(`require( 'tjs-lang/editors/codemirror' )`)
  ).toBe(true)
})

test('a bundle that never mentions it at all is fine', () => {
  expect(tjsEditorLeakedAsExternal('var a = 1')).toBe(false)
})
