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
/**
 * Turn the import specifiers a `X as Y` clause carries into destructuring pairs:
 * `a, b as c` → `a, b: c`.
 */
function destructureClause(names: string): string {
  return names
    .split(',')
    .map((n) => {
      const as = n.trim().match(/^(\w+)\s+as\s+(\w+)$/)
      return as ? `${as[1]}: ${as[2]}` : n.trim()
    })
    .filter(Boolean)
    .join(', ')
}

/**
 * Rewrite the import statements the context DIDN'T inject into dynamic imports the
 * import-resolver service worker can fulfil — a bare specifier `pkg` becomes
 * `await import('<prefix>pkg')`, a `./x` / `https://…` specifier a direct dynamic
 * import. This is what lets a live example pull real npm code from anywhere; it only
 * runs when the resolver is enabled (a `prefix` is known). See import-resolver-plan.md.
 */
function rewriteBareImportsToDynamic(code: string, prefix: string): string {
  const urlFor = (spec: string) =>
    /^(\.|\/|https?:)/.test(spec) ? spec : prefix + spec
  return (
    code
      // import <clause> from '<spec>'   ({ a, b } | * as X | X | X, { a })
      // NB the trailing `[ \t]*;?` must NOT eat the newline, or the next line glues on.
      .replace(
        /import\s+([^;'"]+?)\s+from\s+(['"])([^'"]+)\2[ \t]*;?/g,
        (match, clause: string, q: string, spec: string) => {
          const imp = `await import(${q}${urlFor(spec)}${q})`
          const c = clause.trim()
          let m
          if ((m = c.match(/^\{([^}]*)\}$/)))
            return `const { ${destructureClause(m[1])} } = ${imp}`
          if ((m = c.match(/^\*\s+as\s+(\w+)$/))) return `const ${m[1]} = ${imp}`
          if ((m = c.match(/^(\w+)$/)))
            return `const ${m[1]} = (${imp}).default`
          if ((m = c.match(/^(\w+)\s*,\s*\{([^}]*)\}$/)))
            return `const { default: ${m[1]}, ${destructureClause(m[2])} } = ${imp}`
          return match // unhandled form — left to fail loudly below
        }
      )
      // side-effect only: import '<spec>'
      .replace(
        /import\s+(['"])([^'"]+)\1[ \t]*;?/g,
        (_m, q: string, spec: string) => `await import(${q}${urlFor(spec)}${q})`
      )
  )
}

/** The import-resolver prefix, if the SW was registered on this page (runtime). */
function resolverPrefix(): string | undefined {
  return (
    globalThis as unknown as { __TOSI_IMPORT_RESOLVER?: { prefix?: string } }
  ).__TOSI_IMPORT_RESOLVER?.prefix
}

export function rewriteImports(
  code: string,
  contextKeys: string[],
  // The import-resolver prefix (e.g. '/lib/'). When set — or when the SW is registered
  // on the page — non-context imports become dynamic imports the worker resolves.
  // Omitted + no SW → the old behavior: a non-context import is unsupported.
  importPrefix: string | undefined = resolverPrefix()
): string {
  let result = code
  for (const moduleName of contextKeys) {
    const js = contextVarName(moduleName)
    const m = moduleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // import { a, b } from 'mod'
    result = result.replace(
      new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*'${m}'`, 'g'),
      (_, names: string) =>
        `const { ${names.replace(/\s+/g, ' ').trim()} } = ${js}`
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
  // With the resolver on, route the imports the context didn't inject to the SW.
  if (importPrefix) {
    result = rewriteBareImportsToDynamic(result, importPrefix)
  }
  // Anything still a static import is unsupported — fail loudly with the line.
  const leftover = result.match(/^\s*import\s+['"{*\w][^\n]*/m)
  if (leftover) {
    throw new Error(
      `live example: unsupported import \`${leftover[0].trim()}\` — imports ` +
        `from the example context (${contextKeys.join(', ')}) are supported in ` +
        `{ named }, * as ns, or default form` +
        (importPrefix
          ? `, and other packages resolve via the import-resolver.`
          : ` (enable importResolver to import other packages).`)
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
const TJS_VERSION = '0.11.0'

// Where to fetch a tjs-lang browser bundle from, in priority order:
//  1. SAME-ORIGIN — the doc-site build copies the bundles next to the iife and
//     sets `__TJS_LOCAL_BASE`, so the transpiler ships in lockstep with the page,
//     works offline, and is immune to CDN propagation lag. Preferred when present.
//  2. CDN chain (jsdelivr → unpkg → esm.sh) — for IIFE consumers who don't serve
//     it same-origin. A freshly-published version 404s on one CDN until it caches
//     it (minutes–hours) and any one can blip, so we try several. The module-cache
//     service worker caches all three hosts.
function bundleUrls(file: string): string[] {
  const localBase = (globalThis as { __TJS_LOCAL_BASE?: string })
    .__TJS_LOCAL_BASE
  return [
    ...(typeof localBase === 'string' ? [`${localBase}${file}`] : []),
    `https://cdn.jsdelivr.net/npm/tjs-lang@${TJS_VERSION}/dist/${file}`,
    `https://unpkg.com/tjs-lang@${TJS_VERSION}/dist/${file}`,
    `https://esm.sh/tjs-lang@${TJS_VERSION}/dist/${file}`,
  ]
}

/** Try each URL in turn; return the first module that loads, else null. */
async function importFirstAvailable(urls: string[]): Promise<any | null> {
  for (const url of urls) {
    try {
      // variable specifier → bundlers leave it as a runtime import (external)
      const m = await import(/* webpackIgnore: true */ /* @vite-ignore */ url)
      if (m) return m
    } catch {
      // try the next source
    }
  }
  return null
}

async function loadTjs(): Promise<TjsFn | null> {
  // Installed peer (ESM consumers / dev build) — static specifier so bundlers
  // resolve it to the local package.
  try {
    const { tjs } = (await import('tjs-lang/browser')) as { tjs: TjsFn }
    if (typeof tjs === 'function') return tjs
  } catch {
    // not installed — try same-origin / CDN
  }
  const m = await importFirstAvailable(bundleUrls('tjs-browser.js'))
  if (m && typeof m.tjs === 'function') return m.tjs as TjsFn
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
  const sources: Array<() => Promise<any>> = [
    () => import('tjs-lang/browser'),
    () => importFirstAvailable(bundleUrls('tjs-browser.js')),
  ]
  for (const load of sources) {
    try {
      const m = (await load()) as Partial<TjsTestApi> | null
      if (
        m &&
        typeof m.extractTests === 'function' &&
        typeof m.testUtils === 'string'
      ) {
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
    // not installed — try same-origin / CDN
  }
  const m = await importFirstAvailable(bundleUrls('tjs-browser-from-ts.js'))
  if (m && typeof m.fromTS === 'function') return m.fromTS as FromTsFn
  return null
}

// Load tjs once per page, not once per example. refresh() runs on every render
// (and renders fire repeatedly while tests run), so a per-call import + parse
// would re-pay tjs's cost each time and make every preview swap visibly lag —
// the engine load is memoized and transform output is cached by dialect+source.
let tjsOnce: Promise<TjsFn | null> | undefined
let fromTsOnce: Promise<FromTsFn | null> | undefined
/**
 * Memoized transform output, keyed by dialect + full source text.
 *
 * BOUNDED, and it has to be. The key contains the whole source, so a *changed*
 * example is a new entry and the superseded one is never looked up again — the cache
 * only ever grows, one entry per version of every example ever transformed. On a page
 * you merely read, that is a handful of entries. But this module is also imported by
 * the doc-site BUILD (check-examples), and — more to the point — the doc system is an
 * *authoring* system: in an edit-in-place session, every keystroke-to-save produces a
 * fresh source string, so an unbounded map grows for as long as the page is open,
 * holding both the source and its transpiled output forever.
 *
 * A plain insertion-ordered eviction is enough here: re-transforming a cold example
 * costs a few ms, and the working set is "the examples on this page".
 */
const RESULT_CACHE_MAX = 256
const resultCache = new Map<string, { code: string }>()
const cacheResult = (key: string, result: { code: string }) => {
  if (resultCache.size >= RESULT_CACHE_MAX) {
    // Map preserves insertion order, so the first key is the oldest.
    const oldest = resultCache.keys().next().value
    if (oldest !== undefined) resultCache.delete(oldest)
  }
  resultCache.set(key, result)
}
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
  // `js` needs no transpiler. tjs's `js` dialect leaves vanilla JS untouched, and
  // the build check guarantees js/`test` blocks ARE vanilla JS (a TS-typed one
  // fails `new AsyncFunction` at build). So identity is behaviorally exact — and it
  // keeps the tjs bundle off the first-paint path for the common all-`js`-examples
  // page. `tjs`/`ts` still load it. See self-contained-examples-plan.md.
  if (dialect === 'js') return (code) => ({ code })
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
    const cacheKey = `${dialect}\0${code}`
    const cached = resultCache.get(cacheKey)
    if (cached) return cached
    // runTests:false — examples must not run tjs inline tests at transpile time
    // (the default throws on failure, which would break the example render).
    if (!tjs) {
      const result = { code }
      cacheResult(cacheKey, result)
      return result
    }
    if (dialect === 'ts') {
      // async: fromTS lazy-loads the TypeScript compiler on first use.
      return (async () => {
        const tjsSource = fromTS
          ? (await fromTS(code, { emitTJS: true })).code
          : code
        const result = {
          code: tjs(tjsSource, { dialect: 'tjs', runTests: false }).code,
        }
        cacheResult(cacheKey, result)
        return result
      })()
    }
    const result = { code: tjs(code, { dialect, runTests: false }).code }
    cacheResult(cacheKey, result)
    return result
  }
}
