/*#
# localize

`tosijs-ui` provides support for localization via the `localize` method and the `<xin-locale-picker>`
and `<xin-localized>` custom-elements.

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

## XinLocalePicker

A selector that lets the user pick from among supported languages.

```html
<h3>Locale Picker</h3>
<xin-locale-picker></xin-locale-picker>

<h3>Locale Picker with <code>hide-captions</code></h3>
<xin-locale-picker hide-caption></xin-locale-picker>
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

## XinLocalized

A span-replacement that automatically localizes its text content.
By default the case in the localized data is preserved unless the
reference text is all lowercase, in which case the localized text
is also lowercased.

While viewing this documentation, all `<xin-localized>` elements should display a **red
underline**.

```html
<h3>Localized Widgets</h3>
<button><xin-localized>Yes</xin-localized></button>
<button><xin-localized>No</xin-localized></button>
<button><xin-localized>Open…</xin-localized></button> <i>note the ellipsis</i>

<h3>Lowercase is preserved</h3>
<button><xin-localized>yes</xin-localized></button>
<button><xin-localized>no</xin-localized></button>
<button><xin-localized>open…</xin-localized></button>

<h3>Localized Attribute</h3>
<input>
```
```css
xin-localized {
  border-bottom: 2px solid red;
}
```
```js
import { xinLocalized, localize } from 'tosijs-ui'

preview.append(xinLocalized({
  refString: 'localized placeholder',
  localeChanged() {
    this.previousElementSibling.setAttribute('placeholder', localize(this.refString))
  }
}))
```

`<xin-localized>` has a `refString` attribute (which defaults to its initial `textContent`)
which is the text that it localizes. You can set it directly.

It also has an `localeChanged` method which defaults to setting the content of the element
to the localized reference string, but which you can override, to (for example) set a property
or attribute of the parent element.

> `<xin-localized>` *can* be used inside the shadowDOM of other custom-elements.

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

## Leveraging XinLocalized Automatic Updates

If you want to leverage XinLocalized's automatic updates you simply need to
implement `updateLocale` and register yourself with `XinLocalized.allInstances`
(which is a `Set<AbstractLocalized>).

Typically, this would look like something like:

```
class MyLocalizedComponent extends Component {
  ...

  // register yourself as a localized component
  connectecCallback() {
    super.connectedCallback()

    XinLocalized.allInstances.add(this)
  }

  // avoid leaking!
  disconnectecCallback() {
    super.connectedCallback()

    XinLocalized.allInstances.delete(this)
  }

  // presumably your render method does the right things
  updateLocale = () =>  {
    this.queueRender()
  }
}
```
*/

import {
  Component,
  tosi,
  elements,
  bindings,
  observe,
  BoxedProxy,
} from 'tosijs'
import { makeSorter } from './make-sorter'
import { xinSelect, XinSelect } from './select'

interface TranslationMap {
  [key: string]: string[]
}

interface I18nConfig {
  locale: string
  locales: string[]
  languages: string[]
  emoji: string[]
  stringMap: TranslationMap
  localeOptions: Array<{
    icon: any // simplified to prevent inferred type from being massive
    caption: string
    value: string
  }>
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
    if (select instanceof XinSelect) {
      select.options = options
    }
  },
}

export const setLocale = (language: string) => {
  if (i18n.locales.xinValue.includes(language)) {
    i18n.locale.xinValue = language
  } else {
    console.error(`language ${language} is not available`)
  }
}

export const updateLocalized = () => {
  const localizeds = Array.from(XinLocalized.allInstances)
  for (const localized of localizeds) {
    localized.localeChanged()
  }
}

// @ts-ignore-error it's a proxy
observe(i18n.locale.xinPath, updateLocalized)

const captionSort = makeSorter((locale: { caption: string }) => [
  locale.caption.toLocaleLowerCase(),
])

export function initLocalization(localizedStrings: string) {
  const [locales, , languages, emoji, ...strings] = localizedStrings
    .split('\n')
    .map((line) => line.split('\t'))
  if (locales && languages && emoji && strings) {
    i18n.locales.xinValue = locales
    i18n.languages.xinValue = languages
    i18n.emoji.xinValue = emoji
    i18n.stringMap.xinValue = strings.reduce(
      (map: TranslationMap, strings: string[]) => {
        map[strings[0].toLocaleLowerCase()] = strings
        return map
      },
      {} as TranslationMap
    )
    i18n.localeOptions.xinValue = locales
      .map((locale, index) => ({
        icon: span({ title: locales[index] }, emoji[index]),
        caption: languages[index],
        value: locale,
      }))
      .sort(captionSort)

    // if user locale isn't available, find the best match
    if (!i18n.locales.xinValue.includes(i18n.locale.xinValue)) {
      const language = i18n.locale.substring(0, 2)
      i18n.locale.xinValue =
        i18n.locales.xinValue.find(
          (locale: string) => locale.substring(0, 2) === language
        ) || i18n.locales.xinValue[0]
    }
    updateLocalized()
  }
}

export function localize(ref: string): string {
  if (ref.endsWith('…')) {
    return localize(ref.substring(0, ref.length - 1)) + '…'
  }
  const index = i18n.locales.xinValue.indexOf(i18n.locale.xinValue)
  if (index > -1) {
    const map = i18n.stringMap[ref.toLocaleLowerCase()]
    const localized = map && map[index]
    if (localized) {
      ref =
        ref.toLocaleLowerCase() === ref
          ? localized.toLocaleLowerCase()
          : localized.valueOf()
    }
  }
  return ref
}

export class LocalePicker extends Component {
  hideCaption = false

  content = () => {
    return xinSelect({
      part: 'select',
      showIcon: true,
      title: localize('Language'),
      bindValue: i18n.locale,
      bindLocaleOptions: i18n.localeOptions,
    })
  }

  constructor() {
    super()

    this.initAttributes('hideCaption')
  }

  render(): void {
    super.render()

    this.parts.select.toggleAttribute('hide-caption', this.hideCaption)
  }
}

export const localePicker = LocalePicker.elementCreator({
  tag: 'xin-locale-picker',
})

interface AbstractLocalized {
  localeChanged: () => void
  connectedCallback: () => void
  disconnectedCallback: () => void
}

export class XinLocalized extends Component {
  static allInstances = new Set<AbstractLocalized>()

  contents = () => elements.xinSlot()

  refString = ''

  constructor() {
    super()

    this.initAttributes('refString')
  }

  connectedCallback() {
    super.connectedCallback()

    XinLocalized.allInstances.add(this as unknown as AbstractLocalized)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()

    XinLocalized.allInstances.delete(this as unknown as AbstractLocalized)
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

export const xinLocalized = XinLocalized.elementCreator({
  tag: 'xin-localized',
  styleSpec: {
    ':host': {
      pointerEvents: 'none',
    },
  },
})
