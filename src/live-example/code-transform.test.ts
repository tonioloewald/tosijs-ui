import { test, expect, describe } from 'bun:test'
import {
  rewriteImports,
  AsyncFunction,
  extractTopLevelBindingNames,
  buildScopeCapture,
} from './code-transform'

describe('rewriteImports', () => {
  test('rewrites named imports to destructuring', () => {
    const code = "import { div, span } from 'tosijs'"
    const result = rewriteImports(code, ['tosijs'])
    expect(result).toBe('const { div, span } = tosijs')
  })

  test('handles hyphenated module names', () => {
    const code = "import { icons } from 'tosijs-ui'"
    const result = rewriteImports(code, ['tosijs-ui'])
    expect(result).toBe('const { icons } = tosijsui')
  })

  test('rewrites multiple imports', () => {
    const code = [
      "import { div } from 'tosijs'",
      "import { icons } from 'tosijs-ui'",
    ].join('\n')
    const result = rewriteImports(code, ['tosijs', 'tosijs-ui'])
    expect(result).toContain('const { div } = tosijs')
    expect(result).toContain('const { icons } = tosijsui')
  })

  test('rewrites multiline imports', () => {
    const code = `import {
  div,
  span,
  button
} from 'tosijs'`
    const result = rewriteImports(code, ['tosijs'])
    expect(result).toBe('const { div, span, button } = tosijs')
  })

  test('handles superset module names without cross-matching', () => {
    const code = [
      "import { icons } from 'tosijs-ui'",
      "import { elements } from 'tosijs'",
    ].join('\n')
    const result = rewriteImports(code, ['tosijs', 'tosijs-ui'])
    expect(result).toContain('const { icons } = tosijsui')
    expect(result).toContain('const { elements } = tosijs')
    expect(result).not.toContain('import')
  })

  test('rewrites namespace imports', () => {
    const code = "import * as BABYLON from '@babylonjs/core'"
    const result = rewriteImports(code, ['@babylonjs/core'])
    expect(result).toBe('const BABYLON = babylonjscore')
  })

  test('rewrites default imports', () => {
    const code = "import Foo from 'my-lib'"
    const result = rewriteImports(code, ['my-lib'])
    expect(result).toBe('const Foo = mylib')
  })

  test('throws a clear error on a non-context import', () => {
    expect(() => rewriteImports("import { foo } from 'bar'", ['tosijs'])).toThrow(
      /unsupported import/
    )
  })

  test('handles dot-access imports', () => {
    const code = "import { elements } from 'tosijs'.elements"
    // Only the import part should be rewritten
    const result = rewriteImports(code, ['tosijs'])
    expect(result).toContain('const { elements } = tosijs')
  })
})

describe('AsyncFunction', () => {
  test('is a constructor', () => {
    expect(typeof AsyncFunction).toBe('function')
  })

  test('creates async functions', async () => {
    // @ts-expect-error AsyncFunction constructor typing
    const fn = new AsyncFunction('return 42')
    const result = await fn()
    expect(result).toBe(42)
  })

  test('accepts parameters', async () => {
    // @ts-expect-error AsyncFunction constructor typing
    const fn = new AsyncFunction('a', 'b', 'return a + b')
    const result = await fn(3, 4)
    expect(result).toBe(7)
  })
})

describe('extractTopLevelBindingNames', () => {
  test('plain const/let/var', () => {
    const names = extractTopLevelBindingNames(
      'const a = 1\nlet b = 2\nvar c = 3'
    )
    expect(names.sort()).toEqual(['a', 'b', 'c'])
  })

  test('object destructuring, aliases, defaults, rest', () => {
    const names = extractTopLevelBindingNames(
      'const { app, user: u, count = 0, ...rest } = tosi({})'
    )
    expect(names.sort()).toEqual(['app', 'count', 'rest', 'u'])
  })

  test('array destructuring', () => {
    expect(
      extractTopLevelBindingNames('const [first, second] = list').sort()
    ).toEqual(['first', 'second'])
  })

  test('function and class declarations', () => {
    const names = extractTopLevelBindingNames(
      'function greet() {}\nclass Widget {}'
    )
    expect(names.sort()).toEqual(['Widget', 'greet'])
  })

  test('ignores indented (block-scoped) declarations', () => {
    const code = 'const top = 1\nif (x) {\n  const inner = 2\n}'
    expect(extractTopLevelBindingNames(code)).toEqual(['top'])
  })

  // The shapes the first (line-anchored, first-`=`) implementation silently missed.
  // Each produced ZERO or partial completions with no error — the worst failure mode
  // for the feature, and it hit the release's own SIMD/WASM demo (12 of 26 bindings).
  test('multi-line destructuring (regression)', () => {
    const names = extractTopLevelBindingNames(
      'const {\n  app,\n  todos,\n} = tosi({})'
    )
    expect(names.sort()).toEqual(['app', 'todos'])
  })

  test('multiple declarators in one statement (regression)', () => {
    expect(extractTopLevelBindingNames('const a = 1, b = 2, c = 3').sort()).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  test('declarators with no initializer', () => {
    expect(extractTopLevelBindingNames('let a, b').sort()).toEqual(['a', 'b'])
  })

  test('nested destructuring recurses to the bound name', () => {
    expect(extractTopLevelBindingNames('const { a: { b }, c } = x').sort()).toEqual([
      'b',
      'c',
    ])
  })

  test('commas inside a call are not declarator separators', () => {
    expect(extractTopLevelBindingNames('const x = foo(1, 2, 3)')).toEqual(['x'])
  })

  test('no bindings → empty', () => {
    expect(extractTopLevelBindingNames('preview.append(div())')).toEqual([])
  })
})

describe('buildScopeCapture', () => {
  test('empty names → empty epilogue', () => {
    expect(buildScopeCapture([], '__cap')).toBe('')
  })

  test('captures each name behind its own guard', () => {
    const epilogue = buildScopeCapture(['app', 'count'], '__cap')
    expect(epilogue).toContain('try{__tosiScope.app=app}catch(_e){}')
    expect(epilogue).toContain('try{__tosiScope.count=count}catch(_e){}')
    expect(epilogue).toContain('__cap(__tosiScope)')
  })

  test('runs and captures live values in an AsyncFunction body', async () => {
    let captured: Record<string, unknown> = {}
    const capture = (s: Record<string, unknown>) => {
      captured = s
    }
    const body =
      'const app = { items: [1, 2] }\nconst n = 3' +
      buildScopeCapture(['app', 'n', 'missing'], '__cap')
    const fn = new AsyncFunction('__cap', body)
    await fn(capture)
    expect(captured.app).toEqual({ items: [1, 2] })
    expect(captured.n).toBe(3)
    // an over-matched / undefined name is silently skipped, not thrown
    expect('missing' in captured).toBe(false)
  })
})
