/*#
# doc-browser

The `tosijs-ui` library provides everything you need to create a self-documented testbed similar
to the [tosijs-ui documentation site](https://ui.tosijs.net). It's like Storybook but much simpler
to set up and maintain.

## Quick Start

### 1. Extract Documentation

Use the CLI tool to extract documentation from your source files:

```bash
npx tosijs-ui-docs --dirs src,README.md --output docs.json
```

This scans for:

- `.md` files (uses entire content)
- Multi-line comments starting with `/*#` in `.ts`, `.js`, `.css` files

### 2. Create Your Doc Browser

```typescript
import { createDocBrowser } from 'tosijs-ui'
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

### 3. Add Live Examples in Your Docs

In your source files or markdown, use code fences. Any sequence of
html, js, and css code examples will be turned in to a live, interactive
example.

    /*#
    # My Component

    This component does amazing things!

    ```html
    <my-component></my-component>
    ```
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

    export class MyComponent extends Component {
      // ...
    }

    export const myComponent = MyComponent.elementCreator({
      tag: 'my-component'
    })

## Documentation Format

### Inline Comments

Start multi-line comments with `/*#` to mark them as documentation:

```typescript
/*#
# Component Name

Description and examples go here...
*‎/
```

### Metadata

Control sort order with JSON metadata:

```
<!--{ "pin": "bottom" }-->
```

or

```
/*{ "pin": "bottom" }*‎/
```

## CLI Options

```bash
npx tosijs-ui-docs --help

Options:
  --dirs <paths>       Directories/files to scan (default: ".")
  --ignore <paths>     Directories to ignore (default: "node_modules,dist,build,docs")
  --output <path>      Output JSON path (default: "./docs.json")
  --help, -h           Show help
```

## Programmatic API

```typescript
import { extractDocs, saveDocsJSON } from 'tosijs-ui'

const docs = extractDocs({
  dirs: ['src', 'README.md'],
  ignore: ['node_modules', 'dist'],
})

saveDocsJSON(docs, './docs.json')

// Or use the docs directly
import { createDocBrowser } from 'tosijs-ui'
const browser = createDocBrowser({ docs, context: { mylib } })
```

## createDocBrowser Options

```typescript
interface DocBrowserOptions {
  docs: Doc[] // Array of documentation objects
  context?: Record<string, any> // Modules for live examples
  projectName?: string // Display name
  projectLinks?: ProjectLinks // Links to show in header
  navSize?: number // Nav width (default: 200)
  minSize?: number // Min width before compact (default: 600)
}

interface ProjectLinks {
  github?: string
  npm?: string
  discord?: string
  blog?: string
  tosijs?: string
  bundle?: string
  cdn?: string
  [key: string]: string | undefined
}
```

## See Also

The `tosijs-ui` demo is a complete working example. See:

- `/demo/src/index.ts` - How the doc browser is set up
- `/bin/docs.ts` - The extraction tool
- `/src/doc-browser.ts` - The createDocBrowser implementation
*/
/*{"pin": "bottom"}*/

import {
  elements,
  vars,
  bindings,
  touch,
  getListItem,
  debounce,
  tosi,
} from 'tosijs'
import { markdownViewer, MarkdownViewer } from './markdown-viewer'
import { LiveExample } from './live-example'
import { sideNav, SideNav } from './side-nav'
import { sizeBreak } from './size-break'
import { icons } from './icons'
import { xinLocalized } from './localize'

const { div, span, a, header, button, template, input, h2 } = elements

export interface Doc {
  text: string
  title: string
  filename: string
  path: string
  pin?: string
  hidden?: boolean
}

export interface ProjectLinks {
  github?: string
  npm?: string
  discord?: string
  blog?: string
  tosijs?: string
  bundle?: string
  cdn?: string
  [key: string]: string | undefined
}

export interface DocBrowserOptions {
  docs: Doc[]
  context?: Record<string, any>
  projectName?: string
  projectLinks?: ProjectLinks
  navSize?: number
  minSize?: number
}

export function createDocBrowser(options: DocBrowserOptions): HTMLElement {
  const {
    docs,
    context = {},
    projectName = '',
    projectLinks = {},
    navSize = 200,
    minSize = 600,
  } = options

  const docName =
    document.location.search !== ''
      ? document.location.search.substring(1).split('&')[0]
      : docs[0]?.filename || 'README.md'

  const currentDoc = docs.find((doc) => doc.filename === docName) || docs[0]

  const { app } = tosi({
    app: {
      docs,
      currentDoc,
      compact: false,
    },
  })

  bindings.docLink = {
    toDOM(elt, filename) {
      elt.setAttribute('href', `?${filename}`)
    },
  }

  bindings.current = {
    toDOM(elt, currentFile) {
      const boundFile = elt.getAttribute('href') || ''
      elt.classList.toggle('current', currentFile === boundFile.substring(1))
    },
  }

  const filterDocs = debounce(() => {
    const needle = searchField.value.toLocaleLowerCase()
    app.docs.forEach((doc: any) => {
      doc.hidden =
        !doc.title.toLocaleLowerCase().includes(needle) &&
        !doc.text.toLocaleLowerCase().includes(needle)
    })
    touch(app.docs)
  })

  const searchField = input({
    slot: 'nav',
    placeholder: 'search',
    type: 'search',
    style: {
      width: 'calc(100% - 10px)',
      margin: '5px',
    },
    onInput: filterDocs,
  })

  window.addEventListener('popstate', () => {
    const filename = window.location.search.substring(1)
    app.currentDoc =
      app.docs.find((doc: any) => doc.filename === filename) || app.docs[0]
  })

  const headerContent: any[] = [
    button(
      {
        class: 'iconic',
        style: { color: vars.linkColor },
        title: 'navigation',
        bind: {
          value: app.compact,
          binding: {
            toDOM(element, compact) {
              element.style.display = compact ? '' : 'none'
              ;(element.nextSibling as HTMLElement).style.display = compact
                ? ''
                : 'none'
            },
          },
        },
        onClick() {
          const nav = document.querySelector(SideNav.tagName!) as SideNav
          nav.contentVisible = !nav.contentVisible
        },
      },
      icons.menu()
    ),
    span({ style: { flex: '0 0 10px' } }),
  ]

  if (projectName) {
    headerContent.push(
      a(
        {
          href: '/',
          style: {
            display: 'flex',
            alignItems: 'center',
            borderBottom: 'none',
          },
        },
        projectLinks.tosijs
          ? icons.tosiUi({
              style: { _xinIconSize: 40, marginRight: 10 },
            })
          : span(),
        h2(projectName)
      )
    )
  }

  headerContent.push(span({ class: 'elastic' }))

  if (projectLinks.tosijs) {
    headerContent.push(
      a({ class: 'iconic', title: 'tosijs', target: '_blank' }, icons.tosi(), {
        href: projectLinks.tosijs,
      })
    )
  }

  if (projectLinks.discord) {
    headerContent.push(
      a(
        { class: 'iconic', title: 'discord', target: '_blank' },
        icons.discord(),
        { href: projectLinks.discord }
      )
    )
  }

  if (projectLinks.blog) {
    headerContent.push(
      a({ class: 'iconic', title: 'blog', target: '_blank' }, icons.blog(), {
        href: projectLinks.blog,
      })
    )
  }

  if (projectLinks.github) {
    headerContent.push(
      a(
        { class: 'iconic', title: 'github', target: '_blank' },
        icons.github(),
        { href: projectLinks.github }
      )
    )
  }

  if (projectLinks.npm) {
    headerContent.push(
      a({ class: 'iconic', title: 'npmjs', target: '_blank' }, icons.npm(), {
        href: projectLinks.npm,
      })
    )
  }

  const container = div(
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '100vw',
        height: '100vh',
        overflow: 'hidden',
      },
    },
    header(...headerContent),
    sideNav(
      {
        name: 'Documentation',
        navSize,
        minSize,
        style: {
          flex: '1 1 auto',
          overflow: 'hidden',
        },
        onChange(event) {
          const nav = document.querySelector(SideNav.tagName!) as SideNav
          app.compact = nav.compact as any
        },
      },
      searchField,
      div(
        {
          slot: 'nav',
          style: {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: 'calc(100% - 44px)',
            overflowY: 'scroll',
          },
          bindList: {
            hiddenProp: 'hidden',
            value: app.docs,
          },
        },
        template(
          a(
            {
              class: 'doc-link',
              bindCurrent: 'app.currentDoc.filename',
              bindDocLink: '^.filename',
              onClick(event: Event) {
                const a = event.target as HTMLAnchorElement
                const doc = getListItem(event.target as HTMLElement)
                const nav = (event.target as HTMLElement).closest(
                  'xin-sidenav'
                ) as SideNav
                nav.contentVisible = true
                const { href } = a
                window.history.pushState({ href }, '', href)
                app.currentDoc = doc
                event.preventDefault()
              },
            },
            xinLocalized({ bindText: '^.title' })
          )
        )
      ),
      div(
        {
          style: {
            position: 'relative',
            overflowY: 'scroll',
            height: '100%',
          },
        },
        markdownViewer({
          style: {
            display: 'block',
            maxWidth: '44em',
            margin: 'auto',
            padding: `0 1em`,
            overflow: 'hidden',
          },
          bindValue: 'app.currentDoc.text',
          didRender(this: MarkdownViewer) {
            LiveExample.insertExamples(this, context)
          },
        })
      )
    )
  )

  return container as HTMLElement
}
