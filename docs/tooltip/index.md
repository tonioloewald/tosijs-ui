# tooltip

Automatic tooltips for any element with `data-tooltip` or `title` attributes.
Call `initTooltips()` once to activate. By default, `title` attributes are
converted to `data-tooltip` on hover so the browser's native tooltip is
replaced.

Tooltip text is parsed as **markdown** (if `marked` is available), so you
can use `*bold*`, `` `code` ``, links, etc.

```js
import { elements } from 'tosijs'
import { initTooltips } from 'tosijs-ui'

const { button, div } = elements

initTooltips()

preview.append(
  div(
    { style: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' } },
    button({ dataTooltip: 'Save your work' }, 'Save'),
    button({ dataTooltip: '**Bold** and `code` work' }, 'Markdown'),
    button({ title: 'This was a title attribute' }, 'Title → Tooltip'),
  )
)
```

## Options

```
initTooltips({
  convertTitles: true,  // convert title attrs to data-tooltip (default true)
  delay: 250,           // ms before showing (default 250)
  localize: false,      // pass tooltip text through localize() (default false)
})
```
