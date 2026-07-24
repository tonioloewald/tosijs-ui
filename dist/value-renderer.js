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
| `percent` / `percent(1)` | localized percent of a **fraction** (`0.5` → `50%`; `percent` = 0 decimals) | right |
| `sci` | scientific notation | right |
| `eng` | engineering notation | right |
| `bytes` / `bytes(iec)` | SI byte units (`kB`, `MB`, …; ÷1000), or IEC binary (`KiB`, `MiB`, …; ÷1024) | right |
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
/*{ "parent": "Helper Libraries" }*/
import { i18n } from './localize';
import { icons } from './icons';
/** Parse `base(arg1, arg2)` — the type-string mini-syntax. */
export function parseValueType(type) {
    const m = /^\s*([a-zA-Z]+)\s*(?:\(([^)]*)\))?\s*$/.exec(type);
    if (!m)
        return { base: type.trim().toLowerCase(), args: [] };
    const args = m[2] === undefined
        ? []
        : m[2]
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    return { base: m[1].toLowerCase(), args };
}
function currentLocale() {
    try {
        return i18n.locale.value || undefined;
    }
    catch {
        return undefined;
    }
}
/**
 * Memoize an `Intl.NumberFormat` by locale, so formatting stays locale-reactive
 * (`setLocale()`) without reconstructing a formatter on every cell — construction
 * is the expensive part.
 */
function byLocale(build) {
    let key = MISS;
    let nf;
    return () => {
        const loc = currentLocale();
        if (loc !== key) {
            key = loc;
            nf = build(loc);
        }
        return nf;
    };
}
const MISS = Symbol('unbuilt');
function toNumber(value) {
    if (value === null || value === undefined || value === '')
        return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
}
// SI (decimal, \u00f71000, `kB`) vs IEC (binary, \u00f71024, `KiB`) \u2014 `bytes` is SI, `bytes(iec)` is IEC.
const BYTE_UNITS_SI = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
const BYTE_UNITS_IEC = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
function formatBytes(n, base, units, scaled, whole) {
    const neg = n < 0;
    let x = Math.abs(n);
    let i = 0;
    while (x >= base && i < units.length - 1) {
        x /= base;
        i += 1;
    }
    const num = (i === 0 ? whole : scaled).format(x);
    return `${neg ? '-' : ''}${num}\u00a0${units[i]}`;
}
function textRenderer(align, format) {
    return {
        align,
        format,
        toDOM(element, value) {
            element.textContent = format(value);
        },
    };
}
/** Build a reusable renderer for a value type string (see the type table above). */
export function valueRenderer(type) {
    const { base, args } = parseValueType(type);
    const numeric = (build) => {
        const nf = byLocale(build);
        return textRenderer('right', (v) => {
            const n = toNumber(v);
            return n === null ? '' : nf().format(n);
        });
    };
    switch (base) {
        case 'number':
            return numeric((l) => new Intl.NumberFormat(l));
        case 'currency': {
            const currency = (args[0] || 'USD').toUpperCase();
            return numeric((l) => new Intl.NumberFormat(l, { style: 'currency', currency }));
        }
        case 'fixed': {
            const d = args[0] !== undefined
                ? Math.max(0, Math.min(20, Math.trunc(Number(args[0])) || 0))
                : 2;
            return numeric((l) => new Intl.NumberFormat(l, {
                minimumFractionDigits: d,
                maximumFractionDigits: d,
            }));
        }
        case 'percent': {
            // Value is a fraction (0.5 → "50%"). `percent` = 0 decimals; `percent(n)` = n.
            const d = args[0] !== undefined
                ? Math.max(0, Math.min(20, Math.trunc(Number(args[0])) || 0))
                : 0;
            return numeric((l) => new Intl.NumberFormat(l, {
                style: 'percent',
                minimumFractionDigits: d,
                maximumFractionDigits: d,
            }));
        }
        case 'sci':
            return numeric((l) => new Intl.NumberFormat(l, { notation: 'scientific' }));
        case 'eng':
            return numeric((l) => new Intl.NumberFormat(l, { notation: 'engineering' }));
        case 'bytes': {
            const iec = (args[0] || '').toLowerCase() === 'iec';
            const base = iec ? 1024 : 1000;
            const units = iec ? BYTE_UNITS_IEC : BYTE_UNITS_SI;
            const scaled = byLocale((l) => new Intl.NumberFormat(l, { maximumFractionDigits: 1 }));
            const whole = byLocale((l) => new Intl.NumberFormat(l, { maximumFractionDigits: 0 }));
            return textRenderer('right', (v) => {
                const n = toNumber(v);
                return n === null ? '' : formatBytes(n, base, units, scaled(), whole());
            });
        }
        case 'boolean': {
            // boolean            → true: checkSquare, false: square
            // boolean(t)         → true: t,           false: nothing
            // boolean(t, f)      → true: t,           false: f
            const trueIcon = args[0] || 'checkSquare';
            const falseIcon = args.length === 0 ? 'square' : args[1] || null;
            const iconNode = (name) => {
                if (!name)
                    return null;
                const creator = icons[name];
                return typeof creator === 'function'
                    ? creator()
                    : document.createTextNode('');
            };
            return {
                align: 'center',
                format: (v) => iconNode(v ? trueIcon : falseIcon) ?? document.createTextNode(''),
                toDOM(element, v) {
                    const node = iconNode(v ? trueIcon : falseIcon);
                    element.replaceChildren(...(node ? [node] : []));
                },
            };
        }
        default:
            // Unknown type → plain text, no imposed alignment.
            return textRenderer(undefined, (v) => (v == null ? '' : String(v)));
    }
}
