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

Numeric cells also get a **`-negative`** or **`-zero`** state class by value sign, so you
can style them in CSS without a custom cell — e.g. `.-negative { color: #d32f2f }` for red
negatives. The renderer only marks the sign; CSS decides the look.

```js
import { valueRenderer } from 'tosijs-ui'

const money = valueRenderer('currency(EUR)')
const size = valueRenderer('bytes')
preview.append(
  document.createTextNode(`${money.format(1234.5)} · ${size.format(1500000)}`)
)
```
