# tosijs-ui Context Guide

This document provides essential context for working on and with the tosijs-ui library.

## Working ON tosijs-ui

### Project Structure

```
tosijs-ui/
├── src/               # Component source files
│   ├── *.ts          # Each component in its own file
│   ├── index.ts      # Main export file
│   └── version.ts    # Auto-generated version (from package.json)
├── demo/             # Live documentation site
│   ├── src/          # Demo application code
│   │   ├── index.ts  # Main demo entry (uses createDocBrowser)
│   │   └── style.ts  # Demo-specific styles
│   ├── static/       # Static assets
│   └── docs.json     # Generated documentation
├── bin/              # Build and development tools
│   ├── dev.ts        # Development server with hot reload
│   ├── docs.js       # Documentation extraction (legacy)
│   └── extract-docs.js # CLI tool for doc extraction
├── dist/             # Build output (not in git)
├── docs/             # Published documentation site (not in git)
└── tests/            # Playwright tests
```

### Component Documentation Format

Components use inline documentation with `/*#` comment blocks.
Live exampels can be embedded using js / html / css code blocks
(with no space between the parts for a single example).

    /\*#
    # Component Name

    Description of the component and its purpose.

    ```html
    <example-component></example-component>
    ```
    ```js
    import { exampleComponent } from 'tosijs-ui'
    preview.append(exampleComponent({ value: 'Hello!' }))
    ```
    ```css
    example-component {
      color: blue;
    }
    ```

    export class MyComponent ...

## Properties

- `value`: The component's value
- `disabled`: Boolean attribute

## Events

- `change`: Fired when value changes
- `action`: Fired when user takes action
  \*/

import { Component, ElementCreator } from 'tosijs'

export class ExampleComponent extends Component {
// implementation
}

export const exampleComponent = ExampleComponent.elementCreator({
tag: 'example-component',
styleSpec: { /_ styles _/ }
}) as ElementCreator<ExampleComponent>

````

### Documentation Metadata

Control documentation ordering with JSON metadata:

```typescript
/*{ "pin": "top" }*/     // Pin to top of navigation
/*{ "pin": "bottom" }*/   // Pin to bottom
````

Or in markdown:

```markdown
<!--{ "pin": "top" }-->
```

### Development Workflow

1. **Start dev server**: `bun start` (or `bun --watch bin/dev.ts`)

   - Runs on `https://localhost:8787`
   - Auto-rebuilds on file changes
   - Watches `src/`, `demo/src/`, and `README.md`

2. **Documentation is auto-extracted** when files change:

   - Scans for `.md` files
   - Extracts `/*#` comment blocks from `.ts`, `.js`, `.css`
   - Outputs to `demo/docs.json`

3. **Build process**:

   - TypeScript → JavaScript (ESM in `dist/`)
   - TypeScript → Type declarations (`dist/*.d.ts`)
   - Bundles IIFE version with tosijs + marked (`dist/iife.js`)
   - Builds demo site to `docs/`

4. **Testing**: `bun tests` (runs unit tests + Playwright)

### Key Files

- **`src/index.ts`**: Main export file - add new components here
- **`src/version.ts`**: Auto-generated from `package.json` version
- **`bin/dev.ts`**: Development server and build orchestration
- **`demo/src/index.ts`**: Demo site using `createDocBrowser()`
- **`demo/src/style.ts`**: Demo styling (uses tosijs XinStyleSheet)

### Component Patterns

**Basic component structure**:

```typescript
export class MyComponent extends Component {
  myProperty: string = ''

  constructor() {
    super()
    this.initAttributes('myProperty') // Make reactive
  }

  content = () => [
    // Return elements or template string
  ]
}

export const myComponent = MyComponent.elementCreator({
  tag: 'my-component',
  styleSpec: {
    /* styles */
  },
}) as ElementCreator<MyComponent>
```

**Component principles**:

- Work _with_ the browser, not against it
- Interoperable with other web components
- Similar to native elements (`<input>`, `<select>`)
- Binary attributes work as expected
- `value` property for state
- Emit `change` events when value changes
- Emit `action` events for user interactions

### Publishing Checklist

1. Update version in `package.json`
2. Run `bun tests` to verify all tests pass
3. Build: `bun run bin/dev.ts` (generates dist + docs)
4. Commit changes including `dist/` and `docs/`
5. Tag release: `git tag v1.x.x`
6. Push: `git push --tags`
7. Publish: `npm publish`

---

## Working WITH tosijs-ui

### Installation

```bash
npm install tosijs-ui tosijs marked
# or
bun add tosijs-ui tosijs marked
```

### Basic Usage

**Import specific components**:

```typescript
import { dataTable, select, icons } from 'tosijs-ui'

document.body.append(
  dataTable({ array: myData }),
  select({ options: ['one', 'two', 'three'] })
)
```

**Using in HTML** (after importing somewhere):

```html
<xin-select options="one,two,three"></xin-select> <xin-table></xin-table>
```

**IIFE bundle** (includes tosijs, tosijs-ui, marked):

```html
<script src="https://cdn.jsdelivr.net/npm/tosijs-ui/dist/iife.js"></script>
<script>
  const { dataTable } = tosijsui
  document.body.append(dataTable({ array: data }))
</script>
```

### Key Components

- **`dataTable`**: Virtual scrolling table with sorting, filtering, selection
- **`select`**: Enhanced select with icons, submenus, async options
- **`markdownViewer`**: Renders markdown with live examples
- **`sideNav`**: Responsive sidebar navigation
- **`liveExample`**: Interactive code examples
- **`form`**: Form builder with validation
- **`richText`**: Rich text editor
- **`dialog`**: Modal dialogs
- **`popFloat`**: Floating tooltips and popovers
- **`icons`**: Icon library with 100+ icons

### Self-Documented Testbed

Create your own documentation site:

#### 1. Generate Documentation

```bash
npx tosijs-ui-docs --dirs src,README.md --output docs.json
```

#### 2. Create Browser

```typescript
import { createDocBrowser } from 'tosijs-ui'
import * as mylib from './my-library.js'
import docs from './docs.json'

const browser = createDocBrowser({
  docs,
  context: { mylib }, // Available in live examples
  projectName: 'My Project',
  projectLinks: {
    github: 'https://github.com/user/project',
    npm: 'https://www.npmjs.com/package/project',
  },
})

document.body.append(browser)
```

#### 3. Document Your Components

In your source files:

````typescript
/*#
# My Component

Description goes here.

```html
<my-component value="example"></my-component>
````

```js
import { myComponent } from 'mylib'
preview.append(myComponent({ value: 'Hello!' }))
```

\*/

export class MyComponent extends Component {
// ...
}

````

### Philosophy

**tosijs-ui augments HTML5/CSS3** rather than replacing it:
- Use native `<input>`, `<form>`, `<button>` when they work
- Components fill gaps (virtual tables, better selects, etc.)
- Interoperable with other libraries (Shoelace, etc.)
- Framework agnostic (works with React, Vue, vanilla JS)

**Component behavior**:
- `value` property for state (like `<input>`)
- `change` event when value changes
- `action` event for user interactions (even if value unchanged)
- Binary attributes (`hidden`, `disabled`) work as expected
- No race conditions (unlike `<select>`)

### Common Patterns

**Reactive bindings** (with tosijs):
```typescript
import { elements, tosi } from 'tosijs'
import { select } from 'tosijs-ui'

const { app } = tosi({ app: { choice: 'option1' } })

document.body.append(
  select({
    options: ['option1', 'option2', 'option3'],
    bindValue: 'app.choice'  // Two-way binding
  })
)
````

**Event handling**:

```typescript
import { dataTable } from 'tosijs-ui'

const table = dataTable({
  array: myData,
  select: true,
  multiple: true,
  selectionChanged(selectedRows) {
    console.log('Selected:', selectedRows)
  },
})

table.addEventListener('change', (e) => {
  console.log('Selection changed')
})
```

**Custom cells in tables**:

```typescript
import { dataTable } from 'tosijs-ui'
import { elements } from 'tosijs'

dataTable({
  array: data,
  columns: [
    {
      prop: 'name',
      width: 200,
      dataCell() {
        return elements.input({
          class: 'td',
          bindValue: '^.name', // Bind to row data
          onMouseup: (e) => e.stopPropagation(),
        })
      },
    },
  ],
})
```

### Resources

- **Live demo**: [ui.tosijs.net](https://ui.tosijs.net)
- **tosijs docs**: [tosijs.net](https://tosijs.net)
- **GitHub**: [github.com/tonioloewald/tosijs-ui](https://github.com/tonioloewald/tosijs-ui)
- **NPM**: [npmjs.com/package/tosijs-ui](https://www.npmjs.com/package/tosijs-ui)
- **Discord**: [discord.gg/ramJ9rgky5](https://discord.gg/ramJ9rgky5)

### Migration Notes

**xinjs-ui → tosijs-ui**:
The library was renamed from `xinjs-ui` to `tosijs-ui`. The API remains stable during the transition:

- Replace `import ... from 'xinjs-ui'` → `import ... from 'tosijs-ui'`
- Replace `import ... from 'xinjs'` → `import ... from 'tosijs'`
- Component tags still use `xin-` prefix (e.g., `<xin-table>`)
- ElementCreator functions keep old names for compatibility
