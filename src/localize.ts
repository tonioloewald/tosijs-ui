/*#
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
*/

import { Component, tosi, elements, bindings, observe } from 'tosijs'
import { makeSorter } from './make-sorter'
import { tosiSelect, TosiSelect } from './select'

interface TranslationMap {
  [key: string]: string[]
}

const { span } = elements

export const { i18n } = tosi({
  i18n: {
    locale: window.navigator.language,
    locales: [window.navigator.language],
    languages: [window.navigator.language],
    emoji: [''],
    stringMap: {} as TranslationMap,
    localeOptions: [
      {
        icon: span() as any,
        caption: window.navigator.language,
        value: window.navigator.language,
      },
    ],
  },
})

bindings.localeOptions = {
  toDOM(select, options) {
    if (select instanceof TosiSelect) {
      select.options = options
    }
  },
}

export const setLocale = (language: string) => {
  if (i18n.locales.value.includes(language)) {
    i18n.locale.value = language
  } else {
    console.error(`language ${language} is not available`)
  }
}

export const updateLocalized = () => {
  const localizeds = Array.from(TosiLocalized.allInstances)
  for (const localized of localizeds) {
    localized.localeChanged()
  }
}

// Use BoxedScalar's observe method directly
i18n.locale.observe(updateLocalized)

const captionSort = makeSorter((locale: { caption: string }) => [
  locale.caption.toLocaleLowerCase(),
])

export function initLocalization(localizedStrings: string) {
  const [locales, , languages, emoji, ...strings] = localizedStrings
    .split('\n')
    .map((line) => line.split('\t'))
  if (locales && languages && emoji && strings) {
    i18n.locales.value = locales
    i18n.languages.value = languages
    i18n.emoji.value = emoji
    i18n.stringMap.value = strings.reduce(
      (map: TranslationMap, strings: string[]) => {
        map[strings[0].toLocaleLowerCase()] = strings
        return map
      },
      {} as TranslationMap
    )
    i18n.localeOptions.value = locales
      .map((locale, index) => ({
        icon: span({ title: locales[index] }, emoji[index]),
        caption: languages[index],
        value: locale,
      }))
      .sort(captionSort)

    // if user locale isn't available, find the best match
    if (!i18n.locales.value.includes(i18n.locale.value)) {
      const language = (i18n.locale.value as string).substring(0, 2)
      i18n.locale.value =
        i18n.locales.value.find(
          (locale: string) => locale.substring(0, 2) === language
        ) || i18n.locales.value[0]
    }
    updateLocalized()
  }
}

export function localize(ref: string): string {
  if (ref.endsWith('…')) {
    return localize(ref.substring(0, ref.length - 1)) + '…'
  }
  const index = i18n.locales.value.indexOf(i18n.locale.value)
  if (index > -1) {
    // Access stringMap.value first to get the plain object, then lookup by key
    // This avoids the proxy treating '.' in the key as property dereference
    const stringMapValue = i18n.stringMap.value as TranslationMap
    const lowerRef = ref.toLocaleLowerCase()
    const map = stringMapValue[lowerRef]
    let localized = map && map[index]
    // fall back to base string for ditto marks (") and missing annotations
    if ((!localized || localized === '"') && lowerRef.includes('#')) {
      const baseMap = stringMapValue[lowerRef.substring(0, lowerRef.indexOf('#'))]
      localized = baseMap && baseMap[index]
    }
    if (localized) {
      localized = localized.split('#', 2)[0]
      ref =
        ref.toLocaleLowerCase() === ref
          ? localized.toLocaleLowerCase()
          : localized
    } else {
      ref = ref.split('#', 2)[0]
    }
  } else {
    ref = ref.split('#', 2)[0]
  }
  return ref
}

export class TosiLocalePicker extends Component {
  static initAttributes = {
    hideCaption: false,
  }

  content = () => {
    return tosiSelect({
      part: 'select',
      showIcon: true,
      title: localize('Language'),
      bindValue: i18n.locale,
      bindLocaleOptions: i18n.localeOptions,
    })
  }

  render(): void {
    super.render()

    this.parts.select.toggleAttribute('hide-caption', this.hideCaption)
  }
}

/** @deprecated Use TosiLocalePicker instead */
export const LocalePicker = TosiLocalePicker

export const tosiLocalePicker = TosiLocalePicker.elementCreator({
  tag: 'tosi-locale-picker',
})

/** @deprecated Use tosiLocalePicker instead */
export const localePicker = tosiLocalePicker

interface AbstractLocalized {
  localeChanged: () => void
  connectedCallback: () => void
  disconnectedCallback: () => void
}

export class TosiLocalized extends Component {
  static allInstances = new Set<AbstractLocalized>()
  static initAttributes = {
    refString: '',
  }

  contents = () => elements.xinSlot()

  connectedCallback() {
    super.connectedCallback()

    TosiLocalized.allInstances.add(this as unknown as AbstractLocalized)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()

    TosiLocalized.allInstances.delete(this as unknown as AbstractLocalized)
  }

  localeChanged() {
    if (!this.refString) {
      this.refString = this.textContent || ''
    }
    this.textContent = this.refString ? localize(this.refString) : ''
  }

  render() {
    super.render()

    this.localeChanged()
  }
}

/** @deprecated Use TosiLocalized instead */
export const XinLocalized = TosiLocalized

export const tosiLocalized = TosiLocalized.elementCreator({
  tag: 'tosi-localized',
  styleSpec: {
    ':host': {
      pointerEvents: 'none',
    },
  },
})

/** @deprecated Use tosiLocalized instead */
export const xinLocalized = tosiLocalized
