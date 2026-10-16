# highlight-styles

The syntax-highlighting token palette, on its own. The package ships no CSS files (every
style is a `StyleSheet()` call), so this is how token colours reach a page.

[`<tosi-highlight>`](/highlight-block/) injects it on first use, so that needs nothing.
Import it directly only if you are highlighting markup you produced some other way:

```typescript
import { ensureHighlightStyles } from 'tosijs-ui/doc-system/highlight-styles'

ensureHighlightStyles()
```

Every colour is a `varDefault`, so retheme any single token type — in either mode —
by setting its variable:

```css:static
:root { --token-keyword: rebeccapurple; }
```

Two palettes: a light default and a dark set under `.darkmode`, each meeting WCAG AA
(4.5:1) against its own background. Light on `#fdfdfd` is at worst **5.32:1** (comment); dark
on `#020202` at worst **6.01:1** (punctuation). Tests check both.
