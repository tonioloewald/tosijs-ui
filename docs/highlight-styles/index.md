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
