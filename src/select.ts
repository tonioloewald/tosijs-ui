/*#
# select

`<xin-select>` (`xinSelect` is the `ElementCreator`) is a replacement for the lamentable
built in `<select>` element that addresses its various shortcomings.

- since `<xin-select>` is powered by `popMenu`, and supports separators and submenus.
- options can have icons.
- `<xin-select>` will retain and display a value even if the matching option is missing.
- its displayed value can be made `editable`, allowing use as a "combo box".
- options can have `async` callbacks that return a value.
- picking an item triggers an `action` event even if the value hasn't changed.
- available options are set via the `options` attribute or the element's `options` property (not `<option>` elements)

```html
<xin-select
  title="simple select"
  options="this,that,,the other"
  value="not an option!"
></xin-select><br>
<xin-select
  show-icon
  title="has captions"
  class="captions"
  value="image"
></xin-select><br>
<xin-select
  show-icon
  title="combo select with icons"
  class="icons"
  editable
  placeholder="pick an icon"
></xin-select><br>
<xin-select
  show-icon
  hide-caption
  title="icons only"
  class="icons-only"
  placeholder="pick an icon"
></xin-select>
<pre contenteditable>Select some text in here…
…to check for focus stealing</pre>
```
```js
import { icons } from 'tosijs-ui'

const captions = preview.querySelector('.captions')

captions.options = [
  {
    caption: 'a heading',
    value: 'heading'
  },
  {
    caption: 'a paragraph',
    value: 'paragraph'
  },
  null,
  {
    caption: 'choose some other',
    options: [
      {
        icon: 'image',
        caption: 'an image',
        value: 'image'
      },
      {
        icon: 'fileText',
        caption: 'a text file',
        value: 'text',
      },
      {
        icon: 'video',
        caption: 'a video',
        value: 'video'
      },
      null,
      {
        caption: 'anything goes…',
        value: () => prompt('Enter your other', 'other') || undefined
      },
      {
        caption: 'brother… (after 1s delay)',
        value: async () => new Promise(resolve => {
          setTimeout(() => resolve('brother'), 1000)
        })
      }
    ]
  }
]

const iconsSelect = preview.querySelector('.icons')
const iconsOnly = preview.querySelector('.icons-only')

iconsSelect.options = iconsOnly.options = Object.keys(icons).sort().map(icon =>({
  icon,
  caption: icon,
  value: icon
}))

preview.addEventListener('action', (event) => {
  console.log(event.target.title, 'user picked', event.target.value)
}, true)

preview.addEventListener('change', (event) => {
  console.log(event.target.title, 'changed to', event.target.value)
}, true)
```
<xin-css-var-editor element-selector="xin-select"></xin-css-var-editor>

## `options`

    type OptionRequest = () => Promise<string | undefined>

    export interface SelectOption {
      icon?: string | HTMLElement
      caption: string
      value: string | OptionRequest
    }

    export interface SelectOptionSubmenu {
      icon?: string | HTMLElement
      caption: string
      options: SelectOptions
    }

    export type SelectOptions = Array<string | null | SelectOption | SelectOptionSubmenu>

A `<xin-select>` can be assigned `options` as a string of comma-delimited choices,
or be provided a `SelectOptions` array (which allows for submenus, separators, etc.).

## Attributes

`<xin-select>` supports several attributes:

- `editable` lets the user directly edit the value (like a "combo box").
- `show-icon` displays the icon corresponding to the currently selected value.
- `hide-caption` hides the caption.
- `placeholder` allows you to set a placeholder.
- `options` allows you to assign options as a comma-delimited string attribute.

## Events

Picking an option triggers an `action` event (whether or not this changes the value).

Changing the value, either by typing in an editable `<xin-select>` or picking a new
value triggers a `change` event.

You can look at the console to see the events triggered by the second example.

## Localization

`<xin-select>` supports the `localized` attribute which automatically localizes
options.

```html
<xin-select
  localized
  placeholder="localized placeholder"
  options="yes,no,,moderate"
></xin-select>
```
*/

import {
  Component,
  ElementCreator,
  PartsMap,
  elements,
  vars,
  throttle,
} from 'tosijs'
import { icons } from './icons'
import { popMenu, MenuItem, SubMenu, removeLastMenu } from './menu'
import { localize, XinLocalized } from './localize'

const { button, span, input } = elements

type OptionRequest = () => Promise<string | undefined>

export interface SelectOption {
  icon?: string | HTMLElement
  caption: string
  value: string | OptionRequest
}

export interface SelectOptionSubmenu {
  icon?: string | HTMLElement
  caption: string
  options: SelectOptions
}

export type SelectOptions = Array<
  string | null | SelectOption | SelectOptionSubmenu
>

const hasValue = (options: SelectOptions, value: string): boolean => {
  return !!options.find((option) => {
    if (option === null || value == null) {
      return false
    } else if (Array.isArray(option)) {
      return hasValue(option, value)
    } else if ((option as SelectOption).value === value || option === value) {
      return true
    }
  })
}

interface SelectParts extends PartsMap {
  button: HTMLButtonElement
  value: HTMLInputElement
}

export class XinSelect extends Component<SelectParts> {
  editable = false
  showIcon = false
  hideCaption = false
  options: string | SelectOptions = ''
  value = ''
  placeholder = ''
  filter = ''
  localized = false
  disabled = false

  private setValue = (value: string, triggerAction = false) => {
    if (this.value !== value) {
      this.value = value
    }
    if (triggerAction) {
      this.dispatchEvent(new Event('action'))
    }
  }

  private getValue = () => this.value

  get selectOptions(): SelectOptions {
    return typeof this.options === 'string'
      ? this.options.split(',').map((option) => option.trim() || null)
      : this.options
  }

  private buildOptionMenuItem = (
    option: string | null | SelectOption | SelectOptionSubmenu
  ): MenuItem => {
    if (option === null) {
      return null
    }
    const { setValue, getValue } = this
    let icon: string | HTMLElement | undefined
    let caption: string
    let value: string | OptionRequest
    if (typeof option === 'string') {
      caption = value = option
    } else {
      ;({ icon, caption, value } = option as SelectOption)
    }
    if (this.localized) {
      caption = localize(caption)
    }
    const { options } = option as SelectOptionSubmenu
    if (options) {
      return {
        icon,
        caption,
        checked: () => hasValue(options, getValue()),
        menuItems: options.map(this.buildOptionMenuItem),
      }
    }
    return {
      icon,
      caption,
      checked: () => getValue() === value,
      action:
        typeof value === 'function'
          ? async () => {
              const newValue = await (value as OptionRequest)()
              if (newValue !== undefined) {
                setValue(newValue, true)
              }
            }
          : () => {
              if (typeof value === 'string') {
                setValue(value, true)
              }
            },
    }
  }

  get optionsMenu(): MenuItem[] {
    const options = this.selectOptions.map(this.buildOptionMenuItem)
    if (this.filter === '') {
      return options
    }
    const showOption = (option: MenuItem) => {
      if (option === null) {
        return true
      } else if ((option as SubMenu).menuItems) {
        ;(option as SubMenu).menuItems = (option as SubMenu).menuItems.filter(
          showOption
        )
        return (option as SubMenu).menuItems.length > 0
      } else {
        return option.caption.toLocaleLowerCase().includes(this.filter)
      }
    }
    return options.filter(showOption)
  }

  handleChange = (event: Event) => {
    const { value } = this.parts
    const newValue = value.value || ''
    if (this.value !== String(newValue)) {
      this.value = newValue
      this.dispatchEvent(new Event('change'))
    }
    this.filter = ''
    event.stopPropagation()
    event.preventDefault()
  }

  handleKey = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
    }
  }

  filterMenu = throttle(() => {
    this.filter = (
      this.parts.value as HTMLInputElement
    ).value.toLocaleLowerCase()
    removeLastMenu(0)
    this.popOptions()
  })

  popOptions = (event?: Event) => {
    if (event && event.type === 'click') {
      this.filter = ''
    }
    this.poppedOptions = this.optionsMenu
    popMenu({
      target: this,
      menuItems: this.poppedOptions,
      showChecked: true,
    })
  }
  content = () => [
    button(
      {
        part: 'button',
        onClick: this.popOptions,
      },
      span(),
      input({
        part: 'value',
        value: this.value,
        tabindex: 0,
        onKeydown: this.handleKey,
        onInput: this.filterMenu,
        onChange: this.handleChange,
      }),
      icons.chevronDown()
    ),
  ]

  constructor() {
    super()

    this.initAttributes(
      'options',
      'editable',
      'placeholder',
      'showIcon',
      'hideCaption',
      'localized',
      'disabled'
    )
  }

  get allOptions(): SelectOption[] {
    const all: SelectOption[] = []

    function flatten(some: SelectOptions): void {
      for (const option of some) {
        if (typeof option === 'string') {
          all.push({ caption: option, value: option })
        } else if ((option as SelectOption)?.value) {
          all.push(option as SelectOption)
        } else if ((option as SelectOptionSubmenu)?.options) {
          flatten((option as SelectOptionSubmenu).options)
        }
      }
    }

    flatten(this.selectOptions)
    return all
  }
  findOption(): SelectOption {
    const found = this.allOptions.find((option) => option.value === this.value)
    return found || { caption: this.value, value: this.value }
  }

  localeChanged = () => {
    this.queueRender()
  }

  connectedCallback() {
    super.connectedCallback()

    if (this.localized) {
      XinLocalized.allInstances.add(this)
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback()

    if (this.localized) {
      XinLocalized.allInstances.delete(this)
    }
  }

  render(): void {
    super.render()

    const { value, button } = this.parts
    button.disabled = this.disabled
    const icon = value.previousElementSibling as HTMLElement

    const option = this.findOption()
    let newIcon: Element = span()
    value.value = this.localized ? localize(option.caption) : option.caption
    if (option.icon) {
      if (option.icon instanceof HTMLElement) {
        newIcon = option.icon.cloneNode(true) as HTMLElement
      } else {
        newIcon = icons[option.icon]()
      }
    }
    icon.replaceWith(newIcon)
    value.setAttribute(
      'placeholder',
      this.localized ? localize(this.placeholder) : this.placeholder
    )
    value.style.pointerEvents = this.editable ? '' : 'none'
    value.readOnly = !this.editable
  }
}

export const xinSelect = XinSelect.elementCreator({
  tag: 'xin-select',
  styleSpec: {
    ':host': {
      '--gap': '8px',
      '--touch-size': '44px',
      '--padding': '0 8px',
      '--value-padding': '0 8px',
      '--icon-width': '24px',
      '--fieldWidth': '140px',
      display: 'inline-flex',
      position: 'relative',
    },
    ':host button': {
      display: 'flex',
      alignItems: 'center',
      justifyItems: 'center',
      gap: vars.gap,
      textAlign: 'left',
      height: vars.touchSize,
      padding: vars.padding,
      position: 'relative',
      width: '100%',
    },
    ':host:not([show-icon]) button > :first-child': {
      display: 'none',
    },
    ':host[hide-caption] button > :nth-child(2)': {
      display: 'none',
    },
    ':host [part="value"]': {
      width: vars.fieldWidth,
      padding: vars.valuePadding,
      height: vars.touchSize,
      lineHeight: vars.touchSize,
      boxShadow: 'none',
      whiteSpace: 'nowrap',
      outline: 'none',
      background: 'transparent',
      flex: '1',
    },
    ':host [part="value"]:not(:focus)': {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      background: 'transparent',
    },
  },
}) as ElementCreator<XinSelect>
