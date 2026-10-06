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
```test
const rating = preview.querySelector('tosi-rating')
test('rating renders', () => {
  expect(rating).toBeTruthy()
  expect(rating.tagName.toLowerCase()).toBe('tosi-rating')
})
test('rating has correct value', () => {
  expect(rating.value).toBe(3.4)
})
test('rating has correct max', () => {
  expect(rating.max).toBe(5)
})
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
- `rating-stroke` (#e81 by default) is the stroke of the filled (active) icons
- `rating-fill` (#f91 by default) is the fill of the filled (active) icons
- `empty-stroke` (#ccc by default) is the stroke of the empty icons
- `empty-fill` (#ccc by default) is the fill of the empty icons (ignored when `hollow`)
- `readonly` (false by default) prevents the user from changing the rating
- `hollow` (false by default) makes the empty rating icons hollow (outline only).
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
