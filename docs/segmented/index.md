# segmented select

This is a fairly general-purpose segmented select control.

```html
<div class="grid">
  <tosi-segmented value="yes" choices="yes, no, don't care">
    Should we?
  </tosi-segmented>

  <div>
    <b>Localized!</b><br>
    <tosi-segmented
      localized
      title="do you like?"
      choices="yes=Yes:thumbsUp, no=No:thumbsDown"
    ></tosi-segmented>
  </div>

  <tosi-segmented
    style="--segmented-direction: column; --segmented-align-items: stretch"
    choices="in a relationship, single"
    other="it's complicated..."
    placeholder="please elaborate"
    value="separated"
  >
    Relationship Status
  </tosi-segmented>

  <tosi-segmented
    multiple
    style="--segmented-direction: column; --segmented-align-items: start; --segmented-option-grid-columns: 24px 24px 100px; --segmented-input-visibility: visible;"
    choices="star=Star:star, game=Game:game, bug=Bug:bug, camera=Camera:camera"
    value="star,bug"
  >
    Pick all that apply
  </tosi-segmented>
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
  if (target.matches('tosi-segmented')) {
    console.log((target.textContent || target.title).trim(), target.value)
  }
}
preview.addEventListener('change', logEvent, true)
```
```test
const segmented = preview.querySelectorAll('tosi-segmented')
test('segmented controls render', () => {
  expect(segmented.length).toBe(4)
})
test('first segmented has value "yes"', () => {
  expect(segmented[0].value).toBe('yes')
})
test('multiple segmented has array value', () => {
  expect(segmented[3].value).toBe('star,bug')
})
```

> Check the console to see the values being set.

## Form Integration

`<tosi-segmented>` is form-associated, meaning it works directly in native `<form>` elements:

```html
<form class="segmented-form">
  <tosi-segmented name="choice" choices="a,b,c" required></tosi-segmented>
  <button type="submit">Submit</button>
  <span class="output"></span>
</form>
```
```js
const form = preview.querySelector('.segmented-form')
form.addEventListener('submit', (e) => {
  e.preventDefault()
  const data = new FormData(form)
  form.querySelector('.output').textContent = 'Submitted: ' + data.get('choice')
})
```

## Properties

- `values` is an array of values (only really useful if `multiple` is set to true)

You can set `choices` programmatically to an array of `Choice` objects:

    interface Choice {
      icon?: string | IconElement
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
