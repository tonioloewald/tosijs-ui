/*#
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
*/
import { elements, withAttributes } from 'tosijs';
import { ensureGrammar, highlight } from './doc-system/highlight.js';
import { ensureHighlightStyles } from './doc-system/highlight-styles.js';
const { pre, code } = elements;
export class HighlightBlock extends withAttributes({
    /** Fence-style language name — `js`, `ts`, `rust`, `bash`, … */
    language: '',
}) {
    static preferredTagName = 'tosi-highlight';
    _value = '';
    /** `lang\0source` of the last DOM write — see the idempotence note in `render`. */
    _rendered = '';
    get value() {
        return this._value;
    }
    set value(text) {
        if (text === this._value)
            return;
        this._value = text;
        this.queueRender();
    }
    /*
    Light DOM: token colours must be reachable from the page's stylesheet. A shadow root would
    isolate them and force every consumer to re-declare the palette — see the doc block above.
    */
    static lightStyleSpec = {
        'tosi-highlight': { display: 'block' },
    };
    content = () => [pre({ part: 'pre' }, code({ part: 'code' }))];
    render() {
        super.render();
        /*
        First use, not import time — the same rule as `ensureMenu` / `ensureTooltipStyles`. A bare
        `import 'tosijs-ui/highlight-block'` must not write to the document; an element that is
        actually on the page is a different matter. Deduped by StyleSheet id, so this is free.
        */
        ensureHighlightStyles();
        const codeEl = this.parts.code;
        const lang = this.language.toLowerCase();
        const source = this._value;
        /*
        IDEMPOTENT: do nothing when nothing changed.
    
        `render()` runs more than once per value — hydration, attribute changes, whatever else
        queues one — and an unconditional `textContent = source` wipes the token markup an earlier
        grammar callback had applied. The symptom is maddening and gives you nothing to grep for:
        the grammar loads, the highlight applies, and a render moments later erases it, so the
        block is plain and no error was raised. It looked like the async callback never ran.
        */
        if (this._rendered === `${lang}\u0000${source}`)
            return;
        this._rendered = `${lang}\u0000${source}`;
        codeEl.className = lang ? `language-${lang}` : '';
        codeEl.textContent = source;
        if (!lang || !source)
            return;
        /*
        Plain text goes in synchronously above, then the grammar upgrades it.
    
        A reader never sees an empty box while Prism is fetched, and if the grammar never arrives
        that plain text is the final state rather than a failure.
    
        Staleness is guarded by comparing the SOURCE, not by a render counter. A counter was the
        first attempt and it deadlocked: every render bumped it, so a render arriving while the
        grammar was in flight invalidated the callback, and with renders arriving steadily nothing
        ever applied — the grammar loaded and nothing happened, with no error to find. Comparing
        the value asks the question that actually matters ("is this still the code on screen?"),
        is idempotent, and cannot be starved.
        */
        void ensureGrammar(lang)
            .then((ok) => {
            if (!ok)
                return;
            // Superseded — the value changed while the grammar loaded.
            if (this._value !== source)
                return;
            const html = highlight(source, lang);
            if (html === null)
                return;
            // Re-read the part: a render between request and resolution can replace it, and
            // writing into the old one paints a detached node.
            const el = this.parts.code;
            if (el.textContent !== source)
                return;
            el.innerHTML = html;
            el.setAttribute('data-highlighted', '');
        })
            .catch((err) => {
            /*
            A missing grammar is NOT an error — `ensureGrammar` returns false for that and the
            block stays readable. Reaching here means something actually broke, and swallowing it
            is how "the grammar loaded and nothing happened" becomes unbudgeted debugging.
            */
            console.warn(`<tosi-highlight>: highlighting "${lang}" failed`, err);
        });
    }
}
export const tosiHighlight = HighlightBlock.elementCreator();
