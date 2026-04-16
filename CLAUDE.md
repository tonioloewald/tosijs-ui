# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

tosijs-ui (formerly xinjs-ui) is a web-component library built on [tosijs](https://tosijs.net). Components augment HTML5/CSS3 rather than replacing native elements. The library is developed using [bun](https://bun.sh/).

## Common Commands

```bash
bun start              # Dev server at https://localhost:8787 (hot reload, reports gzip sizes)
bun run build          # Build only (no server), exits with 0/1
bun run test-browser   # Build, launch haltija, run browser tests, exit with 0/1
bun tests              # Run unit tests + Playwright tests
bun format             # ESLint + Prettier
bun latest             # Clean install (removes node_modules + bun.lock, then bun update)
bunx tsc --noEmit      # Type check without emitting (used in CI)
```

Running a single unit test:
```bash
bun test src/make-sorter.test.ts
```

Running a single Playwright test (dev server must be running first):
```bash
bun playwright test tests/form.pw.ts
```

### Testing Setup

- **Unit tests** (`src/*.test.ts`): Run with `bun test`. Use `happy-dom` for DOM simulation (preloaded via `bunfig.toml` → `test-setup.ts`). Import from `bun:test`.
- **Browser tests** (`bun run test-browser`): Builds the project, starts the dev server, launches [haltija](https://github.com/nicholasgasior/haltija) headless browser, navigates to the demo site, waits for inline doc tests to run and POST results to `/report`, then exits with pass/fail. Uses `hj` CLI commands (`hj windows`, `hj navigate`). Reuses an existing haltija instance if one is running, otherwise spawns `bunx haltija@latest -f`. Results saved to `.browser-tests.json`.
- **Playwright tests** (`tests/*.pw.ts`): Require the dev server running at `https://localhost:8787`. The Playwright config does NOT auto-start the server. Tests run against Chromium, Firefox, and WebKit.

#### Inline doc tests

Use `` ```test `` code blocks in `/*#` doc comments for browser-based tests. See "Live example code blocks" under Documentation System for full details on how code blocks are grouped, executed, and scoped.

### Dev Server TLS

The dev server runs HTTPS using self-signed certs in `tls/`. If certs are missing, run `tls/create-dev-certs.sh` to regenerate them.

### CI

GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR to `main`: `bun install` → `bunx tsc --noEmit` → `bun test` (unit tests only, no browser or Playwright tests in CI).

### Code Style

No semicolons, single quotes, 2-space indent, trailing commas (es5). Enforced by Prettier (`.prettierrc.json`). ESLint allows `any` and non-null assertions.

## Architecture

### Build Pipeline

`bin/dev.ts` orchestrates the build:
1. Writes version from `package.json` to `src/version.ts`
2. Extracts `/*#` doc comments from `src/` and `README.md` → `demo/docs.json`
3. Generates icon data via `bin/make-icon-data.js`
4. Compiles TypeScript → ESM in `dist/`
5. Generates type declarations → `dist/*.d.ts`
6. Bundles IIFE version (tosijs + marked included) → `dist/iife.js`
7. Reports gzipped bundle sizes
8. Builds demo site → `docs/`

The dev server watches:
- `src/` and `README.md` → triggers doc extraction + rebuild
- `demo/src/` → triggers demo rebuild only
- `icons/` → triggers icon data regeneration (`bin/make-icon-data.js` → `src/icon-data.ts`)

### Directory Structure

- `src/` - Library source code and unit tests (`*.test.ts`)
- `tests/` - Playwright end-to-end tests (`*.pw.ts`)
- `demo/src/` - Demo site source (separate from library)
- `demo/static/` - Static assets copied to `docs/`
- `dist/` - Built library output (ESM + IIFE + types)
- `docs/` - Built demo site (served at https://localhost:8787)

### Component Structure

Each component lives in `src/<component>.ts` and exports:
- A `Component` subclass (the custom element)
- An `ElementCreator` function (factory for creating instances)

New components must be added to `src/index.ts`.

> **Note**: Some files import `Component as WebComponent` — this is just an alias, not a separate class. All components extend the same tosijs `Component`.

Example pattern:
```typescript
// Typed parts for accessing named sub-elements via this.parts.*
interface WidgetParts extends PartsMap {
  button: HTMLButtonElement
  label: HTMLSpanElement
}

export class TosiWidget extends Component<WidgetParts> {
  static preferredTagName = 'tosi-widget'

  // Use shadowStyleSpec for shadow DOM styles, lightStyleSpec for global/light DOM styles
  static shadowStyleSpec = { /* shadow DOM styles */ }
  // static lightStyleSpec = { /* light DOM styles */ }

  static initAttributes = {
    myProperty: '',
    disabled: false,
  }

  // content returns element tree; use { part: 'name' } to register parts
  content = () => [
    button({ part: 'button' }, span({ part: 'label' }, 'Click'))
  ]

  render(): void {
    super.render()
    // Access named parts via this.parts — never query the DOM manually
    this.parts.label.textContent = this.myProperty
  }

  // Set content = null for components that build DOM programmatically in render()
}

export const tosiWidget = TosiWidget.elementCreator() as ElementCreator<TosiWidget>

/** @deprecated Use tosiWidget instead */
export const xinWidget = tosiWidget
```

#### The `content` property

`content` can be:
- **An array** of elements (static content): `content = [slot()]`
- **A function** returning elements: `content = () => [button({ part: 'btn' })]`
- **null** for components that build DOM programmatically in `render()`

The function form has access to `this` so it can read `initAttributes` at construction time. It also accepts `elements` as an argument: `content = ({div, span}) => [div(span('hello'))]` — though most components import element creators at the module level.

#### Parts system

Define typed parts via a `PartsMap` interface and assign `{ part: 'name' }` to elements in `content`. Access them in `render()` or methods via `this.parts.name`. **Never query the shadow DOM manually** — parts are the correct way to reference sub-elements.

#### Shadow DOM vs Light DOM slots

- Components with `shadowStyleSpec` use **shadow DOM** — use the standard `slot()` element for composition
- Components with `lightStyleSpec` use **light DOM** — use `xinSlot()` (from `elements`) which provides slot-like composition in the light DOM
- If you use `slot()` in a light DOM component, it is automatically instantiated as a `tosi-slot` element

#### Event handler binding

Methods passed as event handlers in `content` must be arrow function properties so `this` is correctly bound:

```typescript
// Correct — arrow property is auto-bound
showSettingsMenu = (): void => { ... }
content = () => [button({ onClick: this.showSettingsMenu })]

// Wrong — class method loses `this` when passed as callback
showSettingsMenu(): void { ... }
content = () => [button({ onClick: this.showSettingsMenu })]  // `this` is wrong

// Wrong — unnecessary wrapper
content = () => [button({ onClick: () => this.showSettingsMenu() })]
```

**Declaration order matters**: class fields initialize top-to-bottom. Arrow property handlers referenced in `content` must be declared **before** `content`, or they will be `undefined` when `content()` runs.

#### Content function pitfalls

- Content is called once at construction. Use `render()` for dynamic updates — toggle `hidden`, update `textContent`, call `replaceChildren()`, etc.
- Prefer a declarative `content` that defines the full element tree, with `render()` handling visibility and dynamic state. Building content imperatively (push into array based on conditionals) works but is verbose and clumsy.

**Naming convention**: All components use `Tosi*` class names, `tosi*` element creators, and `<tosi-*>` tags. Legacy `xin*` exports are simple aliases kept for backward compatibility.

### Form-Associated Components

Several components support native form integration via `static formAssociated = true`. These participate in form submission and validation automatically. Form-associated components implement:
- `name` attribute for the form field name
- `formDisabledCallback()` / `formResetCallback()` lifecycle methods
- Integration with both native `<form>` and `<tosi-form>`

Components with form association: `TosiSelect`, `TosiSegmented`, `TosiRating`, `TosiMonth`, `TosiTagList`, `RichText`, `MapBox`.

### Documentation System

Components are self-documenting via `/*#` comment blocks containing markdown. Control nav ordering with JSON metadata:
- `/*{ "pin": "top" }*/` or `<!--{ "pin": "top" }-->` for pinning

The `createDocBrowser()` function renders documentation from extracted `docs.json`.

#### Live example code blocks

**Consecutive** code blocks with languages `js`, `html`, `css`, or `test` are grouped into a single live example by `src/live-example/insert-examples.ts`. Any non-code-block content (headings, paragraphs, etc.) between blocks breaks the group — the blocks become separate examples.

How grouping works (`insert-examples.ts`):
1. Finds all `.language-{js,html,css,test}` elements not already inside a live-example
2. Groups consecutive `<pre>` siblings (checked via `nextElementSibling`)
3. Creates one `<live-example>` per group, setting `.js`, `.html`, `.css`, `.test` properties

**Execution model** (`src/live-example/execution.ts`):
- Each code block type (`js`, `test`) runs as a **separate** `AsyncFunction` invocation
- `import { x } from 'tosijs-ui'` is rewritten to `const { x } = tosijsui` (also works for `'tosijs'` → `tosijs`). Only named imports with `{ }` and single quotes are supported.
- `import { x } from 'tosijs'.elements` works — the `.elements` accessor is preserved after rewriting
- Variables/imports from a `js` block are NOT available in `test` blocks — each block has its own scope
- The `preview` DOM element is injected as a context variable, shared across blocks in the same example
- If execution throws, it's reported as a test failure: "example loads without error"

**Writing doc examples**:
- Use ` ```js ` for executable JavaScript, ` ```typescript ` (or any other language) for display-only code
- Each `js` block must import everything it needs — no sharing between blocks
- Consecutive html/js/css/test blocks form ONE example. Put markdown between them to create separate examples.
- **Do not put both `html` and `js` blocks for the same demo** — if an `html` block creates a `<tosi-widget>` and the `js` block also appends one, you get duplicates. Pick one approach per example.
- `test()` calls within a block run **concurrently** — combine dependent assertions into a single `test()` call
- Other examples on the page may leave elements in the DOM — use count-based assertions, not presence/absence
- Router demos must use `{ hashRouting: true }` — `navigate()` with History API `pushState` changes the URL path and breaks the doc-browser's `?filename` navigation

### Key Dependencies

- `tosijs`: Core component framework (peer dep ^1.2.0, dev dep ^1.4.0)
- `marked`: Markdown parsing (peer dependency, ^16.4.2)
- `sucrase`: TypeScript transform for live examples (optional peer dependency, ^3.35.0)
- `happy-dom`: DOM simulation for unit tests (dev dependency)
- Components use custom HTML tags with `tosi-` prefix (e.g., `<tosi-select>`, `<tosi-dialog>`)
- IIFE build (`src/index-iife.ts`) bundles tosijs + marked + tosijs-ui, exposes `xinjs` and `xinjsui` globals (legacy names kept for backward compatibility; `window.xinjs` = tosijs, `window.xinjsui` = tosijs-ui)

### tosijs Observable Proxies

Use `tosi()` to create observable state. Access values via `.value` property:

```typescript
import { tosi } from 'tosijs'

// Create observable state
const { app } = tosi({
  app: {
    count: 0,
    user: { name: 'Alice' }
  }
})

// Read/write via .value
console.log(app.count.value)     // 0
app.count.value = 5

// Observe changes
app.count.observe((newValue) => {
  console.log('count changed to', newValue)
})

// Nested paths work the same way
app.user.name.value = 'Bob'
```

**Key points:**
- `tosi()` returns proxies, not raw objects
- Always use `.value` to read/write actual values
- Use `.observe()` for change callbacks
- BoxedScalars work transparently except for `===` comparisons
- In bindings, `toDOM` callbacks receive the raw value, not the BoxedScalar

### List Binding Syntax Sugar

The `.listBinding` property on array proxies provides concise syntax for binding arrays to DOM:

```typescript
import { tosi, elements } from 'tosijs'

const { div, span } = elements
const { app } = tosi({
  app: {
    items: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
  }
})

// New syntax sugar - template callback receives (elements, item)
div(
  app.items.listBinding(
    ({ span }, item) => span({ bindText: item.name }),
    { idPath: 'id' }  // optional ListBindingOptions
  )
)

// Equivalent verbose syntax (still works)
div(
  { bindList: { value: app.items, idPath: 'id' } },
  template(span({ bindText: '^.name' }))
)
```

The callback receives the `elements` proxy and the item proxy, making it easier to build templates without string-based paths.

### CSS with StyleSheet and styleSpec

**Never write CSS as raw strings.** Use `StyleSheet()` with `XinStyleSheet` objects:

```typescript
import { StyleSheet, XinStyleSheet, vars, varDefault } from 'tosijs'

const myStyles: XinStyleSheet = {
  // Use vars.* for CSS variable references (generates var(--foo))
  '.my-class': {
    padding: vars.spacing,
    fontSize: vars.fontSize,
    color: vars.brandColor,
  },
  
  // Use vars with numeric suffixes for scaled values
  // vars.spacing50 → calc(var(--spacing) * 0.5)
  // vars.fontSize75 → calc(var(--font-size) * 0.75)
  '.compact': {
    padding: vars.spacing50,
    gap: vars.spacing25,
    fontSize: vars.fontSize75,
  },
  
  // Use varDefault.* for customizable defaults
  // varDefault.myColor('#f00') → var(--my-color, #f00)
  '.themed': {
    background: varDefault.widgetBg('#fff'),
    color: varDefault.widgetColor('#000'),
  },
  
  // Define CSS variables with underscore prefix
  // _myVar becomes --my-var in output
  '.widget': {
    _widgetState: 'active',
    background: vars.widgetState,
  },
  
  // Keyframes work as nested objects
  '@keyframes fade-in': {
    from: { opacity: '0' },
    to: { opacity: '1' },
  },
}

// Inject into document head with an ID
StyleSheet('my-styles', myStyles)
```

**Key points:**
- CSS is code - apply the same quality standards as TypeScript
- No magic numbers - use `vars.spacing`, `vars.fontSize`, etc.
- Use scaled variants: `vars.spacing25`, `vars.spacing50`, `vars.spacing75`, `vars.spacing200`
- Use `varDefault.foo('default')` for theme-customizable values
- Underscore prefix (`_foo`) defines CSS variables (`--foo`)
- `StyleSheet()` injects styles into `<head>` with deduplication by ID

### CSS Architecture Principles

**CSS Variables are the Way:**
- More efficient than any preprocessor or utility-class framework
- Namespace all custom properties (W3C made poor decisions, protect yourself)
- Use `vars.*` and `varDefault.*` from tosijs, never raw `var()` strings
- tosijs color math (`Color` class) polyfills incomplete CSS color function support
- Changing root variables recomputes derived values throughout the app

**Semantic Variable Naming:**
Variable names should indicate their type through natural terms:
- **Spatial**: `*-size`, `*-height`, `*-width`, `*-gap`, `*-spacing` (single value)
- **Spatial shorthand**: `*-padding`, `*-margin`, `*-inset`, `*-radius` (1-4 values)
- **Color**: `*-color`, `*-bg`, `*-fill`, `*-stroke`, or bare nouns (`--brand`, `--accent`)
- **Other**: `*-shadow`, `*-transition`, `*-opacity`, `*-weight`

**Color and Metrics are Orthogonal:**
- Keep color and sizing concerns completely separate
- A minimal set of color constants (brand, accent, maybe 1-2 more) drives all theming
- Use `currentColor` to propagate color context without explicit variables
- Dark mode = recompute colors from the same brand values, not a separate palette

**Metrics Hierarchy:**
- `font-size` is the primary driver
- `touch-size` secondary (for interactive hit targets)
- `spacing` tertiary
- Derived values (`line-height`, `border-radius`, gaps) computed from above but overridable
- Use `vars.spacing50`, `vars.fontSize75` etc. - never inline `calc()` or magic numbers

**Element Types - Fixed Terrain:**
UI is a fixed landscape wired to state, not a function that rebuilds on every change:
- **Text blocks** - inline content that flows
- **Widgets** - inline-block/flex items with consistent metrics
- **Interactive widgets** - widgets with padding (for hit area), cursor, focus states

**Layout Patterns:**
- A small set of flex patterns covers most layouts
- A small set of scrolling patterns covers scroll needs
- Text, labels, edit fields, and button captions should align on a single line by default
- Multiline text and captions should wrap equally well

**Spacing Rules:**
- An element should almost never have both padding AND margin - pick one
- Interactive elements use padding (not margin) - the padding IS the hit area
- Use `boxShadow` instead of `border` - it doesn't affect layout metrics

**Interactivity Levels:**
1. **Static** - not interactive at all
2. **Dynamic/read-only** - updates but not user-editable  
3. **Clickable** - responds to clicks/taps
4. **Focusable/Editable** - can receive focus and keyboard input

### Theme System

The theme system (`src/theme.ts`) provides automatic dark mode and consistent styling:

```typescript
import { Color } from 'tosijs'
import { createTheme, createDarkTheme, applyTheme } from 'tosijs-ui'

const colors = {
  accent: Color.fromCss('#007AFF'),
  background: Color.fromCss('#ffffff'),
  text: Color.fromCss('#1a1a1a'),
}

// Auto dark mode based on preference
const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches
applyTheme(prefersDark ? createDarkTheme(colors) : createTheme(colors))
```

Base variables use `--tosi-` prefix (e.g., `--tosi-spacing`, `--tosi-accent`, `--tosi-touch-size`). Components derive their own variables from these (e.g., `--tosi-select-gap` defaults to `var(--tosi-spacing-sm)`).

### Drop Menus

`popDropMenu()` extends the menu system for drag-and-drop. A single `menuItems` array serves both click navigation (`popMenu`) and drag-to-drop (`popDropMenu`).

```typescript
import { popMenu, popDropMenu, tosiMenu } from 'tosijs-ui'

const menuItems = [
  {
    caption: 'Documents',
    icon: 'folder',
    acceptsDrop: ['text/*'],        // MIME types this item accepts
    dropAction(data) { /* ... */ },  // called on drop
    action() { /* click handler */ },
    menuItems: [/* children */],     // can be () => MenuItem[] for lazy loading
  },
]

// Click mode - shows all items
popMenu({ target, menuItems })

// Drop mode - filters/disables non-matching items
popDropMenu({ target, menuItems, dataTypes: ['text/plain'] })
```

Key options:
- `hideDisabled` (default `false`) — non-matching items shown disabled; set `true` to hide them
- `disclosureDelay` (ms, default 200) — hover time before submenu auto-discloses
- `MenuItemsProvider` — `menuItems` can be `MenuItem[]` or `() => MenuItem[]` for lazy evaluation
- `<tosi-menu accepts-drop="text/plain;text/html">` — auto-opens drop menu on compatible drag

### Drag and Drop Library

`dragAndDrop.init()` sets up global drag-and-drop handling. It automatically marks `[data-drop]` elements with `.drag-target` when a compatible drag starts, including elements added dynamically during the drag (via MutationObserver). The observer is torn down when the drag ends.

Classes managed by the library:
- `.drag-source` — element being dragged
- `.drag-target` — valid drop target for current drag
- `.drag-over` — drop target currently hovered

### Component Philosophy

- Work with the browser, not against it
- `value` property for state, `change` event when it changes
- `action` event for user interactions (distinct from value changes)
- Binary attributes (`hidden`, `disabled`) work as expected
- Interoperable with other web-component libraries

## Publishing

1. Update version in `package.json`
2. Run `bun tests` to verify all tests pass
3. Build: `bun run build`
4. Commit changes including `dist/` and `docs/`
5. Tag release: `git tag v1.x.x`
6. Push: `git push --tags`

## Task Tracking

Open tasks and planned work are tracked in `TODO.md` at the project root.
