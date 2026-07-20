import { test, expect, describe } from 'bun:test'
import {
  rewriteImports,
  AsyncFunction,
  loadTransform,
} from './code-transform'

describe("loadTransform('js')", () => {
  test('returns identity without loading the tjs transpiler', async () => {
    const transform = await loadTransform('js')
    const src = "const x = 1 // arbitrary vanilla JS\nconsole.log('hi')"
    // Identity: the code is returned byte-for-byte, no transpiler involved.
    expect((await transform(src, { transforms: ['typescript'] })).code).toBe(src)
  })
})

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
    expect(() =>
      rewriteImports("import { foo } from 'bar'", ['tosijs'])
    ).toThrow(/unsupported import/)
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

describe('rewriteImports → import-resolver (non-context imports)', () => {
  const P = '/lib/'
  test('named/default/namespace/side-effect + `as` rename', () => {
    expect(rewriteImports("import confetti from 'canvas-confetti'", [], P)).toBe(
      "const confetti = (await import('/lib/canvas-confetti')).default"
    )
    expect(rewriteImports("import { nanoid } from 'nanoid'", [], P)).toBe(
      "const { nanoid } = await import('/lib/nanoid')"
    )
    expect(rewriteImports("import { a as x, b } from 'pkg'", [], P)).toBe(
      "const { a: x, b } = await import('/lib/pkg')"
    )
    expect(rewriteImports("import * as ns from 'pkg'", [], P)).toBe(
      "const ns = await import('/lib/pkg')"
    )
    expect(rewriteImports("import def, { a } from 'pkg'", [], P)).toBe(
      "const { default: def, a } = await import('/lib/pkg')"
    )
    expect(rewriteImports("import 'side-effect'", [], P)).toBe(
      "await import('/lib/side-effect')"
    )
  })
  test('context imports still const-inject; only the rest hit /lib/', () => {
    const out = rewriteImports(
      "import { tosi } from 'tosijs'\nimport confetti from 'canvas-confetti'",
      ['tosijs'],
      P
    )
    expect(out).toContain('const { tosi } = tosijs')
    expect(out).toContain("await import('/lib/canvas-confetti')")
  })
  test('preserves the newline — does not glue the next statement on', () => {
    expect(
      rewriteImports(
        "import { nanoid } from 'nanoid'\npreview.textContent = nanoid()",
        [],
        P
      )
    ).toBe(
      "const { nanoid } = await import('/lib/nanoid')\npreview.textContent = nanoid()"
    )
  })
  test('without a prefix, a non-context import is still unsupported', () => {
    expect(() => rewriteImports("import x from 'pkg'", [])).toThrow(
      /unsupported import/
    )
  })
})
