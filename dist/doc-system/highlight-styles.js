/*#
# highlight-styles

The syntax-highlighting token palette, on its own.

It lives here rather than inside `docSystemStyleSpec` because the package ships **no CSS
files at all** — every style is a `StyleSheet()` call — so before this existed, the only way
to get token colours was to import the whole doc-site chrome. A standalone
[`<tosi-highlight>`](/highlight-block/) on an ordinary page therefore produced perfectly
correct `<span class="token …">` markup rendering in flat black, which is the one thing that
component is for. The doc block even told you to "import the doc-system CSS", naming an
import that did not exist.

`<tosi-highlight>` now injects this itself on first use, so the standalone case needs nothing.
Import it directly only if you are highlighting markup you produced some other way:

```typescript
import { ensureHighlightStyles } from 'tosijs-ui/doc-system/highlight-styles'

ensureHighlightStyles()
```

Every colour is a `varDefault`, so retheme any single token type — in either mode —
by setting its variable:

```css
:root { --token-keyword: rebeccapurple; }
```

Two palettes, not one recomputed from the other: a light default and a dark set under
`.darkmode`. Deriving light from dark literals is how this shipped failing WCAG AA on every
token type. Measured, both directions (AA needs 4.5:1): light on `#fdfdfd` worst **5.32:1**
(comment); dark on `#020202` worst **6.01:1** (punctuation). `doc-system-styles.test.ts`
asserts both, so they are checked rather than claimed.

Dark uses DESCENDANT selectors rather than a nested `.darkmode` block, because the doc-system
spec already has one and a duplicate key loses silently to the last writer instead of merging.
*/
import { StyleSheet, varDefault } from 'tosijs';
/** The `.token.*` rules — light default plus a dark set under `.darkmode`. */
export const highlightStyleSpec = {
    '.token.comment, .token.prolog, .token.cdata': {
        fontStyle: 'italic',
        color: varDefault.tokenComment('#5c6f5c'),
    },
    '.token.punctuation': {
        color: varDefault.tokenPunctuation('#666666'),
    },
    '.token.string, .token.char, .token.attr-value, .token.regex': {
        color: varDefault.tokenString('#a03030'),
    },
    '.token.number, .token.boolean, .token.constant': {
        color: varDefault.tokenNumber('#0b7285'),
    },
    '.token.keyword, .token.important, .token.atrule': {
        color: varDefault.tokenKeyword('#0a5bb5'),
    },
    '.token.function, .token.class-name': {
        color: varDefault.tokenFunction('#7a4b00'),
    },
    '.token.operator, .token.entity, .token.url': {
        color: varDefault.tokenOperator('#444444'),
    },
    '.token.tag, .token.selector, .token.builtin': {
        color: varDefault.tokenTag('#0a6b52'),
    },
    '.token.attr-name, .token.property': {
        color: varDefault.tokenAttr('#2a5db0'),
    },
    '.token.deleted': {
        color: varDefault.tokenDeleted('#b02020'),
    },
    '.token.inserted': {
        color: varDefault.tokenInserted('#2a6b2a'),
    },
    '.token.bold': { fontWeight: 'bold' },
    '.token.italic': { fontStyle: 'italic' },
    '.darkmode .token.comment, .darkmode .token.prolog, .darkmode .token.cdata': {
        color: varDefault.tokenCommentDark('#6a9955'),
    },
    '.darkmode .token.punctuation': {
        color: varDefault.tokenPunctuationDark('#8a8a8a'),
    },
    '.darkmode .token.string, .darkmode .token.char, .darkmode .token.attr-value, .darkmode .token.regex': { color: varDefault.tokenStringDark('#ce9178') },
    '.darkmode .token.number, .darkmode .token.boolean, .darkmode .token.constant': { color: varDefault.tokenNumberDark('#b5cea8') },
    '.darkmode .token.keyword, .darkmode .token.important, .darkmode .token.atrule': { color: varDefault.tokenKeywordDark('#569cd6') },
    '.darkmode .token.function, .darkmode .token.class-name': {
        color: varDefault.tokenFunctionDark('#dcdcaa'),
    },
    '.darkmode .token.operator, .darkmode .token.entity, .darkmode .token.url': {
        color: varDefault.tokenOperatorDark('#d4d4d4'),
    },
    '.darkmode .token.tag, .darkmode .token.selector, .darkmode .token.builtin': {
        color: varDefault.tokenTagDark('#4ec9b0'),
    },
    '.darkmode .token.attr-name, .darkmode .token.property': {
        color: varDefault.tokenAttrDark('#9cdcfe'),
    },
    '.darkmode .token.deleted': {
        color: varDefault.tokenDeletedDark('#f48771'),
    },
    '.darkmode .token.inserted': {
        color: varDefault.tokenInsertedDark('#6a9955'),
    },
};
/**
 * Inject the token palette, once.
 *
 * Deduped by `StyleSheet` id, so calling it per element is free. Injected on FIRST USE rather
 * than at import, matching `ensureMenu` / `ensureTooltipStyles` — a bare
 * `import 'tosijs-ui/highlight-block'` should not write to the document.
 */
let injected = false;
export function ensureHighlightStyles() {
    /*
    The module-level flag is load-bearing — `StyleSheet` does NOT dedupe by id on its own, and
    `render()` runs many times per element. Without this, nine `<style>` elements accumulated in
    a four-test file; on a real page it is one per render, forever. Same guard as
    `ensureTooltipStyles` / `ensureMenu`, and for the same reason.
    */
    if (injected)
        return;
    injected = true;
    StyleSheet('tosi-highlight-tokens', highlightStyleSpec);
}
