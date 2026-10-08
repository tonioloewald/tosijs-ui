/*
The dialect registry (#184): the ONE list of languages an example's source block can be
written in, and how each one becomes a running example.

`js`, `tjs` and `ts` are built-in entries, not special cases beside a hook. A site adds its own
(tjs-lang's AJS, say) with `registerDialect`, in its bundle entry, before the doc system
starts; a fence in that language then becomes a live example like any other.

A dialect either TRANSFORMS (source → JavaScript that the example then runs as usual) or RUNS
(it executes the source itself — a VM, a fuel budget, capabilities it closes over). tosijs-ui
never depends on what a `run` dialect uses: the site's registration closes over it.
*/

import { elements } from 'tosijs'
import {
  BUILT_IN_DIALECTS,
  registerLiveLanguage,
} from '../doc-system/example-policy.js'
import { loadTjsDocs, loadTransform } from './code-transform.js'
import type { Dialect, ExampleContext, TransformFn } from './types.js'

/** Per-example options, from the JSON after the fence language: ```tjs {"debug": true} */
export type DialectOptions = Record<string, unknown>

export interface DialectRunContext {
  /** The example's output element. HTML and CSS blocks are already applied to it. */
  preview: HTMLElement
  /** This example's fence options (`{}` when it has none). */
  options: DialectOptions
  /** Aborted when the example re-runs (an edit) or is removed; stop long work on it. */
  signal: AbortSignal
  /** What the page provides to examples (`tosijs`, `tosijs-ui`, …), keyed by module name. */
  context: ExampleContext
  /**
   * The example's console: what you log here appears under the preview (and in devtools).
   * Forward a VM's own output to it to show it the same way a `js` example's logs are shown.
   * live-example always supplies it; it is optional only so a context built by hand (in a
   * dialect's own tests) need not, as it could not before 1.16.2.
   */
  console?: Console
  /** Show a value as the example's result, below its preview. */
  report(result: unknown): void
}

export interface DialectSpec {
  /** Name shown on the example's source tab, e.g. `AJS`. Defaults to the dialect name. */
  label?: string
  /** Code-editor mode for the source (`javascript`, `tjs`, `ajs`, …). Defaults to the name. */
  editorMode?: string
  /**
   * Source → JavaScript. The example runs the result the way it runs a `js` block, with
   * imports from the page's context modules already rewritten.
   *
   * Also called with a single line typed at the example's console, so the REPL speaks the
   * example's language (#216). Those calls carry `options.repl === true`, and the result is
   * evaluated for the value of its last expression statement.
   */
  transform?: (
    source: string,
    options: DialectOptions
  ) => { code: string } | Promise<{ code: string }>
  /**
   * Run the source yourself. A non-`undefined` return value is reported as the example's
   * result. Throwing fails the example, exactly as a throwing `js` block does.
   */
  run?: (source: string, context: DialectRunContext) => unknown
  /**
   * Documentation for the source, as markdown, shown in the example's **Docs** tab (#184).
   * Called only when someone opens the code panel (and again as they edit), never on the
   * reader's path. Return '' (or nothing) for no tab. Works for `transform` and `run` dialects.
   */
  docs?: (
    source: string,
    options: DialectOptions
  ) => string | undefined | Promise<string | undefined>
}

// Empty specs: the built-ins' behaviour lives in `loadTransform`, and the tab label and editor
// mode default to the name, which is what `tjs`/`ts` examples have always had.
const BUILT_IN: Record<string, DialectSpec> = Object.fromEntries(
  [...BUILT_IN_DIALECTS].map((name) => [name, {}])
)

const registry = new Map<string, DialectSpec>(Object.entries(BUILT_IN))

/**
 * Add a dialect, or replace a built-in one (`registerDialect('tjs', { transform })` runs tjs
 * examples through the site's own tjs-lang build instead of the pinned copy).
 *
 * Call it before the doc system starts: examples take their dialect when they are created,
 * and a fence in an unregistered language is shown as plain code.
 */
export function registerDialect(name: string, spec: DialectSpec): void {
  if (!spec.transform === !spec.run) {
    throw new Error(
      `registerDialect('${name}'): give exactly one of \`transform\` or \`run\``
    )
  }
  registerLiveLanguage(name)
  registry.set(name.toLowerCase(), spec)
}

/** The registered spec for a dialect, or `undefined`. */
export function getDialect(name: string): DialectSpec | undefined {
  return registry.get(name.toLowerCase())
}

/** Is this dialect's `js`/`tjs`/`ts` built-in still in place (not replaced by the site)? */
export function isBuiltInDialect(name: string): boolean {
  const key = name.toLowerCase()
  return BUILT_IN[key] !== undefined && registry.get(key) === BUILT_IN[key]
}

/**
 * The transform an example in `name` runs its source through, or `undefined` for a `run`
 * dialect (which executes the source itself). An unknown name runs as plain JavaScript —
 * the same thing an unregistered language's example did before there was a registry.
 */
export async function dialectTransform(
  name: string,
  options: DialectOptions = {}
): Promise<TransformFn | undefined> {
  const spec = getDialect(name)
  if (spec === undefined) return loadTransform('js')
  if (isBuiltInDialect(name))
    return loadTransform(name.toLowerCase() as Dialect)
  if (spec.run) return undefined
  const transform = spec.transform!
  return (code: string) => transform(code, options)
}

const { pre } = elements

/**
 * Show a `run` dialect's result below the example's preview: a string as written, anything
 * else as JSON (falling back to `String()` for what JSON cannot represent).
 */
export function showDialectResult(preview: HTMLElement, value: unknown): void {
  let text: string
  if (typeof value === 'string') {
    text = value
  } else {
    try {
      text = JSON.stringify(value, null, 2) ?? String(value)
    } catch {
      text = String(value)
    }
  }
  preview.append(pre({ class: 'dialect-result' }, text))
}

/**
 * @internal Not supported API: it discards a site's own overrides of the built-ins.
 *
 * Put the built-ins back — for TESTS only. The registry is module state, and Bun shares
 * module state across every test file in a process, so a test that overrides `tjs` must undo
 * it or every later file inherits the override.
 */
export function resetBuiltInDialectsForTests(): void {
  for (const [name, spec] of Object.entries(BUILT_IN)) registry.set(name, spec)
}

/**
 * The Docs-tab markdown for a source in `name`: the dialect's own `docs`, or for the built-in
 * `tjs`, tjs-lang's generated docs when its browser bundle provides them. '' for none.
 */
export async function dialectDocs(
  name: string,
  source: string,
  options: DialectOptions = {}
): Promise<string> {
  const spec = getDialect(name)
  if (spec?.docs) return (await spec.docs(source, options)) ?? ''
  if (name === 'tjs' && isBuiltInDialect('tjs')) {
    const generate = await loadTjsDocs()
    return generate ? generate(source) : ''
  }
  return ''
}
