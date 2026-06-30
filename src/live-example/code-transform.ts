import { Dialect, ExampleContext, TransformFn } from './types'

export const AsyncFunction = (async () => {
  /* placeholder */
}).constructor

/**
 * Sanitize a context module key into a JS identifier used as the binding name
 * in rewritten imports and as the AsyncFunction parameter. Must be applied
 * consistently on both sides. e.g. 'tosijs-ui' -> 'tosijsui',
 * '@babylonjs/core' -> 'babylonjscore'.
 */
export function contextVarName(key: string): string {
  return key.replace(/[^a-zA-Z0-9_$]/g, '')
}

/**
 * Rewrite import statements (from the example context) to const bindings:
 *   import { x } from 'tosijs'        -> const { x } = tosijs
 *   import * as B from '@babylonjs'   -> const B = babylonjs   (context key)
 *   import Foo from 'my-lib'          -> const Foo = mylib
 * The `.elements` accessor form (`import { x } from 'tosijs'.elements`) is
 * preserved. Any static import that isn't from a context module (or uses an
 * unsupported form) throws a clear error rather than becoming a SyntaxError in
 * the AsyncFunction body.
 */
export function rewriteImports(code: string, contextKeys: string[]): string {
  let result = code
  for (const moduleName of contextKeys) {
    const js = contextVarName(moduleName)
    const m = moduleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // import { a, b } from 'mod'
    result = result.replace(
      new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*'${m}'`, 'g'),
      (_, names: string) => `const { ${names.replace(/\s+/g, ' ').trim()} } = ${js}`
    )
    // import * as X from 'mod'
    result = result.replace(
      new RegExp(`import\\s*\\*\\s*as\\s+(\\w+)\\s+from\\s*'${m}'`, 'g'),
      (_, name: string) => `const ${name} = ${js}`
    )
    // import X from 'mod'  (default)
    result = result.replace(
      new RegExp(`import\\s+(\\w+)\\s+from\\s*'${m}'`, 'g'),
      (_, name: string) => `const ${name} = ${js}`
    )
  }
  // Anything still a static import is unsupported — fail loudly with the line.
  const leftover = result.match(/^\s*import\s+['"{*\w][^\n]*/m)
  if (leftover) {
    throw new Error(
      `live example: unsupported import \`${leftover[0].trim()}\` — only imports ` +
        `from the example context (${contextKeys.join(', ')}) are supported, in ` +
        `{ named }, * as ns, or default form.`
    )
  }
  return result
}

/**
 * Execute code as an async function with injected context
 */
export async function executeCode(
  code: string,
  context: ExampleContext,
  transform: TransformFn
): Promise<void> {
  const rewrittenCode = rewriteImports(code, Object.keys(context))
  const transformedCode = (
    await transform(rewrittenCode, {
      transforms: ['typescript'],
    })
  ).code

  const contextKeys = Object.keys(context).map(contextVarName)
  const contextValues = Object.values(context)

  // @ts-expect-error AsyncFunction constructor typing
  const func = new AsyncFunction(...contextKeys, transformedCode)
  await func(...contextValues)
}

/** The tjs() entry from tjs-lang/lang — the only part we need at the JS seam. */
type TjsFn = (
  source: string,
  options?: { dialect?: 'js' | 'tjs'; runTests?: boolean | 'only' | 'report' }
) => { code: string }

/**
 * The fromTS() entry from tjs-lang/browser/from-ts — lowers TypeScript to tjs.
 * Async: it lazy-loads the TypeScript compiler (from a CDN) on first call.
 */
type FromTsFn = (
  source: string,
  options?: { emitTJS?: boolean }
) => Promise<{ code: string }>

// tjs-lang/browser is a SELF-CONTAINED transpiler bundle (acorn/tosijs-schema
// inlined, zero bare imports), so it loads as a raw CDN file — no `+esm` rewrite
// needed. The TypeScript path lives behind tjs-lang/browser/from-ts (also
// self-contained) and is loaded only for `ts` examples; from-ts in turn fetches
// the TypeScript compiler lazily at runtime, so tsc is never pulled in until a TS
// example actually transforms. Pinned to match the dev dep.
const TJS_CDN = 'https://cdn.jsdelivr.net/npm/tjs-lang@0.8.5/dist/tjs-browser.js'
const FROM_TS_CDN =
  'https://cdn.jsdelivr.net/npm/tjs-lang@0.8.5/dist/tjs-browser-from-ts.js'

async function loadTjs(): Promise<TjsFn | null> {
  // Installed peer (ESM consumers / dev build)
  try {
    const { tjs } = (await import('tjs-lang/browser')) as { tjs: TjsFn }
    if (typeof tjs === 'function') return tjs
  } catch {
    // not installed — try CDN
  }
  // CDN (IIFE consumers, or when tjs-lang isn't installed)
  try {
    const { tjs } = (await import(/* webpackIgnore: true */ TJS_CDN)) as {
      tjs: TjsFn
    }
    if (typeof tjs === 'function') return tjs
  } catch {
    // unavailable — fall through to degraded mode
  }
  return null
}

/**
 * tjs inline-test API (from tjs-lang/lang):
 *   extractTests(src) → { code (test-stripped), tests, testRunner }
 *   testUtils — a string defining `expect`/`assert` etc. for the runner
 * Run with: `new AsyncFunction(...ctx, execJs + testUtils + 'return ' + testRunner)`
 * which resolves to `{ passed, failed, results }`.
 */
export interface TjsTestApi {
  extractTests: (source: string) => {
    code: string
    tests: { description: string }[]
    testRunner: string
  }
  testUtils: string
}

export interface TjsTestResult {
  passed: number
  failed: number
  results: { description: string; passed: boolean; error?: string }[]
}

let testApiOnce: Promise<TjsTestApi | null> | undefined

async function loadTjsTestApiImpl(): Promise<TjsTestApi | null> {
  for (const mod of [
    () => import('tjs-lang/browser'),
    () => import(/* webpackIgnore: true */ TJS_CDN),
  ]) {
    try {
      const m = (await mod()) as Partial<TjsTestApi>
      if (typeof m.extractTests === 'function' && typeof m.testUtils === 'string') {
        return { extractTests: m.extractTests, testUtils: m.testUtils }
      }
    } catch {
      // try next source
    }
  }
  return null
}

/** Load the tjs inline-test API (memoized). null if tjs-lang is unavailable. */
export function loadTjsTestApi(): Promise<TjsTestApi | null> {
  return (testApiOnce ??= loadTjsTestApiImpl())
}

// from-ts pulls in the TypeScript compiler, so it's loaded lazily and only when a
// `ts` example is actually transformed — never for `js`/`tjs` pages.
async function loadFromTs(): Promise<FromTsFn | null> {
  try {
    const { fromTS } = (await import('tjs-lang/browser/from-ts')) as {
      fromTS: FromTsFn
    }
    if (typeof fromTS === 'function') return fromTS
  } catch {
    // not installed — try CDN
  }
  try {
    const { fromTS } = (await import(
      /* webpackIgnore: true */ FROM_TS_CDN
    )) as { fromTS: FromTsFn }
    if (typeof fromTS === 'function') return fromTS
  } catch {
    // unavailable — fall through to degraded mode
  }
  return null
}

// Load tjs once per page, not once per example. refresh() runs on every render
// (and renders fire repeatedly while tests run), so a per-call import + parse
// would re-pay tjs's cost each time and make every preview swap visibly lag —
// the engine load is memoized and transform output is cached by dialect+source.
let tjsOnce: Promise<TjsFn | null> | undefined
let fromTsOnce: Promise<FromTsFn | null> | undefined
const resultCache = new Map<string, { code: string }>()
let warnedNoTjs = false
let warnedNoFromTs = false

/**
 * Load a live-example transform for a given source dialect.
 *
 * tjs-lang is the engine:
 * - `js`  → `tjs(code, { dialect: 'js' })`, which leaves vanilla JavaScript
 *           untouched (no footgun rewriting) — behavior-neutral for plain JS.
 * - `tjs` → `tjs(code, { dialect: 'tjs' })`, the full tjs lowering (structural
 *           `==`, type guards, runtime instrumentation).
 * - `ts`  → `fromTS(code)` → tjs source → `tjs(…, { dialect: 'tjs' })`. The
 *           TypeScript compiler is loaded lazily, only here.
 *
 * The dialect is baked into the returned closure, so callers just pass code.
 *
 * Degraded mode: if tjs-lang can't be loaded, plain JS still runs unchanged
 * (`dialect: 'js'` is a no-op on it), so we pass the code through. A `ts` page
 * with no from-ts available likewise falls back to running the source as JS.
 */
export async function loadTransform(
  dialect: Dialect = 'js'
): Promise<TransformFn> {
  const tjs = await (tjsOnce ??= loadTjs())
  if (!tjs && !warnedNoTjs) {
    warnedNoTjs = true
    console.warn(
      'tjs-lang not available — live examples run as raw JavaScript ' +
        '(tjs/TypeScript examples will not transpile). Install with: npm install tjs-lang'
    )
  }
  const fromTS = dialect === 'ts' ? await (fromTsOnce ??= loadFromTs()) : null
  if (dialect === 'ts' && !fromTS && !warnedNoFromTs) {
    warnedNoFromTs = true
    console.warn(
      'tjs-lang/browser/from-ts not available — `ts` examples run as raw JavaScript.'
    )
  }
  return (code) => {
    const cacheKey = `${dialect} ${code}`
    const cached = resultCache.get(cacheKey)
    if (cached) return cached
    // runTests:false — examples must not run tjs inline tests at transpile time
    // (the default throws on failure, which would break the example render).
    if (!tjs) {
      const result = { code }
      resultCache.set(cacheKey, result)
      return result
    }
    if (dialect === 'ts') {
      // async: fromTS lazy-loads the TypeScript compiler on first use.
      return (async () => {
        const tjsSource = fromTS ? (await fromTS(code, { emitTJS: true })).code : code
        const result = {
          code: tjs(tjsSource, { dialect: 'tjs', runTests: false }).code,
        }
        resultCache.set(cacheKey, result)
        return result
      })()
    }
    const result = { code: tjs(code, { dialect, runTests: false }).code }
    resultCache.set(cacheKey, result)
    return result
  }
}
