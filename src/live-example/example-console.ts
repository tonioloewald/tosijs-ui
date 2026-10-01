/*
The example console: what an example logs, shown under its preview (tjs-lang's ask on #184 —
"`tjs` examples that `console.log` show nothing on the page").

Each run gets its OWN `console`, injected the way `preview` is: as a parameter of the function
the example runs in, so `console.log(…)` in the example — and in any closure it creates — means
this object. The global `console` is never patched, so two examples never see each other's
output and nothing outside an example is captured. Everything is still forwarded to the real
console, so devtools (and the doc-test console-clean check) see exactly what they saw before.
*/

export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug'

/**
 * One call to a shown console method. `args` are the values as logged; nothing is formatted
 * until the panel decides to keep the line (`formatConsoleArgs`), so a superseded run's lines
 * and lines past the cap cost nothing.
 */
export interface ConsoleEntry {
  level: ConsoleLevel
  args: unknown[]
}

// Methods whose output is shown, and the level each is shown at. Anything else
// (`time`, `group`, `assert`, `count`, …) only goes to the real console.
const CAPTURED: Record<string, ConsoleLevel> = {
  log: 'log',
  info: 'info',
  warn: 'warn',
  error: 'error',
  debug: 'debug',
  dir: 'log',
  table: 'log',
}

/*
Recognised by SHAPE, not `instanceof`: an `:iframe` example's values come from the iframe's
realm, whose `Error` and `Element` are not this window's, so `instanceof` said "plain object"
and an error printed as `{}`.
*/
const tagOf = (value: unknown) => Object.prototype.toString.call(value)
const isErrorLike = (value: any): value is Error =>
  tagOf(value) === '[object Error]' ||
  (value !== null &&
    typeof value === 'object' &&
    typeof value.name === 'string' &&
    typeof value.message === 'string' &&
    'stack' in value)
const isElementLike = (value: any): value is Element =>
  value !== null &&
  typeof value === 'object' &&
  value.nodeType === 1 &&
  typeof value.tagName === 'string'

/** One value as a reader would want to see it: strings as written, data as JSON. */
export function formatConsoleValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (isErrorLike(value)) return `${value.name}: ${value.message}`
  if (typeof value === 'function') return `ƒ ${value.name || 'anonymous'}()`
  if (isElementLike(value)) {
    const id = value.id ? `#${value.id}` : ''
    return `<${value.tagName.toLowerCase()}${id}>`
  }
  if (value === null || typeof value !== 'object') return String(value)
  try {
    return JSON.stringify(toPlain(value, []), null, 2) ?? String(value)
  } catch {
    return String(value)
  }
}

/*
The value as plain data, built recursively with its ANCESTORS in hand, then stringified. A
JSON.stringify replacer can't do this reliably: it re-enters with every new object it is
handed (a Map's `{ Map: … }` wrapper, say) as `this`, so ancestry kept by "trim to the holder"
was lost at the first wrapper and a cycle through a Map threw (1.16.2 re-review).

`[Circular]` only for a real cycle, an object that is its own ancestor: a value logged twice
(`{ a: x, b: x }`) is not one.
*/
function toPlain(value: unknown, ancestors: object[]): unknown {
  if (typeof value === 'bigint') return `${value}n`
  if (typeof value === 'function') return `ƒ ${value.name || 'anonymous'}()`
  if (value === null || typeof value !== 'object') return value
  if (ancestors.includes(value)) return '[Circular]'
  if (isErrorLike(value)) return `${value.name}: ${value.message}`
  if (isElementLike(value)) return formatConsoleValue(value)
  const inner = [...ancestors, value]
  if (tagOf(value) === '[object Map]') {
    const entries = [...(value as Map<unknown, unknown>)].map(
      ([key, item]) => [toPlain(key, inner), toPlain(item, inner)] as const
    )
    return entries.every(([key]) => typeof key === 'string')
      ? { Map: Object.fromEntries(entries) }
      : { Map: entries }
  }
  if (tagOf(value) === '[object Set]')
    return {
      Set: [...(value as Set<unknown>)].map((item) => toPlain(item, inner)),
    }
  if (Array.isArray(value)) return value.map((item) => toPlain(item, inner))
  // what JSON.stringify would have used: a Date prints as its ISO string
  const toJSON = (value as { toJSON?: () => unknown }).toJSON
  if (typeof toJSON === 'function') return toPlain(toJSON.call(value), inner)
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(value)) {
    out[key] = toPlain((value as Record<string, unknown>)[key], inner)
  }
  return out
}

export function formatConsoleArgs(args: unknown[]): string {
  return args.map(formatConsoleValue).join(' ')
}

/**
 * A `console` for one example run: captured methods report an entry AND forward to `target`
 * (the real console); everything else is the real console's own method.
 */
export function createExampleConsole(
  onEntry: (entry: ConsoleEntry) => void,
  target: Console = globalThis.console
): Console {
  return new Proxy(target, {
    get(real, prop, receiver) {
      const original = Reflect.get(real, prop, receiver)
      if (typeof prop !== 'string' || typeof original !== 'function')
        return original
      const level = CAPTURED[prop]
      if (level === undefined) return original.bind(real)
      return (...args: unknown[]) => {
        onEntry({ level, args })
        return original.apply(real, args)
      }
    },
  })
}

/*
The page-wide switch is a global, like the example policy (`__TOSI_EXAMPLE_POLICY`), so the site
build can stamp it into the page (`SiteConfig.exampleConsole: false`) before any bundle loads,
and a bundle entry can flip it with `setExampleConsole`. One switch, two ways to reach it.
*/
type ConsoleGlobal = { __TOSI_EXAMPLE_CONSOLE?: boolean }

/**
 * Turn the example console off (or back on) for every example on the page. Logs still reach
 * devtools either way. A single example opts out with the fence option `{"console": false}`;
 * a whole `tosijs-ui/site` site with `exampleConsole: false` in its config.
 */
export function setExampleConsole(enabled: boolean): void {
  ;(globalThis as ConsoleGlobal).__TOSI_EXAMPLE_CONSOLE = enabled
}

export function exampleConsoleEnabled(): boolean {
  return (globalThis as ConsoleGlobal).__TOSI_EXAMPLE_CONSOLE !== false
}
