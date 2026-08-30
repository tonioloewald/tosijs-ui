import { test, expect, afterEach } from 'bun:test'
import { tosiTable } from './data-table.js'
import { initLocalization, i18n } from './localize.js'

/*
Accessible names for `<tosi-table>`'s two nameless controls.

The column-options button is an icon alone and an editable cell is an empty input, so neither
has any text to derive a name from — a screen reader announced 49 of them on the data-table
doc page as bare "button" and "edit text". `tests/a11y-names.pw.ts` covers the rendered,
UNLOCALIZED result in a real browser; what is only reachable here is the localized branch,
which emits the `data-tosi-localized` directive so the name follows a locale change.
*/

const TSV = [
  'en-US\tfr',
  'English\tFrench',
  'English\tFrançais',
  '🇺🇸\t🇫🇷',
  'Column Options\tOptions de colonne',
  'Price\tPrix',
].join('\n')

/*
The element must be CONNECTED before its `initAttributes` are readable: an element creator's
props are applied on connect, so `tosiTable({ localized: true }).localized` is still `false`
while it is detached. Adopters connect their elements, so this is a test artifact rather than
a defect — but left unnoticed it would have quietly pointed the localized assertions below at
the unlocalized path.
*/
function makeTable(props: Record<string, unknown> = {}): any {
  const el = tosiTable(props as any) as any
  document.body.append(el)
  return el
}

afterEach(() => {
  i18n.locale.value = 'en-US'
  document.body.replaceChildren()
})

test('an unlocalized table names its controls with the key verbatim', () => {
  const table = makeTable()
  expect(table.localized).toBe(false)
  expect(table.labelAttrs('Column Options')).toEqual({
    title: 'Column Options',
  })
  expect(table.labelAttrs('Price', 'aria-label')).toEqual({
    'aria-label': 'Price',
  })
})

test('a localized table emits the directive so the name follows the locale', () => {
  initLocalization(TSV)
  i18n.locale.value = 'fr'
  const table = makeTable({ localized: true })
  expect(table.localized).toBe(true)

  /*
  Both halves matter. The attribute is written translated UP FRONT so there is no frame
  showing the untranslated string, and the directive is what re-applies it when the locale
  changes later — the observer is filtered to the directive attribute itself, so writing
  `title` here does not re-enter it.
  */
  expect(table.labelAttrs('Column Options')).toEqual({
    title: 'Options de colonne',
    'data-tosi-localized': '{"title":"Column Options"}',
  })
  expect(table.labelAttrs('Price', 'aria-label')).toEqual({
    'aria-label': 'Prix',
    'data-tosi-localized': '{"aria-label":"Price"}',
  })
})

test('an empty key contributes no attributes at all', () => {
  /*
  A column with no `name` and no `prop` must not produce `title=""` — an empty name is not an
  absent one: it suppresses the fallback a browser would otherwise compute, which is strictly
  worse than leaving the control alone.
  */
  expect(makeTable().labelAttrs('')).toEqual({})
  expect(makeTable({ localized: true }).labelAttrs('')).toEqual({})
})
