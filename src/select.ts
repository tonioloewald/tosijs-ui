/*#
# select

`<tosi-select>` (`tosiSelect` is the `ElementCreator`) is a replacement for the lamentable
built in `<select>` element that addresses its various shortcomings.

- since `<tosi-select>` is powered by `popMenu`, and supports separators and submenus.
- options can have icons.
- `<tosi-select>` will retain and display a value even if the matching option is missing.
- its displayed value can be made `editable`, allowing use as a "combo box".
- options can have `async` callbacks that return a value.
- picking an item triggers an `action` event even if the value hasn't changed.
- available options are set via the `options` attribute or the element's `options` property (not `<option>` elements)

```js
const { tosiSelect } = tosijsui
const { icons } = tosijsui

const simpleSelect = tosiSelect({
  title: 'simple select',
  options: 'this,that,,the other',
  value: 'not an option!'
})

const captionsSelect = tosiSelect({
  showIcon: true,
  title: 'has captions',
  class: 'captions',
  value: 'image'
})

const iconsSelect = tosiSelect({
  showIcon: true,
  title: 'combo select with icons',
  class: 'icons',
  editable: true,
  placeholder: 'pick an icon'
})

const iconsOnly = tosiSelect({
  showIcon: true,
  hideCaption: true,
  title: 'icons only',
  class: 'icons-only',
  placeholder: 'pick an icon'
})

preview.append(
  simpleSelect,
  document.createElement('br'),
  captionsSelect,
  document.createElement('br'),
  iconsSelect,
  document.createElement('br'),
  iconsOnly
)

captionsSelect.options = [
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

## Form Integration

`<tosi-select>` is form-associated, meaning it works directly in native `<form>` elements:

```html
<form>
  <tosi-select name="choice" options="a,b,c" required></tosi-select>
  <button type="submit">Submit</button>
</form>
```

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

A `<tosi-select>` can be assigned `options` as a string of comma-delimited choices,
or be provided a `SelectOptions` array (which allows for submenus, separators, etc.).

## Attributes

`<tosi-select>` supports several attributes:

- `editable` lets the user directly edit the value (like a "combo box").
- `show-icon` displays the icon corresponding to the currently selected value.
- `hide-caption` hides the caption.
- `placeholder` allows you to set a placeholder.
- `options` allows you to assign options as a comma-delimited string attribute.
- `required` marks the field as required for form validation.
- `name` the form field name (for formAssociated support).

## Events

Picking an option triggers an `action` event (whether or not this changes the value).

Changing the value, either by typing in an editable `<tosi-select>` or picking a new
value triggers a `change` event.

You can look at the console to see the events triggered by the second example.

## Localization

`<tosi-select>` supports the `localized` attribute which automatically localizes
options.

```js
const { tosiSelect } = tosijsui

preview.append(
  tosiSelect({
    localized: true,
    placeholder: 'localized placeholder',
    options: 'yes,no,,moderate'
  })
)
```
*/

import {
  Component,
  ElementCreator,
  PartsMap,
  elements,
  vars,
  throttle,
  deprecated,
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

export class TosiSelect extends Component<SelectParts> {
  static formAssociated = true

  static initAttributes = {
    editable: false,
    placeholder: '',
    showIcon: false,
    hideCaption: false,
    localized: false,
    disabled: false,
    required: false,
    name: '',
  }

  options: string | SelectOptions = ''
  private _value = ''
  filter = ''
  private isExpanded = false

  get value(): string {
    return this._value
  }

  set value(v: string) {
    this._value = v
    this.updateFormValue()
    this.queueRender()
  }

  private updateFormValue() {
    this.internals?.setFormValue(this._value || null)
    this.updateValidity()
  }

  private updateValidity() {
    if (!this.internals) return
    if (this.required && !this._value) {
      this.internals.setValidity(
        { valueMissing: true },
        'Please select an option',
        this.parts.button as HTMLElement
      )
    } else {
      this.internals.setValidity({})
    }
  }

  // Form-associated lifecycle callbacks
  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled
  }

  formResetCallback() {
    this.value = ''
  }

  formStateRestoreCallback(state: string | null) {
    if (state !== null) {
      this.value = state
    }
  }

  private setValue = (value: string, triggerAction = false) => {
    if (this._value !== value) {
      this.value = value
    }
    if (triggerAction) {
      this.dispatchEvent(new Event('action'))
    }
  }

  private getValue = () => this._value

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

  poppedOptions: MenuItem[] = []

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
    if (this._value !== String(newValue)) {
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
    this.isExpanded = true
    this.updateAriaExpanded()
    popMenu({
      target: this,
      menuItems: this.poppedOptions,
      showChecked: true,
      role: 'listbox',
      onClose: () => {
        this.isExpanded = false
        this.updateAriaExpanded()
      },
    })
  }

  private updateAriaExpanded() {
    const { value } = this.parts
    value.setAttribute('aria-expanded', String(this.isExpanded))
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
        value: this._value,
        tabindex: 0,
        role: 'combobox',
        ariaHaspopup: 'listbox',
        ariaExpanded: 'false',
        ariaAutocomplete: this.editable ? 'list' : 'none',
        onKeydown: this.handleKey,
        onInput: this.filterMenu,
        onChange: this.handleChange,
      }),
      icons.chevronDown()
    ),
  ]

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
    const found = this.allOptions.find((option) => option.value === this._value)
    return found || { caption: this._value, value: this._value }
  }

  localeChanged = () => {
    this.queueRender()
  }

  connectedCallback() {
    super.connectedCallback()

    if (this.localized) {
      XinLocalized.allInstances.add(this)
    }

    // Initialize form value
    this.updateFormValue()
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

/** @deprecated Use TosiSelect instead */
export const XinSelect = TosiSelect

export const tosiSelect = TosiSelect.elementCreator({
  tag: 'tosi-select',
  styleSpec: {
    ':host': {
      // New --tosi-select-* variables with defaults deriving from base theme
      '--tosi-select-gap': 'var(--tosi-spacing-sm, 8px)',
      '--tosi-select-touch-size': 'var(--tosi-touch-size, 44px)',
      '--tosi-select-padding': '0 var(--tosi-spacing-sm, 8px)',
      '--tosi-select-value-padding': '0 var(--tosi-spacing-sm, 8px)',
      '--tosi-select-icon-width': '24px',
      '--tosi-select-field-width': '140px',
      // Legacy aliases for backward compatibility
      '--gap': 'var(--tosi-select-gap)',
      '--touch-size': 'var(--tosi-select-touch-size)',
      '--padding': 'var(--tosi-select-padding)',
      '--value-padding': 'var(--tosi-select-value-padding)',
      '--icon-width': 'var(--tosi-select-icon-width)',
      '--fieldWidth': 'var(--tosi-select-field-width)',
      display: 'inline-flex',
      position: 'relative',
    },
    ':host button': {
      display: 'flex',
      alignItems: 'center',
      justifyItems: 'center',
      gap: vars.tosiSelectGap,
      textAlign: 'left',
      height: vars.tosiSelectTouchSize,
      padding: vars.tosiSelectPadding,
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
      width: vars.tosiSelectFieldWidth,
      padding: vars.tosiSelectValuePadding,
      height: vars.tosiSelectTouchSize,
      lineHeight: vars.tosiSelectTouchSize,
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
}) as ElementCreator<TosiSelect>

/** @deprecated Use tosiSelect instead (tag is now tosi-select) */
export const xinSelect = deprecated(
  (...args: Parameters<typeof tosiSelect>) => tosiSelect(...args),
  'xinSelect is deprecated, use tosiSelect instead (tag is now <tosi-select>)'
) as ElementCreator<TosiSelect>
