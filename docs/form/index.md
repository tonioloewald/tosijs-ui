# forms

`<tosi-form>` and `<tosi-field>` can be used to quickly create forms complete with
[client-side validation](https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation#built-in_form_validation_examples).

```js
const form = preview.querySelector('tosi-form')
preview.querySelector('.submit').addEventListener('click', form.submit)
```
```html
<tosi-form value='{"formInitializer": "initial value from form"}'>
  <h3 slot="header">Example Form Header</h3>
  <tosi-field caption="Required field" key="required"></tosi-field>
  <tosi-field optional key="optional"><i>Optional</i> Field</tosi-field>
  <tosi-field key="text" type="text" placeholder="type it in here">Tell us a long story</tosi-field>
  <tosi-field caption="Zip Code" placeholder="12345 or 12345-6789" key="zipcode" pattern="\d{5}(-\d{4})?"></tosi-field>
  <tosi-field caption="Date" key="date" type="date"></tosi-field>
  <tosi-field caption="Number" key="number" type="number"></tosi-field>
  <tosi-field caption="Range" key="range" type="range" min="0" max="10"></tosi-field>
  <tosi-field key="boolean" type="checkbox">😃 <b>Agreed?!</b></tosi-field>
  <tosi-field key="color" type="color" value="pink">
    favorite color
  </tosi-field>
  <tosi-field key="select">
    Custom Field
    <select slot="input">
      <option>This</option>
      <option>That</option>
      <option>The Other</option>
    </select>
  </tosi-field>
  <tosi-field key="tags">
    Tag List
    <tosi-tag-list editable slot="input" available-tags="pick me,no pick me"></tosi-tag-list>
  </tosi-field>
  <tosi-field key="rating">
    Rate this form!
    <tosi-rating slot="input"></tosi-rating>
  </tosi-field>
  <tosi-field key="like">
    Do you like it?
    <tosi-segmented
      choices="yes=Yes:thumbsUp,no=No:thumbsDown"
      slot="input"
    ></tosi-segmented>
  </tosi-field>
  <tosi-field key="relationship">
    Relationship Status
    <tosi-segmented
      style="--segmented-direction: column; --segmented-align-items: stretch"
      choices="couple=In a relationship,single=Single"
      other="It's complicated…"
      slot="input"
    ></tosi-segmented>
  </tosi-field>
  <tosi-field key="amount" fixed-precision="2" type="number" prefix="$" suffix="(USD)">
    What's it worth?
  </tosi-field>
  <tosi-field key="valueInitializer" value="initial value from field">
    Initialized by field
  </tosi-field>
  <tosi-field key="formInitializer">
    Initialized by form
  </tosi-field>
  <button slot="footer" class="submit">Submit</button>
</tosi-form>
```
```css
.preview tosi-form {
  height: 100%;
}

.preview ::part(header), .preview ::part(footer) {
  background: var(--inset-bg);
  justify-content: center;
  padding: calc(var(--spacing) * 0.5) var(--spacing);
}

.preview h3, .preview h4 {
  margin: 0;
  padding: 0;
}

.preview ::part(content) {
  padding: var(--spacing);
  gap: var(--spacing);
  background: var(--background);
}

.preview label {
  display: grid;
  grid-template-columns: 180px auto 100px;
  gap: var(--spacing);
}

.preview label [part="caption"] {
  text-align: right;
}

.preview label:has(:invalid:required)::after {
  content: '* required'
}

@media (max-width: 500px) {
  .preview label [part="caption"] {
    text-align: center;
  }

  .preview label {
    display: flex;
    flex-direction: column;
    position: relative;
    align-items: stretch;
    gap: calc(var(--spacing) * 0.5);
  }

  .preview label:has(:invalid:required)::after {
    position: absolute;
    top: 0;
    right: 0;
    content: '*'
  }

  .preview tosi-field [part="field"],
  .preview tosi-field [part="input"] > * {
    display: flex;
    justify-content: center;
  }
}

.preview :invalid {
  box-shadow: inset 0 0 0 2px #F008;
}
```

## `<tosi-form>`

`<tosi-form>` prevents the default form behavior when a `submit` event is triggered and instead validates the
form contents (generating feedback if desired) and calls its `submitCallback(value: {[key: string]: any}, isValid: boolean): void`
method.

`<tosi-form>` offers a `fields` proxy that allows values stored in the form to be updated. Any changes will trigger a `change`
event on the `<tosi-form>` (in addition to any events fired by form fields).

`<tosi-form>` instances have `value` and `isValid` properties you can access any time. Note that `isValid` is computed
and triggers form validation.

`<tosi-form>` has `header` and `footer` `<slot>`s in addition to default `<slot>`, which is tucked inside a `<form>` element.

## `<tosi-field>`

`<tosi-field>` is a simple web-component with no shadowDOM that combines an `<input>` field wrapped with a `<label>`. Any
content of the custom-element will become the `caption` or you can simply set the `caption` attribute.

You can replace the default `<input>` field by adding an element to the slot `input` (it's a `tosiSlot`) whereupon
the `value` of that element will be used instead of the built-in `<input>`. (The `<input>` is retained and
is used to drive form-validation.)

`<tosi-field>` supports the following attributes:

- `caption` labels the field
- `key` determines the form property the field will populate
- `type` determines the data-type: '' | 'checkbox' | 'number' | 'range' | 'date' | 'text' | 'color'
- `optional` turns off the `required` attribute (fields are required by default)
- `pattern` is an (optional) regex pattern
- `placeholder` is an (optional) placeholder

The `text` type populates the `input` slot with a `<textarea>` element.

The `color` type populates the `input` slot with a `<tosi-color>` element (and thus supports colors with alpha values).

<tosi-css-var-editor element-selector="tosi-field" target-selector=".preview"></tosi-css-var-editor>

## Native Form Integration

The following components support native form integration via `formAssociated`:

- `<tosi-rating>` - star ratings
- `<tosi-select>` - custom select dropdowns
- `<tosi-segmented>` - segmented button groups
- `<tosi-tag-list>` - tag selection lists

These components can be used directly in a standard `<form>` element with full support for:
- Form submission (values included in FormData)
- Form reset
- Required field validation
- The `:invalid` and `:valid` CSS pseudo-classes

```html
<form id="native-form" class="native-form">
  <label>
    <span>Rate our service (required):</span>
    <tosi-rating name="rating" required min="1"></tosi-rating>
  </label>

  <label>
    <span>Select your country:</span>
    <tosi-select name="country" required placeholder="-- Select --"
      options="us=United States:flag,uk=United Kingdom:flag,ca=Canada:flag,au=Australia:flag"
    ></tosi-select>
  </label>

  <label>
    <span>Subscription tier:</span>
    <tosi-segmented
      name="tier"
      required
      choices="free=Free,pro=Pro:star,enterprise=Enterprise:tosi"
    ></tosi-segmented>
  </label>

  <label>
    <span>Interests (select at least one):</span>
    <tosi-tag-list
      name="interests"
      required
      editable
      available-tags="Technology,Sports,Music,Art,Travel,Food"
    ></tosi-tag-list>
  </label>

  <div class="buttons">
    <button type="submit">Submit</button>
    <button type="reset">Reset</button>
  </div>
</form>
```
```css
.preview .native-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  overflow: auto;
  height: 100%;
}

.preview .native-form label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview .native-form .buttons {
  display: flex;
  gap: 8px;
}

.preview tosi-rating:invalid,
.preview tosi-select:invalid,
.preview tosi-segmented:invalid,
.preview tosi-tag-list:invalid {
  outline: 2px solid #f008;
  outline-offset: 2px;
}

.preview tosi-rating:valid,
.preview tosi-select:valid,
.preview tosi-segmented:valid,
.preview tosi-tag-list:valid {
  outline: 2px solid #0a08;
  outline-offset: 2px;
}
```
```js
const { TosiDialog } = tosijsui
const form = preview.querySelector('#native-form')

form.addEventListener('submit', (e) => {
  e.preventDefault()
  const formData = new FormData(form)
  const data = Object.fromEntries(formData.entries())
  TosiDialog.alert(JSON.stringify(data, null, 2), 'Form Submitted')
})

form.addEventListener('reset', () => {
  TosiDialog.alert('Form has been reset', 'Reset')
})
```

## Using formAssociated Components with tosi-form

While the formAssociated components work with native `<form>` elements, using them with `<tosi-form>`
provides additional benefits:

- **No submit prevention boilerplate** - `tosi-form` automatically prevents the default form submission
- **JSON state management** - Initialize and access form state as a JavaScript object via `value` and `fields`
- **Validation feedback** - Built-in `isValid` property and `submitCallback` with validation status
- **Change events** - Unified change events on the form element

Since these components now support `formAssociated`, they participate directly in form submission
and validation without needing the hidden input workaround that `tosi-field` uses.

```html
<tosi-form id="tosi-form" value='{"rating": 3, "tier": "pro"}'>
  <h4 slot="header">tosi-form with formAssociated Components</h4>

  <label class="form-row">
    <span>Service Rating:</span>
    <tosi-rating name="rating" required min="1"></tosi-rating>
  </label>

  <label class="form-row">
    <span>Country:</span>
    <tosi-select name="country" required placeholder="-- Select --"
      options="us=United States:flag,uk=United Kingdom:flag,ca=Canada:flag"
    ></tosi-select>
  </label>

  <label class="form-row">
    <span>Subscription:</span>
    <tosi-segmented
      name="tier"
      required
      choices="free=Free,pro=Pro:star,enterprise=Enterprise:tosi"
    ></tosi-segmented>
  </label>

  <label class="form-row">
    <span>Interests:</span>
    <tosi-tag-list
      name="interests"
      required
      editable
      available-tags="Tech,Sports,Music,Art"
    ></tosi-tag-list>
  </label>

  <div slot="footer" style="display: flex; gap: 8px;">
    <button class="submit-btn">Submit</button>
    <button class="reset-btn">Reset</button>
    <button class="set-values-btn">Set Values</button>
  </div>
</tosi-form>
```
```css
.preview #tosi-form {
  height: auto;
}

.preview #tosi-form .form-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 8px;
  align-items: center;
}

.preview #tosi-form .form-row > span {
  text-align: right;
}

.preview #tosi-form ::part(content) {
  padding: 16px;
  gap: 12px;
}

.preview #tosi-form ::part(header) {
  padding: 8px 16px;
}

.preview #tosi-form ::part(footer) {
  padding: 8px 16px;
}
```
```js
const { TosiDialog } = tosijsui
const tosiForm = preview.querySelector('#tosi-form')

// Set up submit callback
tosiForm.submitCallback = (value, isValid) => {
  const title = isValid ? 'Form Submitted (Valid)' : 'Form Submitted (Invalid)'
  TosiDialog.alert(JSON.stringify(value, null, 2), title)
}

preview.querySelector('.submit-btn').addEventListener('click', () => {
  tosiForm.submit()
})

preview.querySelector('.reset-btn').addEventListener('click', () => {
  tosiForm.value = {}
  tosiForm.querySelectorAll('tosi-rating, tosi-select, tosi-segmented, tosi-tag-list').forEach(el => {
    el.value = el.tagName === 'TOSI-TAG-LIST' ? [] : null
  })
  TosiDialog.alert('Form has been reset', 'Reset')
})

preview.querySelector('.set-values-btn').addEventListener('click', () => {
  // Demonstrate programmatic value setting
  const rating = tosiForm.querySelector('tosi-rating')
  const select = tosiForm.querySelector('tosi-select')
  const segmented = tosiForm.querySelector('tosi-segmented')
  const tagList = tosiForm.querySelector('tosi-tag-list')

  rating.value = 5
  select.value = 'uk'
  segmented.value = 'enterprise'
  tagList.value = ['Tech', 'Music']

  TosiDialog.alert('Values set programmatically:\n\nRating: 5\nCountry: uk\nTier: enterprise\nInterests: Tech, Music', 'Values Set')
})
```
