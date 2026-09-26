import { Component, ElementCreator, xin, withAttributes } from 'tosijs'
import { marked, MarkedOptions } from 'marked'
import { sanitizeInPlace, isSafeNavigationUrl } from 'tosijs-kilpi'

/*#
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

## `sanitize` — set it

Markdown can contain raw HTML, and `<tosi-md>` renders whatever the markdown produces. If you
show text **you did not write** (issue bodies, comments, anything from a user or an API),
unsanitized rendering is a stored XSS: `<img src=x onerror=…>` or a `javascript:` link runs
in your page.

- `sanitize="on"` strips executable content with [kilpi](https://www.npmjs.com/package/tosijs-kilpi):
  event-handler attributes, unsafe URL schemes, and any link that is not safe to navigate to.
  It **removes these elements together with everything inside them**: `script`, `style`,
  `iframe`, `object`, `embed`, `form`, `link`, `meta`, `base`, `noscript`, `template`, and SVG
  animation elements. Everything else survives, including inputs and custom elements.
- `sanitize="off"` renders the HTML as-is. Use it only for markdown you control.

**Leaving `sanitize` unset renders unsanitized and logs a one-time warning: in tosijs-ui 1.16
the default becomes `on`.** Set it explicitly now, either way, and the upgrade changes nothing
for you.

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
*/

/*{ "parent": "Components" }*/

function populate(basePath: string, source?: any): string {
  if (source == null) {
    source = ''
  } else if (typeof source !== 'string') {
    source = String(source)
  }
  return source.replace(
    /\{\{([^}]+)\}\}/g,
    (original: string, prop: string) => {
      const value = (xin as any)[
        `${basePath}${prop.startsWith('[') ? prop : '.' + prop}`
      ]
      return value === undefined ? original : populate(basePath, String(value))
    }
  )
}

export class TosiMd extends withAttributes({
  src: '',
  elements: false,
  // 'on' | 'off'. Unset renders unsanitized and warns once, until 1.16 makes 'on' the default.
  sanitize: '',
}) {
  static preferredTagName = 'tosi-md'

  /**
  Whether the unsanitized-render warning has been shown on this page. It is shown once per page,
  not per element — fifty `<tosi-md>` would otherwise log fifty identical lines.
  */
  static warnedUnsanitized = false

  context: { [key: string]: any } = {}
  value = ''
  content = null
  options = {} as MarkedOptions
  connectedCallback(): void {
    super.connectedCallback()
    if (this.src !== '') {
      ;(async () => {
        const request = await fetch(this.src)
        this.value = await request.text()
      })()
    } else if (this.value === '') {
      if (this.elements) {
        this.value = this.innerHTML
      } else {
        this.value = this.textContent != null ? this.textContent : ''
      }
    }
  }
  /** The effective setting. A bare `<tosi-md sanitize>` means on. */
  get #sanitizeMode(): 'on' | 'off' | 'unset' {
    const mode = String(this.sanitize).trim().toLowerCase()
    if (mode === 'on' || (mode === '' && this.hasAttribute('sanitize'))) {
      return 'on'
    }
    return mode === 'off' ? 'off' : 'unset'
  }

  #show(html: string) {
    const mode = this.#sanitizeMode
    if (mode !== 'on') {
      if (mode === 'unset' && !TosiMd.warnedUnsanitized) {
        TosiMd.warnedUnsanitized = true
        console.warn(
          '<tosi-md> is rendering markdown WITHOUT sanitizing it. In tosijs-ui 1.16 sanitize ' +
            'becomes the default. Set sanitize="on" for any text you did not write, or ' +
            'sanitize="off" to keep raw HTML and silence this warning. (tosijs-ui#179)'
        )
      }
      this.innerHTML = html
      return
    }
    /*
    Parsed into an inert <template>, NOT into the element: assigning innerHTML to a live
    element starts image loads, so an `<img onerror>` would fire before any cleanup ran.
    */
    const template = document.createElement('template')
    template.innerHTML = html
    sanitizeInPlace(template.content)
    /*
    kilpi's URL check admits raster `data:image/*` (fine for an <img src>); a link must never
    carry a data: URL, so hold every href to the navigation rule. What virta did (#179).
    */
    for (const el of template.content.querySelectorAll('[href]')) {
      if (!isSafeNavigationUrl(el.getAttribute('href') || '')) {
        el.removeAttribute('href')
      }
    }
    this.replaceChildren(template.content)
  }

  didRender: (() => void) | (() => Promise<void>) = (): void => {
    /* do not care */
  }
  render() {
    super.render()

    xin[this.instanceId] =
      typeof this.context === 'string' ? JSON.parse(this.context) : this.context

    const source = populate(this.instanceId, this.value)
    if (this.elements) {
      const chunks = source
        .split('\n')
        .reduce((chunks: string[], line: string) => {
          if (line.startsWith('<') || chunks.length === 0) {
            chunks.push(line)
          } else {
            const lastChunk = chunks[chunks.length - 1]
            if (!lastChunk.startsWith('<') || !lastChunk.endsWith('>')) {
              chunks[chunks.length - 1] += '\n' + line
            } else {
              chunks.push(line)
            }
          }
          return chunks
        }, [] as string[])
      this.#show(
        chunks
          .map((chunk) =>
            chunk.startsWith('<') && chunk.endsWith('>')
              ? chunk
              : marked(chunk, this.options)
          )
          .join('')
      )
    } else {
      this.#show(marked(source, this.options) as string)
    }
    this.didRender()
  }
}

/** @deprecated Use TosiMd instead */
export type MarkdownViewer = TosiMd
/** @deprecated Use TosiMd instead */
export const MarkdownViewer: typeof TosiMd = TosiMd

export const tosiMd = TosiMd.elementCreator() as ElementCreator<TosiMd>

/** @deprecated Use tosiMd instead */
export const markdownViewer = tosiMd

/** @deprecated Use tosiMd instead */
export const xinMd = tosiMd
