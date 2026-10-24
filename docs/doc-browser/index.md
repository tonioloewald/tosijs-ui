# doc-browser

`createDocBrowser()` renders a documentation corpus as a browsable, searchable testbed with
live examples, like the [tosijs-ui documentation site](https://ui.tosijs.net). It's like
Storybook but much simpler to set up and maintain.

For a whole documentation site (static, pre-rendered pages, SEO, ePub, a dev server), use
[`tosijs-ui/site`](/adopting-the-doc-system/) instead; it builds on this component. Reach for
`createDocBrowser` directly to embed a doc browser in an app of your own.

## Quick Start

### 1. Extract the documentation

Run once at build time (it reads files, so it runs under bun or node, not in the browser):

```typescript
import { extractDocs } from 'tosijs-ui/site'

extractDocs({
  paths: ['src', 'README.md'],
  output: 'docs.json',
})
```

This collects every `.md` file and every `/*#` comment block in your sources. The format,
metadata and which code fences run are described under
[Doc format](/doc-site-system/#doc-format).

### 2. Create your doc browser

```typescript
import { createDocBrowser } from 'tosijs-ui/doc-browser'
import * as mylib from './my-library.js'
import docs from './docs.json'

const browser = createDocBrowser({
  docs,
  context: { mylib },
  projectName: 'My Project',
  projectLinks: {
    github: 'https://github.com/user/project',
    npm: 'https://www.npmjs.com/package/project',
  },
})

document.body.append(browser)
```

### 3. Add live examples to your docs

Consecutive `html`, `css`, `js` (or `ts`, `tjs`) and `test` code fences become one live,
editable example. `context` supplies the modules those examples import:

    /*#
    # My Component

    This component does amazing things!

    ```js
    import { myComponent } from 'mylib'
    preview.append(myComponent({ value: 'Hello!' }))
    ```
    ```css
    my-component {
      color: blue;
    }
    ```
    *‎/

## createDocBrowser Options

```typescript
interface DocBrowserOptions {
  docs: Doc[] // the extracted corpus
  context?: Record<string, any> // modules live examples can import
  projectName?: string // display name
  projectLinks?: ProjectLinks // links in the header
  logo?: string // header logo
  navSize?: number // nav width (default: 200)
  minSize?: number // width below which the nav goes compact (default: 600)
  routing?: 'query' | 'path' | 'memory' // see below (default: 'query')
  initialRoute?: string // memory routing: the first page
  onRouteChange?: (slug: string) => void // memory routing: page changes
  searchShortcut?: string // opens the search; '' for none (default: 'mod+k')
  navbarLinks?: LinkItem[] // icon links in the header bar
  contentElement?: HTMLElement // adopt this element as the content area
}
```

`routing` picks how pages map to URLs. `'query'` links pages as `?filename`. `'path'` uses
clean `/slug/` URLs, as the static site does. `'memory'` never touches the page's URL or
history, for a browser embedded in another page: drive it with `initialRoute`,
`onRouteChange` and the element's `navigate(slug)` method.

The search opens on Cmd-K (Ctrl-K off a Mac) anywhere on the page. A host that owns that key,
or embeds more than one browser, passes `searchShortcut: ''` (or another key in
`<tosi-palette>`'s `shortcut` form).
