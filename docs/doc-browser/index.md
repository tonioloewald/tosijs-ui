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

## Programmatic API

```typescript
import { extractDocs, saveDocsJSON } from 'tosijs-ui'

const docs = extractDocs({
  dirs: ['src', 'README.md'],
  ignore: ['node_modules', 'dist'],
})

saveDocsJSON(docs, './docs.json')

// Or use the docs directly
import { createDocBrowser } from 'tosijs-ui/doc-browser'
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

- `/tosijs-site.config.ts` - How this repo configures its doc site (`defineSiteConfig` / `tosijs-ui/site`)
- `/src/doc-system/site/docs.ts` - The extraction tool (`extractDocs`, exported from `tosijs-ui/site`)
- `/src/doc-browser.ts` - The createDocBrowser implementation
