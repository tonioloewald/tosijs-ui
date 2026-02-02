/*#
# segmented select

This is a fairly general-purpose segmented select control.

```html
<div class="grid">
<xin-segmented value="yes" choices="yes, no, don't care">
  Should we?
</xin-segmented>

<div>
  <b>Localized!</b><br>
  <xin-segmented
    localized
    title="do you like?"
    choices="yes=Yes:thumbsUp, no=No:thumbsDown"
  ></xin-segmented>
</div>

<xin-segmented
  style="--segmented-direction: column; --segmented-align-items: stretch"
  choices="in a relationship, single" other="it's complicated…"
  placeholder="oooh… please elaborate"
  value="separated"
>
  Relationship Status
</xin-segmented>

<xin-segmented
  multiple
  style="
    --segmented-direction: column;
    --segmented-align-items: start;
    --segmented-option-grid-columns: 24px 24px 100px;
    --segmented-input-visibility: visible;
  "
  choices="star=Star:star, game=Game:game, bug=Bug:bug, camera=Camera:camera"
  value="star,bug"
>
  Pick all that apply
</xin-segmented>
</div>
```
```css
.preview .grid {
  --segmented-option-current-background: var(--brand-color);
  --segmented-option-current-color: var(--brand-text-color);
  padding: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
```
```js
function logEvent(event) {
  const { target } = event
  if (target.tagName === 'XIN-SEGMENTED') {
    console.log((target.textContent || target.title).trim(), target.value)
  }
}
preview.addEventListener('change', logEvent, true)
```

> Check the console to see the values being set.

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
- `name` allows you to set the name of the `<input>` elements to a specific value, it will default
  to the component's `instanceId`
- `other` (default '', meaning other is not allowed) is the caption for other options, allowing
  the user to input their choice. It will be reset to '' if `multiple` is set.
- `placeholder` is the placeholder displayed in the `<input>` field for **other** responses
- `localized` automatically localizes captions

## Styling

The following CSS variables can be used to control customize the `<xin-segmented>` component.

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
}

export class XinSegmented extends WebComponent {
  static initAttributes = {
    direction: 'row',
    other: '',
    multiple: false,
    name: '',
    placeholder: 'Please specify…',
    localized: false,
  }

  choices: string | Choice[] = ''
  value: null | string = null

  get values(): string[] {
    return (this.value || '')
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
      this.value === '' ||
        (this.value &&
          !this._choices.find((choice) => choice.value === this.value))
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
      custom.value = isOtherValue ? (this.value as string) : ''
      custom.placeholder = this.placeholder
      options.append(custom)
    }
  }
}

export const xinSegmented = XinSegmented.elementCreator({
  tag: 'xin-segmented',
}) as ElementCreator<XinSegmented>
