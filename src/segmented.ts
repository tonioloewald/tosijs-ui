/*#
# segmented select

This is a fairly general-purpose segmented select control.

```js
const { tosiSegmented } = tosijsui

preview.append(
  tosiSegmented({
    value: 'yes',
    choices: 'yes, no, don\'t care',
    textContent: 'Should we?'
  }),

  document.createElement('br'),

  tosiSegmented({
    localized: true,
    title: 'do you like?',
    choices: 'yes=Yes:thumbsUp, no=No:thumbsDown'
  }),

  document.createElement('br'),

  tosiSegmented({
    style: '--segmented-direction: column; --segmented-align-items: stretch',
    choices: 'in a relationship, single',
    other: 'it\'s complicated…',
    placeholder: 'oooh… please elaborate',
    value: 'separated',
    textContent: 'Relationship Status'
  }),

  document.createElement('br'),

  tosiSegmented({
    multiple: true,
    style: `
      --segmented-direction: column;
      --segmented-align-items: start;
      --segmented-option-grid-columns: 24px 24px 100px;
      --segmented-input-visibility: visible;
    `,
    choices: 'star=Star:star, game=Game:game, bug=Bug:bug, camera=Camera:camera',
    value: 'star,bug',
    textContent: 'Pick all that apply'
  })
)

function logEvent(event) {
  const { target } = event
  if (target.matches('tosi-segmented')) {
    console.log((target.textContent || target.title).trim(), target.value)
  }
}
preview.addEventListener('change', logEvent, true)
```
```css
.preview {
  --segmented-option-current-background: var(--brand-color);
  --segmented-option-current-color: var(--brand-text-color);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
```

> Check the console to see the values being set.

## Form Integration

`<tosi-segmented>` is form-associated, meaning it works directly in native `<form>` elements:

```html
<form>
  <tosi-segmented name="choice" choices="a,b,c" required></tosi-segmented>
  <button type="submit">Submit</button>
</form>
```

## Properties

- `values` is an array of values (only really useful if `multiple` is set to true)

You can set `choices` programmatically to an array of `Choice` objects:

    interface Choice {
      icon?: string | SVGElement
      value: string
      caption: string
    }

## Attributes

- `choices` is a string of comma-delimited options of the form `value=caption:icon`,
  where caption and icon are optional
- `multiple` allows multiple selection
- `name` the form field name (for formAssociated support)
- `other` (default '', meaning other is not allowed) is the caption for other options, allowing
  the user to input their choice. It will be reset to '' if `multiple` is set.
- `placeholder` is the placeholder displayed in the `<input>` field for **other** responses
- `localized` automatically localizes captions
- `required` marks the field as required for form validation

## Styling

The following CSS variables can be used to control customize the `<tosi-segmented>` component.

    --segmented-align-items
    --segmented-direction
    --segmented-option-color
    --segmented-option-current-background
    --segmented-option-current-color
    --segmented-option-font
    --segmented-option-gap
    --segmented-option-grid-columns
    --segmented-option-icon-color
    --segmented-option-padding
    --segmented-options-background
    --segmented-options-border-radius
    --segmented-placeholder-opacity
*/

import {
  Component as WebComponent,
  ElementCreator,
  elements,
  varDefault,
  deprecated,
} from 'tosijs'
import { icons } from './icons'
import { xinLocalized } from './localize'

const { div, slot, label, span, input } = elements

interface Choice {
  icon?: string | SVGElement
  value: string
  caption: string
}

interface SegmentParts {
  [key: string]: HTMLElement
  custom: HTMLInputElement
  options: HTMLElement
}

export class TosiSegmented extends WebComponent {
  static formAssociated = true

  static initAttributes = {
    direction: 'row',
    other: '',
    multiple: false,
    name: '',
    placeholder: 'Please specify…',
    localized: false,
    required: false,
  }

  choices: string | Choice[] = ''
  private _value: null | string = null

  get value(): null | string {
    return this._value
  }

  set value(v: null | string) {
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
        this.parts.options as HTMLElement
      )
    } else {
      this.internals.setValidity({})
    }
  }

  // Form-associated lifecycle callbacks
  formDisabledCallback(disabled: boolean) {
    // Could add disabled support here
    void disabled
  }

  formResetCallback() {
    this.value = null
  }

  formStateRestoreCallback(state: string | null) {
    if (state !== null) {
      this.value = state
    }
  }

  get values(): string[] {
    return (this._value || '')
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v !== '')
  }

  content = () => [
    slot(),
    div({ part: 'options' }, input({ part: 'custom', hidden: true })),
  ]

  static styleSpec = {
    ':host': {
      display: 'inline-flex',
      gap: varDefault.segmentedOptionGap('8px'),
      alignItems: varDefault.segmentedAlignItems('center'),
    },
    ':host, :host::part(options)': {
      flexDirection: varDefault.segmentedDirection('row'),
    },
    ':host label': {
      display: 'inline-grid',
      alignItems: 'center',
      gap: varDefault.segmentedOptionGap('8px'),
      gridTemplateColumns:
        varDefault.segmentedOptionGridColumns('0px 24px 1fr'),
      padding: varDefault.segmentedOptionPadding('4px 12px'),
      font: varDefault.segmentedOptionFont('16px'),
    },
    ':host label:focus': {
      outline: 'none',
      boxShadow: varDefault.segmentedFocusShadow(
        `inset 0 0 0 2px ${varDefault.segmentedOptionCurrentBackground('#44a')}`
      ),
      borderRadius: varDefault.segmentedOptionsBorderRadius('8px'),
    },
    ':host label:has(:checked)': {
      color: varDefault.segmentedOptionCurrentColor('#eee'),
      background: varDefault.segmentedOptionCurrentBackground('#44a'),
    },
    ':host label:has(:checked):focus': {
      boxShadow: varDefault.segmentedCurrentFocusShadow(
        `inset 0 0 0 2px ${varDefault.segmentedOptionCurrentColor('#eee')}`
      ),
    },
    ':host svg': {
      height: varDefault.segmentOptionIconSize('16px'),
      stroke: varDefault.segmentedOptionIconColor('currentColor'),
    },
    ':host label.no-icon': {
      gap: 0,
      gridTemplateColumns: varDefault.segmentedOptionGridColumns('0px 1fr'),
    },
    ':host input[type="radio"], :host input[type="checkbox"]': {
      visibility: varDefault.segmentedInputVisibility('hidden'),
    },
    ':host::part(options)': {
      display: 'flex',
      borderRadius: varDefault.segmentedOptionsBorderRadius('8px'),
      background: varDefault.segmentedOptionsBackground('#fff'),
      color: varDefault.segmentedOptionColor('#222'),
      overflow: 'hidden',
      alignItems: varDefault.segmentedOptionAlignItems('stretch'),
    },
    ':host::part(custom)': {
      padding: varDefault.segmentedOptionPadding('4px 12px'),
      color: varDefault.segmentedOptionCurrentColor('#eee'),
      background: varDefault.segmentedOptionCurrentBackground('#44a'),
      font: varDefault.segmentedOptionFont('16px'),
      border: '0',
      outline: 'none',
    },
    ':host::part(custom)::placeholder': {
      color: varDefault.segmentedOptionCurrentColor('#eee'),
      opacity: varDefault.segmentedPlaceholderOpacity(0.75),
    },
  }

  private valueChanged = false
  handleChange = () => {
    const { options, custom } = this.parts as SegmentParts
    if (this.multiple) {
      const inputs = [
        ...options.querySelectorAll('input:checked'),
      ] as HTMLInputElement[]
      this.value = inputs.map((input) => input.value).join(',')
    } else {
      const input = options.querySelector(
        'input:checked'
      ) as HTMLInputElement | null
      if (!input) {
        this.value = null
      } else if (input.value) {
        custom.setAttribute('hidden', '')
        this.value = input.value
      } else {
        custom.removeAttribute('hidden')
        custom.focus()
        custom.select()
        this.value = custom.value
      }
    }
    this.valueChanged = true
  }

  handleKey = (event: KeyboardEvent) => {
    let blockEvent = false
    switch (event.code) {
      case 'Space':
        if (event.target instanceof HTMLLabelElement) {
          event.target.click()
          blockEvent = true
        }
        break
      case 'Tab':
        if (!(event.target instanceof HTMLLabelElement)) {
          const label = (event.target as HTMLElement).closest(
            'label'
          ) as HTMLLabelElement
          label.focus()
        }
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        {
          const label = (event.target as HTMLElement).closest(
            'label'
          ) as HTMLLabelElement
          if (label.previousElementSibling instanceof HTMLLabelElement) {
            label.previousElementSibling.focus!()
          }
        }
        blockEvent = true
        break
      case 'ArrowRight':
      case 'ArrowDown':
        {
          const label = (event.target as HTMLElement).closest(
            'label'
          ) as HTMLLabelElement
          if (label.nextElementSibling instanceof HTMLLabelElement) {
            label.nextElementSibling.focus!()
          }
        }
        blockEvent = true
        break
    }
    if (blockEvent) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  connectedCallback(): void {
    super.connectedCallback()
    const { options } = this.parts

    if (this.name === '') {
      this.name = this.instanceId
    }

    options.addEventListener('change', this.handleChange)
    options.addEventListener('keydown', this.handleKey as EventListener)

    if (this.other && this.multiple) {
      console.warn(
        this,
        'is set to [other] and [multiple]; [other] will be ignored'
      )
      this.other = ''
    }

    // Initialize form value
    this.updateFormValue()
  }

  private get _choices(): Choice[] {
    const options: Choice[] = Array.isArray(this.choices)
      ? this.choices
      : this.choices
          .split(',')
          .filter((c) => c.trim() !== '')
          .map((c) => {
            const [value, remains] = c.split('=').map((v) => v.trim())
            const [caption, iconName] = (remains || value)
              .split(':')
              .map((v) => v.trim())

            const icon = iconName ? icons[iconName]() : ''
            const choice = { value, icon, caption }
            return choice
          })

    if (this.other && !this.multiple) {
      const [caption, icon] = this.other.split(':')
      options.push({
        value: '',
        caption,
        icon,
      })
    }

    return options
  }

  get isOtherValue(): boolean {
    return Boolean(
      this._value === '' ||
        (this._value &&
          !this._choices.find((choice) => choice.value === this._value))
    )
  }

  render() {
    super.render()

    if (this.valueChanged) {
      this.valueChanged = false
      return
    }

    const { options, custom } = this.parts as SegmentParts
    options.textContent = ''
    const type = this.multiple ? 'checkbox' : 'radio'
    const { values, isOtherValue } = this
    options.append(
      ...this._choices.map((choice) => {
        return label(
          { tabindex: 0 },
          input({
            type,
            name: this.name,
            value: choice.value,
            checked:
              values.includes(choice.value) ||
              (choice.value === '' && isOtherValue),
            tabIndex: -1,
          }),
          choice.icon || { class: 'no-icon' },
          this.localized ? xinLocalized(choice.caption) : span(choice.caption)
        )
      })
    )
    if (this.other && !this.multiple) {
      custom.hidden = !isOtherValue
      custom.value = isOtherValue ? (this._value as string) : ''
      custom.placeholder = this.placeholder
      options.append(custom)
    }
  }
}

/** @deprecated Use TosiSegmented instead */
export const XinSegmented = TosiSegmented

export const tosiSegmented = TosiSegmented.elementCreator({
  tag: 'tosi-segmented',
}) as ElementCreator<TosiSegmented>

/** @deprecated Use tosiSegmented instead (tag is now tosi-segmented) */
export const xinSegmented = deprecated(
  (...args: Parameters<typeof tosiSegmented>) => tosiSegmented(...args),
  'xinSegmented is deprecated, use tosiSegmented instead (tag is now <tosi-segmented>)'
) as ElementCreator<TosiSegmented>
