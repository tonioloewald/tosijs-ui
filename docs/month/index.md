# month

This is a component for displaying a month and selecting days within that month.

If the user changes the `month` or `year` the component's `monthChanged(year, month)`
method will be called.

The current date is `[part="today"]` and can easily be targeted for styling.

```js
import { tosiMonth, postNotification } from 'tosijs-ui'

preview.append(tosiMonth({
  monthChanged(year, month) {
    postNotification({
      icon: 'calendar',
      message: `Month changed to ${year}-${month}`,
      color: 'hotpink',
      duration: 2,
    })
  }
}))
```
```css
.preview tosi-month {
  margin: 10px;
  border-radius: 5px;
  box-shadow: 0 0 0 2px hotpink;
}
```

## `selectable`

Setting `selectable` allows the user to pick individual dates. It's just a friendlier date picker.

The value of the component is an ISO date string, as per `<input type="date">`.

`week-start` defaults to `0` (Sunday). You can set it to `1` (Monday) or some other value
if you want.

> There is a proposed API to obtain the first day of the week for the user's locale from
> [Intl.Locale](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/getWeekInfo)
> but it is not yet widely supported.

```html
<tosi-month week-start=1 selectable></tosi-month>
```
```js
const month = preview.querySelector('tosi-month')
month.addEventListener('change', event => console.log('date picked', event.target.value))
```

## `range`

Setting `range` allows the user to select date ranges.

```html
<tosi-month range></tosi-month>
```
```js
const month = preview.querySelector('tosi-month')
month.addEventListener('change', event => console.log('date range', event.target.value))
```

## `multiple`

This allows the user to pick multiple individual dates

```html
<tosi-month multiple></tosi-month>
```
```js
const month = preview.querySelector('tosi-month')
month.addEventListener('change', event => console.log('multple dates', event.target.value))
```

## `readonly` and `disabled`

These prevent the user from changing the displayed month. This example is `readonly`.

```html
<tosi-month readonly value="1976-04-01"></tosi-month>
```

## Form Integration

`<tosi-month>` is form-associated, so it works directly in native forms:

```html
<form id="date-form" class="date-form">
  <label>
    <span>Select a date (required):</span>
    <tosi-month name="date" selectable required></tosi-month>
  </label>
  <div class="buttons">
    <button type="submit">Submit</button>
    <button type="reset">Reset</button>
  </div>
</form>
```
```css
.preview .date-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.preview .date-form label {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview .date-form .buttons {
  display: flex;
  gap: 8px;
}

.preview tosi-month:invalid {
  outline: 2px solid #f008;
  outline-offset: 2px;
}

.preview tosi-month:valid {
  outline: 2px solid #0a08;
  outline-offset: 2px;
}
```
```js
const { TosiDialog } = tosijsui
const form = preview.querySelector('#date-form')

form.addEventListener('submit', (e) => {
  e.preventDefault()
  const formData = new FormData(form)
  const data = Object.fromEntries(formData.entries())
  TosiDialog.alert(JSON.stringify(data, null, 2), 'Date Selected')
})

form.addEventListener('reset', () => {
  TosiDialog.alert('Form has been reset', 'Reset')
})
```
