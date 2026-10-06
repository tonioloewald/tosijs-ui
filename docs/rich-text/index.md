# rich text

`<tosi-rich-text>` is a simple and easily extensible `document.execCommand` WYSIWYG editor with some conveniences.
The class name is `RichText` and the ElementCreator is `tosiRichText`.

### `default` widgets

```html
<tosi-rich-text>
<h3>Heading</h3>
<p>And some <b>text</b></p>
</tosi-rich-text>
```
```css
tosi-rich-text {
  background: white;
}

tosi-rich-text [part="toolbar"] {
  background: #f8f8f8;
}

tosi-rich-text [part="doc"] {
  padding: 20px;
}
```

### `minimal` widgets

```html
<tosi-rich-text widgets="minimal">
<h3>Heading</h3>
<p>And some <b>text</b></p>
</tosi-rich-text>
```
```css
tosi-rich-text {
  background: white;
}

tosi-rich-text [part="toolbar"] {
  background: #f8f8f8;
}

tosi-rich-text [part="doc"] {
  padding: 20px;
}
```

By default, `<tosi-rich-text>` treats its initial contents as its document, but you can also set (and get)
its `value`.

## toolbar

`<tosi-rich-text>` elements have a `toolbar` slot (actually a tosi-slot because it doesn't use
the shadowDOM).

If you set the `widgets` attribute to `default` or `minimal` you will get a toolbar
for free. Or you can add your own custom widgets.

## helper functions

A number of helper functions are available, including:

- `commandButton(title: string, command: string, iconClass: string)`
- `blockStyle(options: Array<{caption: string, tagType: string}>)`
- `spacer(width = '10px')`
- `elastic(width = '10px')`

These each create a toolbar widget. A `blockStyle`-generated `<select>` element will
automatically have its value changed based on the current selection.

## properties

A `<tosi-rich-text>` element also has `selectedText` and `selectedBlocks` properties, allowing
you to easily perform operations on text selections, and a `selectionChange` callback (which
simply passes through document `selectionchange` events, but also passes a reference to
the `<tosi-rich-text>` component).

## Form Integration

`<tosi-rich-text>` is form-associated, making it work directly in native forms:

```html
<form class="richtext-form">
  <label>
    <b>Compose message (required):</b>
    <tosi-rich-text name="content" widgets="minimal" required style="height: 150px">
    </tosi-rich-text>
  </label>
  <button type="submit">Submit</button>
  <button type="reset">Reset</button>
  <pre class="output" style="max-height: 100px; overflow: auto"></pre>
</form>
```
```css
.preview .richtext-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.preview .richtext-form label {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.preview tosi-rich-text {
  background: white;
}
.preview tosi-rich-text [part="toolbar"] {
  background: #f8f8f8;
}
```
```js
const form = preview.querySelector('.richtext-form')
form.addEventListener('submit', (e) => {
  e.preventDefault()
  const data = new FormData(form)
  form.querySelector('.output').textContent = 'Content: ' + data.get('content')
})
```
