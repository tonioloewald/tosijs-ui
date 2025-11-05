import { Component, ElementCreator, xin } from 'tosijs'
import { marked, MarkedOptions } from 'marked'

/*#
# markdown

`<xin-md>` renders markdown using [marked](https://www.npmjs.com/package/marked).

`<xin-md>` renders [markdown](https://www.markdownguide.org/) anywhere, either using the
`src` attribute to load the file asynchronously, or rendering the text inside it.

```html
<xin-md>
## hello
world

![favicon](/favicon.svg)

| this  | is   | a     | table |
|-------|------|-------|-------|
| one   | two  | three | four  |
| five  | six  | seven | eight |
</xin-md>
```
```css
xin-md {
  display: block;
  padding: var(--spacing);
}
```

Note that, by default, `<xin-md>` will use its `textContent` (not its `innerHTML`) as its source.

## rendering markdown from a url

Again, like an `<img>` tag, you can simply set a `<xin-md>`'s `src` attribute to a URL pointing
to markdown source and it will load it asynchronously and render it.

```
<xin-md src="/path/to/file.md">
```

## setting its `value`

Or, just set the element's `value` and it will render it for you. You can try
this in the console, e.g.

```
$('.preview xin-md').value = 'testing\n\n## this is a test'
```

## elements

`<xin-md>` also (optionally) allows the embedding of inline HTML elements without blocking markdown
rendering, so that you can embed specific elements while retaining markdown. You need to explicitly set
the `elements` property, and for markdown rendering not to be blocked, the html elements need to
start on a new line and not be indented. E.g.

```html
<xin-md elements>
<form>
### this is a form
<label>
fill in this field.
**It's important!**
<input>
</label>
</form>
</xin-md>
```

In this case `<xin-md>` uses its `innerHTML` and not its `textContent`.

## context and template variables

`<xin-md>` also supports **template** values. You need to provide data to the element in the form
of `context` (an arbitrary object, or a JSON string), and then embed the template text using
handlebars-style doubled curly braces, e.g. `{{path.to.value}}`.

If no value is found, the original text is passed through.

Finally, note that template substitution occurs *before* markdown transformation, which means you can
pass context data through to HTML elements.

```html
<xin-md
  elements
  context='{"title": "template example", "foo": {"bar": 17}, "nested": "*work*: {{foo.bar}}"}'
>
## {{title}}

The magic number is <input type="number" value={{foo.bar}}>

Oh, and nested templates {{nested}}.
</xin-md>
```
*/

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

export class MarkdownViewer extends Component {
  src = ''
  value = ''
  content = null
  elements = false
  context: { [key: string]: any } = {}
  options = {} as MarkedOptions

  constructor() {
    super()
    this.initAttributes('src', 'elements', 'context')
  }
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
      this.innerHTML = chunks
        .map((chunk) =>
          chunk.startsWith('<') && chunk.endsWith('>')
            ? chunk
            : marked(chunk, this.options)
        )
        .join('')
    } else {
      this.innerHTML = marked(source, this.options) as string
    }
    this.didRender()
  }
}

export const markdownViewer = MarkdownViewer.elementCreator({
  tag: 'xin-md',
}) as ElementCreator<MarkdownViewer>
