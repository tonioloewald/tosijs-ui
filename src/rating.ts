/*#
# rating

`TosiRating` / `<tosi-rating>` provides a drop-in replacement for an `<input>`
that renders a rating using icons.

```js
const { tosiRating } = tosijsui
preview.append(
  tosiRating({ value: 3.4 }),
  tosiRating({ min: 0, value: 3.4, step: 0.5, hollow: true }),
  tosiRating({ value: 3.4, ratingFill: 'deepskyblue', ratingStroke: 'deepskyblue' }),
  tosiRating({ value: 3.1, max: 10, ratingFill: 'hotpink', ratingStroke: 'hotpink', icon: 'heart', iconSize: 32 }),
  tosiRating({ class: 'color', value: 3.1, max: 5, icon: 'tosiPlatform', iconSize: 32 }),
)
```
```css
.preview {
  display: flex;
  flex-direction: column;
}

.preview .color::part(empty) {
  filter: grayscale(1);
  opacity: 0.25;
}
```

## Attributes

- `icon-size` (24 by default) determines the height of the control and along with `max` its width
- `max` maximum rating
- `min` (1 by default) can be 0 or 1 (allowing ratings of 0 to max or 1 to max)
- `step` (0.5 by default) granularity of rating
- `icon` ('star' by default) determines the icon used
- `rating-stroke` (#f91 by default) is the stroke of rating icons
- `rating-fill` (#e81 by default) is the color of rating icons
- `empty-stroke` (none by default) is the color of background icons
- `empty-fill` (#ccc by default) is the color of background icons
- `readonly` (false by default) prevents the user from changing the rating
- `hollow` (false by default) makes the empty rating icons hollow.
- `required` (false by default) marks the field as required for form validation
- `name` the form field name (for formAssociated support)

## Form Integration

`<tosi-rating>` is form-associated, meaning it works directly in native `<form>` elements:

```html
<form>
  <tosi-rating name="rating" required></tosi-rating>
  <button type="submit">Submit</button>
</form>
```

## Keyboard

`<tosi-rating>` should be fully keyboard navigable (and, I hope, accessible).

The up key increases the rating, down descreases it. This is the same
as the behavior of `<input type="number">`, [Shoelace's rating widget](https://shoelace.style/components/rating/),
and (in my opinion) common sense, but  not like [MUI's rating widget](https://mui.com/material-ui/react-rating/).
*/

import {
  Component,
  elements,
  ElementCreator,
  PartsMap,
  deprecated,
} from 'tosijs'
import { icons } from './icons'

const { span } = elements

interface RatingParts extends PartsMap {
  empty: HTMLElement
  filled: HTMLElement
  container: HTMLElement
}

export class TosiRating extends Component {
  static formAssociated = true

  static initAttributes = {
    max: 5,
    min: 1 as 0 | 1,
    icon: 'star',
    step: 1,
    ratingStroke: '#e81',
    ratingFill: '#f91',
    emptyStroke: 'none',
    emptyFill: '#ccc',
    readonly: false,
    iconSize: 24,
    hollow: false,
    required: false,
    name: '',
  }

  private _value: number | null = null
  private _internals: ElementInternals

  get value(): number | null {
    return this._value
  }

  set value(v: number | null) {
    this._value = v
    this.updateFormValue()
    this.queueRender()
  }

  constructor() {
    super()
    // attachInternals may not be available in test environments (happy-dom)
    if (this.attachInternals) {
      this._internals = this.attachInternals()
    }
  }

  private updateFormValue() {
    if (this._value !== null) {
      this._internals?.setFormValue(String(this._value))
    } else {
      this._internals?.setFormValue(null)
    }
    this.updateValidity()
  }

  private updateValidity() {
    if (!this._internals) return
    if (this.required && this._value === null) {
      this._internals.setValidity(
        { valueMissing: true },
        'Please provide a rating',
        this.parts.container as HTMLElement
      )
    } else {
      this._internals.setValidity({})
    }
  }

  // Form-associated lifecycle callbacks
  formAssociatedCallback(form: HTMLFormElement | null) {
    // Called when associated with a form
  }

  formDisabledCallback(disabled: boolean) {
    this.readonly = disabled
  }

  formResetCallback() {
    this.value = null
  }

  formStateRestoreCallback(state: string | null) {
    if (state !== null) {
      this.value = Number(state)
    }
  }

  static styleSpec = {
    ':host': {
      display: 'inline-block',
      position: 'relative',
      width: 'fit-content',
    },
    ':host::part(container)': {
      position: 'relative',
      display: 'inline-block',
    },
    ':host::part(empty), :host::part(filled)': {
      height: '100%',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
    },
    ':host::part(empty)': {
      pointerEvents: 'none',
    },
    ':host::part(filled)': {
      position: 'absolute',
      left: 0,
    },
    ':host svg': {
      transform: 'scale(0.9)',
      pointerEvents: 'all !important',
      transition: '0.25s ease-in-out',
    },
    ':host svg:hover': {
      transform: 'scale(1)',
    },
    ':host svg:active': {
      transform: 'scale(1.1)',
    },
  }

  content = () =>
    span(
      { part: 'container' },
      span({ part: 'empty' }),
      span({ part: 'filled' })
    )

  displayValue(value: number | null) {
    const { empty, filled } = this.parts as RatingParts
    const roundedValue = Math.round((value || 0) / this.step) * this.step
    filled.style.width = (roundedValue / this.max) * empty.offsetWidth + 'px'
  }

  update = (event: Event) => {
    if (this.readonly) {
      return
    }

    const { empty } = this.parts as RatingParts

    const x =
      event instanceof MouseEvent
        ? event.pageX - empty.getBoundingClientRect().x
        : 0
    const value = Math.min(
      Math.max(
        this.min,
        Math.round(
          ((x / empty.offsetWidth) * this.max) / this.step + this.step * 0.5
        ) * this.step
      ),
      this.max
    )
    if (event.type === 'click') {
      this.value = value
    } else if (event.type === 'mousemove') {
      this.displayValue(value)
    } else {
      this.displayValue(this._value || 0)
    }
  }

  handleKey = (event: KeyboardEvent) => {
    let value = Number(this._value)
    if (value == null) {
      value = Math.round((this.min + this.max) * 0.5 * this.step) * this.step
    }
    let blockEvent = false
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        value += this.step
        blockEvent = true
        break
      case 'ArrowDown':
      case 'ArrowLeft':
        value -= this.step
        blockEvent = true
        break
    }
    this.value = Math.max(Math.min(value, this.max), this.min)
    if (blockEvent) {
      event.stopPropagation()
      event.preventDefault()
    }
  }

  connectedCallback() {
    super.connectedCallback()

    const { container } = this.parts as RatingParts

    container.tabIndex = 0
    container.addEventListener('mousemove', this.update, true)
    container.addEventListener('mouseleave', this.update)
    container.addEventListener('blur', this.update)
    container.addEventListener('click', this.update)

    container.addEventListener('keydown', this.handleKey)

    // Initialize form value
    this.updateFormValue()
  }

  private _renderedIcon = ''

  render() {
    super.render()

    const height = this.iconSize + 'px'
    this.style.setProperty('--tosi-icon-size', height)

    if (this.readonly) {
      this.role = 'image'
    } else {
      this.role = 'slider'
    }
    this.ariaLabel = `rating ${this._value} out of ${this.max}`
    this.ariaValueMax = String(this.max)
    this.ariaValueMin = String(this.min)
    this.ariaValueNow = this._value === null ? String(-1) : String(this._value)

    const { empty, filled } = this.parts as RatingParts
    empty.classList.toggle('hollow', this.hollow)

    // Set icon colors on the containers so CSS variables cascade to SVGs
    empty.style.setProperty('--tosi-icon-fill', this.emptyFill)
    empty.style.setProperty('--tosi-icon-stroke', this.emptyStroke)
    filled.style.setProperty('--tosi-icon-fill', this.ratingFill)
    filled.style.setProperty('--tosi-icon-stroke', this.ratingStroke)

    if (this._renderedIcon !== this.icon) {
      this._renderedIcon = this.icon
      for (let i = 0; i < this.max; i++) {
        empty.append(icons[this.icon]())
        filled.append(icons[this.icon]())
      }
    }

    this.displayValue(this._value)
  }
}

/** @deprecated Use TosiRating instead */
export const XinRating = TosiRating

export const tosiRating = TosiRating.elementCreator({
  tag: 'tosi-rating',
}) as ElementCreator<TosiRating>

/** @deprecated Use tosiRating instead (tag is now tosi-rating) */
export const xinRating = deprecated(
  (...args: Parameters<typeof tosiRating>) => tosiRating(...args),
  'xinRating is deprecated, use tosiRating instead (tag is now <tosi-rating>)'
) as ElementCreator<TosiRating>
