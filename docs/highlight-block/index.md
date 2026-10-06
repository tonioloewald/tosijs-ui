# highlight-block

`<tosi-highlight>` pretty-prints a static code sample. It is **not** an editor — for that
use [`<tosi-code>`](/code-editor/), which wraps CodeMirror and weighs accordingly.

Use this when code arrives at runtime: a fetched snippet, a generated example, an API
response, a chat message. If the code is in your markdown, you do not need this at all —
`tosijs-ui/site` highlights static fences **at build time**, so the tokens are already in the
pre-rendered HTML, the ePub and the printed page, where a runtime component could never
reach them.

```html
<tosi-highlight language="rust" style="display:block"></tosi-highlight>
```
```js
const block = preview.querySelector('tosi-highlight')
block.value = `fn main() {
    let greeting = "hello";
    println!("{}", greeting);
}`
```

Set `value` (the source) and `language` (a fence-style name — `js`, `ts`, `rust`, `python`,
`bash`, `yaml`, …). Grammars load on demand, so a page pays only for the languages it shows,
and an unknown language renders as plain, readable code rather than failing.

## Styling

**Colours work out of the box, anywhere.** The element injects its token palette on first use,
so a `<tosi-highlight>` on an ordinary page is coloured without importing anything.

That was not always true, and the way it failed is worth knowing if you are debugging
something similar: this package ships **no CSS files at all** — every style is a `StyleSheet()`
call — and the palette used to live inside the doc-system stylesheet. So a standalone element
produced perfectly correct `<span class="token …">` markup rendering in flat black, and this
very paragraph told you to "import the doc-system CSS", which was not an import that existed.

There are **two palettes** — a light set (the default) and a dark set under `.darkmode` — each
contrast-checked against the `--code-bg` it actually sits on. Not one recomputed from the
other: a light-mode default derived from dark-mode literals is unreadable, which is how this
shipped failing WCAG AA on every token type.

Every colour is a `varDefault`, so retheme one token type without touching the rest:

```css
:root { --token-keyword: rebeccapurple; }
```

The spec is also exported, if you want it somewhere this element is not:
`import { highlightStyleSpec, ensureHighlightStyles } from 'tosijs-ui/doc-system/highlight-styles'`.

This element renders in the LIGHT DOM deliberately: token styling has to be reachable from a
page stylesheet, and a shadow root would make every consumer re-declare the palette.
