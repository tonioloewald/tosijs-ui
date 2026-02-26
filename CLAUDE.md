# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

tosijs-ui (formerly xinjs-ui) is a web-component library built on [tosijs](https://tosijs.net). Components augment HTML5/CSS3 rather than replacing native elements. The library is developed using [bun](https://bun.sh/).

## Common Commands

```bash
bun start              # Dev server at https://localhost:8787 (hot reload, reports gzip sizes)
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
- **Playwright tests** (`tests/*.pw.ts`): Require the dev server running at `https://localhost:8787`. The Playwright config does NOT auto-start the server. Tests run against Chromium, Firefox, and WebKit.

### Dev Server TLS

The dev server runs HTTPS using self-signed certs in `tls/`. If certs are missing, run `tls/create-dev-certs.sh` to regenerate them.

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
- `demo/xin-icon-font/` → triggers icon data regeneration

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
  // Static initAttributes replaces constructor-based initAttributes
  static initAttributes = {
    myProperty: '',
    disabled: false,
  }
  
  // content returns element tree; use { part: 'name' } to register parts
  content = () => [
    button({ part: 'button' }, span({ part: 'label' }, 'Click'))
  ]
  
  // Set content = null for components that build DOM programmatically in render()
}

export const tosiWidget = TosiWidget.elementCreator({
  tag: 'tosi-widget',
  styleSpec: { /* styles */ }
}) as ElementCreator<TosiWidget>

// Deprecated alias for backward compatibility during rename
export const xinWidget = deprecated(
  (...args) => tosiWidget(...args),
  'xinWidget is deprecated, use tosiWidget instead'
)
```

**Naming convention**: New components use `Tosi*` class names, `tosi*` element creators, and `<tosi-*>` tags. Legacy `xin*` exports are deprecated but maintained for compatibility.

### Form-Associated Components

Several components support native form integration via `static formAssociated = true`. These participate in form submission and validation automatically. Form-associated components implement:
- `name` attribute for the form field name
- `formDisabledCallback()` / `formResetCallback()` lifecycle methods
- Integration with both native `<form>` and `<tosi-form>`

Components with form association: `TosiSelect`, `TosiSegmented`, `TosiRating`, `TosiMonth`, `TosiTagList`, `RichText`, `MapBox`.

### Documentation System

Components are self-documenting via `/*#` comment blocks containing markdown. Live examples use consecutive code blocks (html/js/css). Control nav ordering with JSON metadata:
- `/*{ "pin": "top" }*/` or `<!--{ "pin": "top" }-->` for pinning

**Test blocks**: Use a `test` language code block after html/js/css blocks to add inline tests:
````markdown
```js
// Setup code that creates elements in `preview`
```
```test
test('element renders', () => {
  expect(preview.querySelector('my-element')).toBeTruthy()
})
```
````

The `createDocBrowser()` function renders documentation from extracted `docs.json`.

### Key Dependencies

- `tosijs`: Core component framework (peer dep ^1.2.0, dev dep ^1.3.3)
- `marked`: Markdown parsing (peer dependency, ^17.0.0)
- `happy-dom`: DOM simulation for unit tests (dev dependency)
- Components use custom HTML tags with `tosi-` prefix (e.g., `<tosi-select>`, `<tosi-dialog>`)
- IIFE build (`src/index-iife.ts`) bundles tosijs + marked + tosijs-ui, exposes `xinjs` and `xinjsui` globals

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

### Component Philosophy

- Work with the browser, not against it
- `value` property for state, `change` event when it changes
- `action` event for user interactions (distinct from value changes)
- Binary attributes (`hidden`, `disabled`) work as expected
- Interoperable with other web-component libraries

## Task Tracking

Open tasks and planned work are tracked in `TODO.md` at the project root.
