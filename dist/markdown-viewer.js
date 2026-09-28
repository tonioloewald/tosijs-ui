import { xin, withAttributes } from 'tosijs';
import { marked } from 'marked';
import { sanitizeInPlace, isSafeNavigationUrl } from 'tosijs-kilpi';
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
trust by name with the `allowedElements` property, e.g. `el.allowedElements = ['tosi-icon']`.

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
*/
/*{ "parent": "Components" }*/
function populate(basePath, source) {
    if (source == null) {
        source = '';
    }
    else if (typeof source !== 'string') {
        source = String(source);
    }
    return source.replace(/\{\{([^}]+)\}\}/g, (original, prop) => {
        const value = xin[`${basePath}${prop.startsWith('[') ? prop : '.' + prop}`];
        return value === undefined ? original : populate(basePath, String(value));
    });
}
export class TosiMd extends withAttributes({
    src: '',
    elements: false,
    // 'on' (the default since 1.16, #179) | 'off' to render raw HTML from markdown you control.
    sanitize: '',
}) {
    static preferredTagName = 'tosi-md';
    context = {};
    /**
     * Custom elements (tag names with a hyphen) that sanitized markdown may create, e.g.
     * `['tosi-icon']`. Empty by default: every other custom element is unwrapped, because a
     * component can run code or render raw HTML of its own. Irrelevant with `sanitize="off"`.
     */
    allowedElements = [];
    value = '';
    content = null;
    options = {};
    connectedCallback() {
        super.connectedCallback();
        if (this.src !== '') {
            ;
            (async () => {
                const request = await fetch(this.src);
                this.value = await request.text();
            })();
        }
        else if (this.value === '') {
            if (this.elements) {
                this.value = this.innerHTML;
            }
            else {
                this.value = this.textContent != null ? this.textContent : '';
            }
        }
    }
    /** The effective setting: sanitized unless the element explicitly says `sanitize="off"`. */
    get #sanitizeMode() {
        return String(this.sanitize).trim().toLowerCase() === 'off' ? 'off' : 'on';
    }
    #show(html) {
        const mode = this.#sanitizeMode;
        if (mode === 'off') {
            this.innerHTML = html;
            return;
        }
        /*
        Parsed into an inert <template>, NOT into the element: assigning innerHTML to a live
        element starts image loads, so an `<img onerror>` would fire before any cleanup ran.
        */
        const template = document.createElement('template');
        template.innerHTML = html;
        sanitizeInPlace(template.content);
        /*
        Custom elements are code, not markup (B1, 1.16.0 review). kilpi keeps unknown elements by
        design, so untrusted markdown could instantiate ANY registered component, and some execute
        or inject their own content: a nested `<tosi-md sanitize="off">` rendered its text as raw
        HTML; `<tosi-example>` runs its code. Rather than denylist the ones we know about, a custom
        element is unwrapped (its already-sanitized content kept, the element dropped) unless the
        host names it in `allowedElements`. `is="…"` is the other way to make an element a
        component, so it goes too.
        */
        const allowed = new Set(this.allowedElements.map((tag) => tag.toLowerCase()));
        for (const el of [...template.content.querySelectorAll('*')]) {
            el.removeAttribute('is');
            if (el.localName.includes('-') && !allowed.has(el.localName)) {
                el.replaceWith(...el.childNodes);
            }
        }
        /*
        kilpi's URL check admits raster `data:image/*` (fine for an <img src>); a link must never
        carry a data: URL, so hold every href to the navigation rule. What virta did (#179).
        */
        for (const el of template.content.querySelectorAll('[href]')) {
            if (!isSafeNavigationUrl(el.getAttribute('href') || '')) {
                el.removeAttribute('href');
            }
        }
        this.replaceChildren(template.content);
    }
    didRender = () => {
        /* do not care */
    };
    render() {
        super.render();
        xin[this.instanceId] =
            typeof this.context === 'string' ? JSON.parse(this.context) : this.context;
        const source = populate(this.instanceId, this.value);
        if (this.elements) {
            const chunks = source
                .split('\n')
                .reduce((chunks, line) => {
                if (line.startsWith('<') || chunks.length === 0) {
                    chunks.push(line);
                }
                else {
                    const lastChunk = chunks[chunks.length - 1];
                    if (!lastChunk.startsWith('<') || !lastChunk.endsWith('>')) {
                        chunks[chunks.length - 1] += '\n' + line;
                    }
                    else {
                        chunks.push(line);
                    }
                }
                return chunks;
            }, []);
            this.#show(chunks
                .map((chunk) => chunk.startsWith('<') && chunk.endsWith('>')
                ? chunk
                : marked(chunk, this.options))
                .join(''));
        }
        else {
            this.#show(marked(source, this.options));
        }
        this.didRender();
    }
}
/** @deprecated Use TosiMd instead */
export const MarkdownViewer = TosiMd;
export const tosiMd = TosiMd.elementCreator();
/** @deprecated Use tosiMd instead */
export const markdownViewer = tosiMd;
/** @deprecated Use tosiMd instead */
export const xinMd = tosiMd;
