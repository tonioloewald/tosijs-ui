/*#
# valueRenderer

`valueRenderer(type)` turns a compact **type string** into a reusable renderer for
displaying a value — localized number / currency / byte formatting, scientific or
engineering notation, fixed precision, or a boolean-as-icon — each with a sensible
**default alignment**. `<tosi-table>` uses it for column `type`, and it's exported so
you can render a typed value consistently anywhere.

A renderer exposes three things:

- `format(value)` → a `string` (numeric types) or a `Node` (icon types), locale-reactive.
- `toDOM(element, value)` → writes the formatted value into an element.
- `align` → the type's default alignment (`'right'` numeric, `'center'` boolean, else undefined).

## Type strings

Arguments go in parentheses, comma-separated.

| type | renders | align |
| --- | --- | --- |
| `number` | localized number | right |
| `currency` / `currency(USD)` | localized currency (default `USD`) | right |
| `fixed` / `fixed(2)` | localized, N decimals (`fixed` = `fixed(2)`) | right |
| `sci` | scientific notation | right |
| `eng` | engineering notation | right |
| `bytes` | standardized SI byte units (`kB`, `MB`, `GB`, …; ÷1000) | right |
| `boolean` / `boolean(t)` / `boolean(t,f)` | icons via the `icons` proxy (default `checkSquare`/`square`; `boolean(t)` shows nothing when false) | center |

Formatting follows the app's current locale (`i18n.locale`, i.e. `setLocale()`); it
falls back to the runtime default.

```js
import { valueRenderer } from 'tosijs-ui'

const money = valueRenderer('currency(EUR)')
const size = valueRenderer('bytes')
preview.append(
  document.createTextNode(`${money.format(1234.5)} · ${size.format(1500000)}`)
)
```
*/

import { i18n } from './localize'
import { icons } from './icons'

export type Alignment = 'left' | 'right' | 'center'

/**
 * A value-renderer type string. The bare base names autocomplete; parameterized
 * forms (`fixed(2)`, `currency(EUR)`, `boolean(check,x)`) come in through the
 * `string` fallback — TypeScript can't express the parenthesized-argument grammar,
 * but tjs-lang validates the full string. The `& {}` keeps the literal suggestions
 * from being widened away by the `string` member.
 */
export type ValueRendererType =
  | 'number'
  | 'currency'
  | 'fixed'
  | 'sci'
  | 'eng'
  | 'bytes'
  | 'boolean'
  // eslint-disable-next-line @typescript-eslint/ban-types
  | (string & {})

export interface ValueRenderer {
  /** Default alignment for the type — 'right' for numerics, 'center' for booleans. */
  align?: Alignment
  /** Format a value to text (numeric types) or a Node (icon types). Locale-reactive. */
  format(value: unknown): string | Node
  /** Render a value into an element (sets textContent, or replaces children with a node). */
  toDOM(element: HTMLElement, value: unknown): void
}

interface ParsedType {
  base: string
  args: string[]
}

/** Parse `base(arg1, arg2)` — the type-string mini-syntax. */
export function parseValueType(type: string): ParsedType {
  const m = /^\s*([a-zA-Z]+)\s*(?:\(([^)]*)\))?\s*$/.exec(type)
  if (!m) return { base: type.trim().toLowerCase(), args: [] }
  const args =
    m[2] === undefined
      ? []
      : m[2]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
  return { base: m[1].toLowerCase(), args }
}

function currentLocale(): string | undefined {
  try {
    return (i18n as { locale: { value: string } }).locale.value || undefined
  } catch {
    return undefined
  }
}

/**
 * Memoize an `Intl.NumberFormat` by locale, so formatting stays locale-reactive
 * (`setLocale()`) without reconstructing a formatter on every cell — construction
 * is the expensive part.
 */
function byLocale(build: (locale: string | undefined) => Intl.NumberFormat) {
  let key: string | undefined | typeof MISS = MISS
  let nf: Intl.NumberFormat
  return (): Intl.NumberFormat => {
    const loc = currentLocale()
    if (loc !== key) {
      key = loc
      nf = build(loc)
    }
    return nf
  }
}
const MISS = Symbol('unbuilt')

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

const BYTE_UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

function formatBytes(
  n: number,
  scaled: Intl.NumberFormat,
  whole: Intl.NumberFormat
): string {
  const neg = n < 0
  let x = Math.abs(n)
  let i = 0
  while (x >= 1000 && i < BYTE_UNITS.length - 1) {
    x /= 1000
    i += 1
  }
  const num = (i === 0 ? whole : scaled).format(x)
  return `${neg ? '-' : ''}${num}\u00a0${BYTE_UNITS[i]}`
}

function textRenderer(
  align: Alignment | undefined,
  format: (value: unknown) => string
): ValueRenderer {
  return {
    align,
    format,
    toDOM(element, value) {
      element.textContent = format(value)
    },
  }
}

/** Build a reusable renderer for a value type string (see the type table above). */
export function valueRenderer(type: ValueRendererType): ValueRenderer {
  const { base, args } = parseValueType(type)

  const numeric = (build: (l: string | undefined) => Intl.NumberFormat) => {
    const nf = byLocale(build)
    return textRenderer('right', (v) => {
      const n = toNumber(v)
      return n === null ? '' : nf().format(n)
    })
  }

  switch (base) {
    case 'number':
      return numeric((l) => new Intl.NumberFormat(l))
    case 'currency': {
      const currency = (args[0] || 'USD').toUpperCase()
      return numeric(
        (l) => new Intl.NumberFormat(l, { style: 'currency', currency })
      )
    }
    case 'fixed': {
      const d =
        args[0] !== undefined
          ? Math.max(0, Math.min(20, Math.trunc(Number(args[0])) || 0))
          : 2
      return numeric(
        (l) =>
          new Intl.NumberFormat(l, {
            minimumFractionDigits: d,
            maximumFractionDigits: d,
          })
      )
    }
    case 'sci':
      return numeric((l) => new Intl.NumberFormat(l, { notation: 'scientific' }))
    case 'eng':
      return numeric(
        (l) => new Intl.NumberFormat(l, { notation: 'engineering' })
      )
    case 'bytes': {
      const scaled = byLocale(
        (l) => new Intl.NumberFormat(l, { maximumFractionDigits: 1 })
      )
      const whole = byLocale(
        (l) => new Intl.NumberFormat(l, { maximumFractionDigits: 0 })
      )
      return textRenderer('right', (v) => {
        const n = toNumber(v)
        return n === null ? '' : formatBytes(n, scaled(), whole())
      })
    }
    case 'boolean': {
      // boolean            → true: checkSquare, false: square
      // boolean(t)         → true: t,           false: nothing
      // boolean(t, f)      → true: t,           false: f
      const trueIcon = args[0] || 'checkSquare'
      const falseIcon = args.length === 0 ? 'square' : args[1] || null
      const iconNode = (name: string | null): Node | null => {
        if (!name) return null
        const creator = (icons as Record<string, unknown>)[name]
        return typeof creator === 'function'
          ? (creator() as Node)
          : document.createTextNode('')
      }
      return {
        align: 'center',
        format: (v) =>
          iconNode(v ? trueIcon : falseIcon) ?? document.createTextNode(''),
        toDOM(element, v) {
          const node = iconNode(v ? trueIcon : falseIcon)
          element.replaceChildren(...(node ? [node] : []))
        },
      }
    }
    default:
      // Unknown type → plain text, no imposed alignment.
      return textRenderer(undefined, (v) => (v == null ? '' : String(v)))
  }
}
