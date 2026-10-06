# color input field

This is a color input field that supports opacity

```js
const colorInput = preview.querySelector('tosi-color')
const circle = preview.querySelector('div')

colorInput.addEventListener('change', () => {
  circle.style.background = colorInput.value
})
```
```html
<tosi-color value="red"></tosi-color>
<div
  style="
    width: 200px;
    height: 200px;
    background: red;
    border-radius: 100px;
  "
></div>
```


<tosi-css-var-editor element-selector="tosi-color"></tosi-css-var-editor>
