# markdown

`<tosi-md>` renders markdown using [marked](https://www.npmjs.com/package/marked).

`<tosi-md>` renders [markdown](https://www.markdownguide.org/) anywhere, either using the
`src` attribute to load the file asynchronously, or rendering the text inside it.

```html
<tosi-md sanitize="on">
## hello
world

![favicon](/favicon.svg)

| this  | is   | a     | table |
|-------|------|-------|-------|
| one   | two  | three | four  |
| five  | six  | seven | eight |
</tosi-md>
```
```css
tosi-md {
  display: block;
  padding: var(--spacing);
}
```

Note that, by default, `<tosi-md>` will use its `textContent` (not its `innerHTML`) as its source.

## `sanitize` — on by default

Markdown can contain raw HTML, and `<tosi-md>` renders whatever the markdown produces. For text
**you did not write** (issue bodies, comments, anything from a user or an API), unsanitized
rendering is a stored XSS: `<img src=x onerror=…>` or a `javascript:` link runs in your page.

So `<tosi-md>` **sanitizes by default** (since 1.16) with
[kilpi](https://www.npmjs.com/package/tosijs-kilpi): event-handler attributes, unsafe URL schemes
and links that are not safe to navigate to are stripped, and these elements are **removed
together with everything inside them**: `script`, `style`, `iframe`, `object`, `embed`, `form`,
`link`, `meta`, `base`, `noscript`, `template`, and SVG animation elements. Everything else
survives, including inputs.

**Custom elements are unwrapped** when sanitizing (their content is kept, the element is not),
because a component is code: some render raw HTML or run code of their own. Allow the ones you
trust by name with the `allowed-elements` attribute (space- or comma-separated), e.g.
`<tosi-md allowed-elements="tosi-icon tosi-tag">`, or the `allowedElements` property. An allowed
element keeps whatever attributes the markdown's author gave it, so allow only display components.
`tosi-md`, `tosi-example` and `tosi-doc-system` are never allowed: they render raw HTML or run code.

`sanitize="off"` renders the HTML as-is. Use it only for markdown you control, for example
markup that embeds a `<form>` (see `elements` below).

## rendering markdown from a url

Again, like an `<img>` tag, you can simply set a `<tosi-md>`'s `src` attribute to a URL pointing
to markdown source and it will load it asynchronously and render it.

```
<tosi-md src="/path/to/file.md">
```

## setting its `value`

Or, just set the element's `value` and it will render it for you. You can try
this in the console, e.g.

```
$('.preview tosi-md').value = 'testing\n\n## this is a test'
```

## elements

`<tosi-md>` also (optionally) allows the embedding of inline HTML elements without blocking markdown
rendering, so that you can embed specific elements while retaining markdown. You need to explicitly set
the `elements` property, and for markdown rendering not to be blocked, the html elements need to
start on a new line and not be indented. E.g.

This example uses `sanitize="off"`: it is markup the page's author wrote, and `sanitize="on"`
removes a `<form>` together with everything inside it.

```html
<tosi-md elements sanitize="off">
<form>
### this is a form
<label>
fill in this field.
**It's important!**
<input>
</label>
</form>
</tosi-md>
```
```test
test('the embedded form renders, with markdown inside it', () => {
  const md = preview.querySelector('tosi-md[elements]')
  expect(md.querySelector('form input')).toBeTruthy()
  expect(md.querySelector('form h3').textContent).toBe('this is a form')
  expect(md.querySelector('form strong').textContent).toBe("It's important!")
})
```

In this case `<tosi-md>` uses its `innerHTML` and not its `textContent`.

## context and template variables

`<tosi-md>` also supports **template** values. You need to provide data to the element in the form
of `context` (an arbitrary object, or a JSON string), and then embed the template text using
handlebars-style doubled curly braces, e.g. `{{path.to.value}}`.

If no value is found, the original text is passed through.

Finally, note that template substitution occurs *before* markdown transformation, which means you can
pass context data through to HTML elements.

```html
<tosi-md
  elements
  sanitize="on"
  context='{"title": "template example", "foo": {"bar": 17}, "nested": "*work*: {{foo.bar}}"}'
>
## {{title}}

The magic number is <input type="number" value={{foo.bar}}>

Oh, and nested templates {{nested}}.
</tosi-md>
```
