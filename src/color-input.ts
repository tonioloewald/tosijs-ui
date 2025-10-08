/*#

# color input field

This is a color input field that supports opacity

```js
const colorInput = preview.querySelector('xin-color')
const circle = preview.querySelector('div')

colorInput.addEventListener('change', () => {
  circle.style.background = colorInput.value
})
```
```html
<xin-color value="red"></xin-color>
<div
  style="
    width: 200px;
    height: 200px;
    background: red;
    border-radius: 100px;
  "
></div>
```


<xin-css-var-editor element-selector="xin-color"></xin-css-var-editor>
*/

import {
  Component,
  ElementCreator,
  elements,
  Color,
  vars,
  PartsMap,
} from 'xinjs'

const { input } = elements

const defaultColor = Color.fromCss('#8888')

interface ColorParts extends PartsMap {
  rgb: HTMLInputElement
  alpha: HTMLInputElement
  css: HTMLInputElement
}

class ColorInput extends Component<ColorParts> {
  value = defaultColor.rgba
  color = defaultColor

  static styleSpec = {
    ':host': {
      _gap: 8,
      _swatchSize: 32,
      _cssWidth: 72,
      _alphaWidth: 72,
      display: 'inline-flex',
      gap: vars.gap,
      alignItems: 'center',
    },
    ':host input[type="color"]': {
      border: 0,
      width: vars.swatchSize,
      height: vars.swatchSize,
      background: 'transparent',
    },
    ':host::part(alpha)': {
      width: vars.alphaWidth,
    },
    ':host::part(css)': {
      width: vars.cssWidth,
      fontFamily: 'monospace',
    },
  }

  content = [
    input({ title: 'base color', type: 'color', part: 'rgb' }),
    input({
      type: 'range',
      title: 'opacity',
      part: 'alpha',
      min: 0,
      max: 1,
      step: 0.05,
    }),
    input({ title: 'css color spec', part: 'css' }),
  ]

  private valueChanged = false
  update = (event: Event) => {
    const { rgb, alpha, css } = this.parts
    if (event.type === 'input') {
      this.color = Color.fromCss(rgb.value)
      this.color.a = Number(alpha.value)
      css.value = this.color.html
    } else {
      this.color = Color.fromCss(css.value)
      rgb.value = this.color.html.substring(0, 7)
      alpha.value = String(this.color.a)
    }
    rgb.style.opacity = String(this.color.a)
    this.value = this.color.rgba
    this.valueChanged = true
  }

  connectedCallback() {
    super.connectedCallback()

    const { rgb, alpha, css } = this.parts
    rgb.addEventListener('input', this.update)
    alpha.addEventListener('input', this.update)
    css.addEventListener('change', this.update)
  }

  render() {
    if (this.valueChanged) {
      this.valueChanged = false
      return
    }
    const { rgb, alpha, css } = this.parts
    this.color = Color.fromCss(this.value)

    rgb.value = this.color.html.substring(0, 7)
    rgb.style.opacity = String(this.color.a)
    alpha.value = String(this.color.a)
    css.value = this.color.html
  }
}

export const colorInput = ColorInput.elementCreator({
  tag: 'xin-color',
}) as ElementCreator<ColorInput>
