import { test, expect, describe } from 'bun:test'
import {
  rewriteImports,
  AsyncFunction,
  loadTransform,
  TJS_VERSION,
  transformAvailable,
  TYPESCRIPT_VERSION,
  TYPESCRIPT_URL,
} from './code-transform.js'

describe("loadTransform('js')", () => {
  test('returns identity without loading the tjs transpiler', async () => {
    const transform = await loadTransform('js')
    const src = "const x = 1 // arbitrary vanilla JS\nconsole.log('hi')"
    // Identity: the code is returned byte-for-byte, no transpiler involved.
    expect((await transform(src, { transforms: ['typescript'] })).code).toBe(
      src
    )
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
    expect(
      rewriteImports("import confetti from 'canvas-confetti'", [], P)
    ).toBe("const confetti = (await import('/lib/canvas-confetti')).default")
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

/*
The CDN pin and the dev dep must not drift (#135).

`TJS_VERSION` is what the PUBLISHED site fetches from jsdelivr/unpkg; the devDependency is what
the tests and the local build run against. They live in different files, so nothing stops them
diverging — and the failure is invisible in exactly the place it matters: every lane here would
stay green while the deployed site transpiled with a different version of tjs-lang.

Found because we had sat on `0.13.4` long enough for it to be deprecated.

An exact PRERELEASE (`0.14.0-rc.0`) is still an exact version, and verifying a tjs-lang rc means
pinning one — so the check admits a prerelease suffix and rejects only ranges.
*/
test('#135: the CDN pin matches the installed tjs-lang', async () => {
  const pkg = await Bun.file(`${import.meta.dir}/../../package.json`).json()
  const declared = pkg.devDependencies['tjs-lang']
  expect(
    declared,
    'the dev dep should be an EXACT version — a range would make this check meaningless'
  ).toMatch(/^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/)
  expect(
    TJS_VERSION,
    `TJS_VERSION (${TJS_VERSION}) is what the published site fetches; package.json says ${declared}`
  ).toBe(declared)
})

/*
The same drift, one level down (the 1.14.0 review's F10a).

tjs-lang's `fromTS` defaults to `https://esm.sh/typescript@5` — an unpinned major range, the
only hop in the live-example chain that was neither same-origin nor pinned, and invisible to
`bun.lock` and `bun audit`. We now pass an exact `typescriptUrl`, which means a second pin that
can silently diverge from the compiler this repo actually type-checks with.

`typescript` is a CARET dev dep here (unlike tjs-lang), so the assertion is against the
INSTALLED version — a `bun update` moving 5.9.3 → 5.9.4 must fail this, not slip past a range
check that would call `^5.9.3` satisfied.
*/
test('F10a: the TypeScript pin matches the installed compiler, and is exact', async () => {
  const installed = (
    await Bun.file(
      `${import.meta.dir}/../../node_modules/typescript/package.json`
    ).json()
  ).version
  expect(
    TYPESCRIPT_VERSION,
    `live \`ts\` examples load typescript@${TYPESCRIPT_VERSION}; this repo type-checks with ${installed}`
  ).toBe(installed)
  expect(TYPESCRIPT_URL).toBe(`https://esm.sh/typescript@${installed}`)
  expect(
    TYPESCRIPT_URL,
    'a range or tag here defeats the point of pinning'
  ).toMatch(/@\d+\.\d+\.\d+$/)
})

/*
Double-quoted specifiers (#141).

The three context rewrites hardcoded `'${m}'`, so the identical import failed on quote style
alone. That is a papercut on its own — what made it serious is Prettier: it formats fenced code
inside markdown and normalises quotes to double, so on any project that formats its `.md`,
EVERY live example silently became a non-running one. The only symptom was a build warning that
reads as advisory. Reported from tosijs-3d-ensemble, where the README's headline example had
never run for the life of the repo — and because it never ran, nothing noticed it also called a
function the package does not export.
*/
describe('#141: quote style must not decide whether an example runs', () => {
  const CTX = ['tosijs', 'tosijs-ui']

  test.each([
    [
      'named',
      `import { elements } from %Qtosijs%Q`,
      'const { elements } = tosijs',
    ],
    ['namespace', `import * as X from %Qtosijs%Q`, 'const X = tosijs'],
    ['default', `import Foo from %Qtosijs-ui%Q`, 'const Foo = tosijsui'],
    [
      'the .elements accessor',
      `import { div } from %Qtosijs%Q.elements`,
      'const { div } = tosijs.elements',
    ],
  ])('%s reads the same single- or double-quoted', (_label, tpl, expected) => {
    expect(rewriteImports(tpl.replace(/%Q/g, "'"), CTX)).toBe(expected)
    expect(rewriteImports(tpl.replace(/%Q/g, '"'), CTX)).toBe(expected)
  })

  test('the error names the specifier, not the grammar', () => {
    // A package the context does not carry: say THAT, and say which ones it does.
    let msg = ''
    try {
      rewriteImports(`import { x } from "no-such-pkg"`, CTX)
    } catch (e) {
      msg = (e as Error).message
    }
    expect(msg).toContain('no-such-pkg')
    expect(msg).toContain('not in the example context')
    expect(msg).toContain('tosijs-ui')
  })

  test('a context package in an unhandled CLAUSE says the clause is the problem', () => {
    let msg = ''
    try {
      // `import a, * as b from` is valid JS the rewriter does not handle.
      rewriteImports(`import a, * as b from 'tosijs'`, CTX)
    } catch (e) {
      msg = (e as Error).message
    }
    expect(msg).toContain('IS in the example context')
    expect(msg).toContain('CLAUSE')
  })
})

/*
Never diagnose a dialect you cannot parse (#154).

`loadTransform` degrades to identity when tjs-lang is unresolvable — right at RUNTIME, where
an example should still render something. It is wrong for a build-time check: identity means
valid TJS gets parsed as raw JavaScript and the author is told to fix correct code. The
reporter got ~30 such errors, each ending "Fix the code", about code their own toolchain
accepts.

`transformAvailable` is the question `checkExamples` must ask first. The SKIP itself is only
reachable with tjs-lang absent, so it is covered at integration level rather than here — this
pins the predicate the skip depends on.
*/
test('#154: transformAvailable reports what can actually be parsed', async () => {
  // `js` needs no transpiler, so it is always available.
  expect(await transformAvailable('js')).toBe(true)
  // tjs-lang IS installed here, so these are true; the point of the function is that it
  // returns FALSE rather than silently handing back an identity transform.
  expect(await transformAvailable('tjs')).toBe(true)
})
