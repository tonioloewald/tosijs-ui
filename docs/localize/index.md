# localize

`tosijs-ui` provides support for localization via the `localize` method and the `<tosi-locale-picker>`
and `<tosi-localized>` custom-elements.

> ### Important Note
> This module deals with the **language** used in the user interface. "locale" is
> *not the same thing*. The (usually) two-letter codes used designate **language**
> and **not locale**.
>
> E.g. the US *locale* includes things like measurement systems
> and date format. Most European locales use commas where we use decimal points in the US.
>
> Similarly, `ja` is the code for the Japanese **language** while `jp` is the **locale**.

## `initLocalization(localizationData: string)`

Enables localization from TSV string data.

## TosiLocalePicker

A selector that lets the user pick from among supported languages.

```html
<h3>Locale Picker</h3>
<tosi-locale-picker></tosi-locale-picker>

<h3>Locale Picker with <code>hide-captions</code></h3>
<tosi-locale-picker hide-caption></tosi-locale-picker>
```

## `localize()`

If you just want to localize a string with code, use `localize(s: string): string`.

If the reference string only matches when both are converted to
lowercase, the output string will also be lowercase.

E.g. if you have localized `Cancel` as `Annuler`, then `localize("cancel")
will output `annuler`.

### ellipses

If you end a string with an ellipsis, `localize` will ignore the ellipsis,
localize the string, and then append the ellipsis.

### placeholders

`localize(pattern, values)` fills `{name}` placeholders **after** translating, so the
translation key is the whole sentence:

```js
import { localize } from 'tosijs-ui'

preview.textContent = localize('Add {item}', { item: 'line item' })
```

Do this rather than building the sentence by concatenation. `localize('Add ') + item` makes
the *pattern* untranslatable — a translator can only ever see a dangling fragment, and cannot
move the placeholder to where their language puts it. Neither can they fix
`localize('Sort') + ' ' + localize('Ascending')`, which assumes English word order and
silently imposes it on every language.

An unknown placeholder is left on screen as `{name}` rather than blanked, so a typo in a
translation is visible instead of a hole.

### whole sentences, with a fallback

When a caption is built from parts, `localizePhrase(key, fragments)` asks for the **sentence**
first and joins the fragments only if nobody has translated it:

```js
import { localizePhrase } from 'tosijs-ui'

preview.textContent = localizePhrase('Sort Ascending', [
  'Sort#order',
  'Ascending#sort-order',
])
```

The sentence key needs **no `#`** — an annotation answers *"which sense?"*, and a whole
sentence has already answered it.

This is not a style preference; it is the only form that can be right. Measured against this
project's own table, `localize('Sort') + ' ' + localize('Ascending')` was wrong in every
language checked, in three different ways:

| | joined fragments | correct |
| --- | --- | --- |
| German | `Sortieren Aufsteigend` | `Aufsteigend sortieren` — verb goes last |
| Korean | `정렬 오름차순` | `오름차순 정렬` — modifier first |
| Japanese | `非表示 カラム` | `列を非表示` — particle, and no space |
| Chinese | `隐藏 列` | `隐藏列` — no space between words |
| French | `Cacher Colonne` | `Masquer la colonne` — article |

**The fallback is what makes adopting it safe.** A translation table that predates the
sentence key keeps exactly the behaviour it has, because `localize` returns its input when
nothing matches; add one row and it upgrades. No existing translation is orphaned, so moving
to sentence keys does not have to wait for a major version.

## `setLocale(language: string)`

```js
import { button, p } from 'tosijs'.elements
import { setLocale } from 'tosijs-ui'

preview.append(
  p(
    button(
      {
        onClick() {
          setLocale('en-US')
        }
      },
      'setLocale("en-US")'
    )
  ),
  p(
    button(
      {
        onClick() {
          setLocale('fr')
        }
      },
      'setLocale("fr")'
    )
  ),
  p(
    button(
      {
        onClick() {
          setLocale('qq')
        }
      },
      'setLocale("qq") (see console for error message)'
    )
  ),
)
```

If you want to directly set locale, just use `setLocale()`.

## `data-tosi-localized` directive

Set the `data-tosi-localized` attribute on any element with a JSON object mapping
attribute names to localization keys. The library applies `localize()` to each
key and writes the result to the corresponding attribute — immediately when the
element appears in the DOM, on every locale change, and whenever the
`data-tosi-localized` attribute itself is mutated.

The keys must be reference strings that exist in your localization data — try
switching languages with the locale picker above and watch the `title` and
`placeholder` below update (hover the button to see its tooltip).

```html
<button data-tosi-localized='{"title":"Delete","aria-label":"Delete"}'>
  <tosi-localized>Delete</tosi-localized>
</button>
<input data-tosi-localized='{"placeholder":"Filter…"}'>
```

You never need to set the underlying attributes (`title` / `aria-label` /
`placeholder`) yourself — the data attribute is the source of truth and stays
reactive across locale switches. JSON (not a comma-separated mini-format) is
deliberate: real translation keys contain commas and colons.

**Scope.** The library observes the light DOM with a `MutationObserver`. On
locale change, the walk also descends into **open** shadow roots, so existing
elements get re-applied. *Insertions* inside a shadow root between locale
changes are not picked up automatically — call `applyLocalized(el)` from the
component's `connectedCallback` (or after building the shadow tree) when you
add localized elements inside a shadow root. Closed shadow roots are
inaccessible by design.

If the JSON is malformed, the directive logs a warning and skips that element
— it never throws.

```html
<button
  id="tdl-demo"
  data-tosi-localized='{"title":"Cancel","aria-label":"Cancel"}'
>Hover me</button>
```
```test
test('data-tosi-localized: insert and runtime mutation both apply', async () => {
  const wait = () => new Promise((r) => setTimeout(r, 0))
  // Combine on-insert and runtime-mutation checks into one test — the
  // page-wide locale-change path is exercised by the unit tests and by
  // localization.pw.ts; changing the locale here would cascade through
  // every localized example on the page.
  await wait(); await wait()
  const btn = preview.querySelector('#tdl-demo')
  expect(btn.getAttribute('title')).toBeTruthy()
  expect(btn.getAttribute('title')).toBe(btn.getAttribute('aria-label'))
  const before = btn.getAttribute('title')
  btn.setAttribute('data-tosi-localized', JSON.stringify({ title: 'Yes' }))
  await wait(); await wait()
  expect(btn.getAttribute('title')).not.toBe(before)
})
```

## TosiLocalized

A span-replacement that automatically localizes its text content.
By default the case in the localized data is preserved unless the
reference text is all lowercase, in which case the localized text
is also lowercased.

While viewing this documentation, all `<tosi-localized>` elements should display a **red
underline**.

```html
<h3>Localized Widgets</h3>
<button><tosi-localized>Yes</tosi-localized></button>
<button><tosi-localized>No</tosi-localized></button>
<button><tosi-localized>Open…</tosi-localized></button> <i>note the ellipsis</i>

<h3>Lowercase is preserved</h3>
<button><tosi-localized>yes</tosi-localized></button>
<button><tosi-localized>no</tosi-localized></button>
<button><tosi-localized>open…</tosi-localized></button>

<h3>Localized Attribute</h3>
<input>
```
```css
tosi-localized {
  border-bottom: 2px solid red;
}
```
```js
import { tosiLocalized, localize } from 'tosijs-ui'

preview.append(tosiLocalized({
  refString: 'localized placeholder',
  localeChanged() {
    this.previousElementSibling.setAttribute('placeholder', localize(this.refString))
  }
}))
```

`<tosi-localized>` has a `refString` attribute (which defaults to its initial `textContent`)
which is the text that it localizes. You can set it directly.

It also has an `localeChanged` method which defaults to setting the content of the element
to the localized reference string, but which you can override, to (for example) set a property
or attribute of the parent element.

> `<tosi-localized>` *can* be used inside the shadowDOM of other custom-elements.

## `i18n`

All of the data can be bound in the `i18n` proxy (`xin.i18n`), including the currently selected
locale (which will default to `navigator.language`).

You can take a look at `xin.i18n` in the console. `i18n` can be used to access localization
data directly, and also to determine which locales are available `i18n.locales` and set the
locale programmatically (e.g. `i18n.locale = 'en'`).

```
if (i18n.locales.includes('fr')) {
  i18n.locale = 'fr'
}
```

## String Annotations (`#`)

Sometimes a single term in your reference language needs different translations
depending on context. For example, "OK" might translate to both "D'accord" and
"Bien" in French depending on usage.

Use `#` annotations to create context-specific variants:

- In your TSV data, add rows like `OK#confirm` or `OK#accept` alongside the base `OK` row.
- Use `"` (a double-quote) in any language column to mean "same as the base translation."
  This avoids duplicating translations for languages that don't need a variant.
- `localize('OK#confirm')` looks up the `OK#confirm` entry first. If no entry exists
  (or the cell is empty), it falls back to the base `OK` translation.
- The `#` annotation is always stripped from the output — the user never sees it.

### Literal `#`

An annotation is a **suffix identifier**, so only a `#` that looks like one is treated as
one: immediately preceded by a non-space, followed by letters/digits/`_`/`-`, running to
the end of the string. Everything else is literal:

| string | read as |
| --- | --- |
| `Okay#confirm` | annotation |
| `C# Tutorial` | literal — space after the `#` |
| `Issue #42` | literal — space before the `#` |
| `#hashtag` | literal — nothing before the `#` |
| `C#` | literal — no annotation after the `#` |

Escape with `\#` for a literal that genuinely looks like an annotation (`tag\#42` →
`tag#42`).

Translations are never scanned for annotations — an annotation belongs to the lookup key,
not to the translated text, so a translation may contain `#` freely.

Example TSV rows:
```
OK	D'accord	Ok	好的
OK#confirm	"	"	"
OK#accept	Bien	"	"
```

With the above data:
- `localize('OK')` → `D'accord` (French), `Ok` (Finnish), `好的` (Chinese)
- `localize('OK#confirm')` → `D'accord` (French — inherited via `"`)
- `localize('OK#accept')` → `Bien` (French — specific override), `Ok` (Finnish — inherited)

Ellipsis and case handling work normally with annotations:
- `localize('ok#confirm')` → `d'accord` (lowercase preserved)
- `localize('OK#confirm…')` → `D'accord…`

### A worked example, from our own table

This is not a hypothetical. `<tosi-table>`'s column-header menu used to ask for the bare
word `Right`, and the table shipped with this project had it translated in **the wrong
sense in four of nine languages**:

| language | was | means | should be |
| --- | --- | --- | --- |
| Swedish | `Rätt` | correct | `Höger` |
| Chinese | `正确的` | correct | `右` |
| Spanish | `Bien` | well, fine | `Derecha` |
| Italian | `Giusto` | just, correct | `Destra` |

It was not only `Right`. `Column` came back as `柱子` — a *pillar*. `Sort` became `种类`
and `종류`, both meaning *a kind of thing*. `Show` became `Espectáculo` and `Spettacolo`,
the kind with a stage.

Every one of these is a competent translation of the word it was given. That is the whole
point: **the translator was handed `Right` with no context, and half the time guessed
wrong.** No amount of care downstream fixes a key that does not say which "right" it means
— and nobody notices, because the menu still looks like a menu.

So the menu now asks for `Right#direction`, `Column#table`, `Sort#order`, `Show#reveal`,
and the table has rows to match. The annotation costs one word and is the only place the
disambiguation *can* live: it travels with the key, into the spreadsheet, in front of the
person doing the translating.

**Annotating a key is backward compatible.** `localize('Right#direction')` falls back to a
plain `Right` row when there is no annotated one, so adding an annotation to a library's
key cannot orphan a translation table that predates it. Annotate freely.

Name the annotation for the **sense**, not the call site. `Right#direction` tells a
translator what to do; `Right#1` and `Right#table-menu` tell them where it appears, which
is not the question they need answered.

## Creating Localized String Data

You can create your own localization data using any spreadsheet and exporting TSV.

E.g. you can automatically create localization data
using something like my [localized](https://docs.google.com/spreadsheets/d/1L0_4g_dDhVCwVVxLzYbMj_H86xSp9lsRCKj7IS9psso/edit?usp=sharing)
Google Sheet which leverages `googletranslate` to automatically translate reference strings
(and which you can manually override as you like).

E.g. in this demo I've replaced the incorrect translation of "Finnish"
(`googletranslate` used the word for Finnish nationality rather than the language).

The format of the input data is a table in TSV format, that looks like this:

en-US | fr | fi | sv | zh
------|----|----|----|----
English (US) | French | Finnish | Swedish | Chinese (Mandarin)
English (US) | Français | suomi | svenska | 中文（普通话）
🇺🇸 | 🇫🇷 | 🇫🇮 | 🇸🇪 | 🇨🇳
Icon | Icône | Kuvake | Ikon | 图标
Ok | D'accord | Ok | Ok | 好的
Cancel | Annuler | Peruuttaa | Avboka | 取消

- Column 1 is your reference language.
- Row 1 is [language code](https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes).
- Row 2 is the name of the language in your reference language.
- Row 3 is the name of the language in itself (because it's silly to expect people
  to know the name of their language in a language they don't know)
- Row 4 is the flag emoji for that language (yes, that's problematic, but languages
  do not have flags, per se)
- Rows 5 and on are user interface strings you want to localize

In the spreadsheet provided, each cell contains a formula that translates the term
in the left-most column from the language in that column to the language in the
destination column. Once you have an automatic translation, you can hand off the
sheet to language experts to vet the translations.

Finally, create a `tsv` file and then turn that into a Typescript file by wrapping
the content thus:

```
export default `( content of tsv file )`
```

You use this data using `initLocalization()`.

## Leveraging TosiLocalized Automatic Updates

If you want to leverage TosiLocalized's automatic updates you simply need to
implement `updateLocale` and register yourself with `TosiLocalized.allInstances`
(which is a `Set<AbstractLocalized>).

Typically, this would look like something like:

```
class MyLocalizedComponent extends Component {
  ...

  // register yourself as a localized component
  connectecCallback() {
    super.connectedCallback()

    TosiLocalized.allInstances.add(this)
  }

  // avoid leaking!
  disconnectecCallback() {
    super.connectedCallback()

    TosiLocalized.allInstances.delete(this)
  }

  // presumably your render method does the right things
  updateLocale = () =>  {
    this.queueRender()
  }
}
```
