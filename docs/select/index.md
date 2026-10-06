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
```test
const selects = preview.querySelectorAll('tosi-select')
test('selects render', () => {
  expect(selects.length).toBe(4)
})
test('simple select has value', () => {
  expect(selects[0].value).toBe('not an option!')
})
test('captions select has value', () => {
  expect(selects[1].value).toBe('image')
})
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
      shortcut?: string
    }

    export interface SelectOptionSubmenu {
      icon?: string | HTMLElement
      caption: string
      options: SelectOptions
    }

    export type SelectOptions = Array<string | null | SelectOption | SelectOptionSubmenu>

A `<tosi-select>` can be assigned `options` as a string of comma-delimited choices
in the format `value=caption:icon` (where caption and icon are optional),
or be provided a `SelectOptions` array (which allows for submenus, separators, etc.).

An option's `shortcut` (menu syntax, e.g. `'ctrl-1'` or `'meta-shift-p'`) is shown in the popup
and picks that option from the keyboard, even while the popup is closed. A pick by shortcut sets
`value` and dispatches `change` exactly as a click does. A disabled select ignores its shortcuts.

Examples:
- `"apple,banana,cherry"` - simple values (value equals caption)
- `"us=United States,uk=United Kingdom"` - value with caption
- `"us=United States:flag,uk=United Kingdom:flag"` - value with caption and icon

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
