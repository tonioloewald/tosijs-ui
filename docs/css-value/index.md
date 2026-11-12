# css value

`<tosi-css-value>` edits one CSS value of a given `kind` (`color`, `length`, `number`, `text`)
as what it IS rather than only what it comes to: a colour typed in, another variable, that
variable lightened or turned, a mix of two, the text colour that reads on it, a length scaled
from another, or any expression. Each form is written as plain CSS (`var()`, `calc()`,
`color-mix()`, relative colour syntax), so the browser keeps computing it: change the colour
it was made from and it follows.

**Auto** (an empty value) means "not set": the element shows what the value `computed` to, and
editing anything picks a form. Set `no-auto` where a value must be given.

```js
import { tosiCssValue } from 'tosijs-ui'

const variables = [
  { name: 'brand-color', label: 'Brand', kind: 'color' },
  { name: 'background', label: 'Background', kind: 'color' },
  { name: 'tosi-radius', label: 'Corners', kind: 'length' },
]
const output = document.createElement('code')
const show = (event) => (output.textContent = event.target.value || '(auto)')
preview.append(
  tosiCssValue({
    kind: 'color',
    value: 'oklch(from var(--brand-color) calc(l + 0.1) c h)',
    variables,
    onChange: show,
  }),
  tosiCssValue({
    kind: 'length',
    value: 'calc(var(--tosi-radius) * 2)',
    variables,
    onChange: show,
  }),
  output
)
```
```css
.preview {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
}
.preview tosi-css-value {
  width: 280px;
}
```
```test
test('a form round-trips, and changing it writes CSS', async () => {
  const [color, length] = preview.querySelectorAll('tosi-css-value')
  while (!color.shadowRoot?.querySelector('[data-key="lightness"]')) {
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }
  const form = color.shadowRoot.querySelector('[part="form"]')
  expect(form.value).toBe('adjust')
  const lightness = color.shadowRoot.querySelector('[data-key="lightness"]')
  expect(lightness.value).toBe('10')
  lightness.value = '-20'
  lightness.dispatchEvent(new Event('change', { bubbles: true }))
  expect(color.value).toBe('oklch(from var(--brand-color) calc(l - 0.2) c h)')
  expect(length.shadowRoot.querySelector('[data-key="factor"]').value).toBe('2')
})
```

Its value is a string, its `change` event says the value changed, and `variables` lists what a
form may refer to (`{ name, label?, kind }`, names without the dashes). The relative-colour
forms (Adjust, Text on) appear only where the browser supports relative colour syntax.
