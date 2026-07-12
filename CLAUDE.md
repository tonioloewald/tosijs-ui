# CLAUDE.md

> **Shared engineering practices** live at
> **https://github.com/tonioloewald/tosijs-coding-practices** — and, when checked out beside
> this repo, at [`../tosijs-coding-practices`](../tosijs-coding-practices/README.md). Read that
> index first for the cross-project defaults (development, testing, code quality, performance,
> review, releasing, deployment, and the **observant** tosijs/tjs stack). This file records only
> what is **specific to or divergent from** those defaults — when they conflict, this file wins.
>
> Those docs are **living, not graven in stone.** Don't rewrite them unprompted, but do speak up:
> voice concerns, flag inconsistencies, and suggest improvements as you work. Continuous
> improvement is the goal — see the repo's `CONTRIBUTING.md`.


This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

tosijs-ui (formerly xinjs-ui) is a web-component library built on [tosijs](https://tosijs.net). Components augment HTML5/CSS3 rather than replacing native elements. The library is developed using [bun](https://bun.sh/).

## Common Commands

```bash
bun start              # Dev server at https://localhost:8787 (hot reload, reports gzip sizes) — `bun --watch bin/dev.ts`
bun run build          # Build only (no server), exits with 0/1 — `bin/dev.ts --build-only`
bun run test-browser   # Build, launch haltija, run browser tests, exit with 0/1 — `bin/dev.ts --test`
bun tests              # `bun test src/*.test.ts && bun playwright test` — see caveat below
bun format             # ESLint + Prettier
bun latest             # Clean install (removes node_modules + bun.lock, then bun update)
bunx tsc --noEmit      # Type check without emitting (used in CI)
bun book               # Build ePub of the doc corpus (run AFTER `bun run build`)
```

The three test lanes are distinct: **`bun test`** is the fast happy-dom unit lane (this is all CI runs — 539 tests; it recurses into `src/*/`); **`bun run test-browser`** drives haltija over the inline `` ```test `` doc examples; **`bun playwright test`** is the `tests/*.pw.ts` end-to-end lane. **Caveat:** `bun tests` runs unit + Playwright, and the Playwright half needs the dev server **already running** at `https://localhost:8787` (the Playwright config does NOT auto-start it) — start `bun start` first or the Playwright tests fail to connect.

**Run every lane before a release.** CI covers only the unit lane, so any lane the release gate doesn't run *will* rot silently — the Playwright lane sat red for ~a month before 1.7. Never scope the unit lane with a `src/*.test.ts` glob: it matches only the 16 top-level files and silently skips the 15 in subdirectories (126 tests).

`bun book` (`bin/build-book.ts`) reads the extracted `demo/docs.json`, so run a normal build first. Book identity/config comes from `tosijs-site.config.ts`. The doc-site build (`buildSite`) also regenerates the ePub on every build when `epub` is enabled in the site config. PDF output is the doc-browser's in-app **Print** button (`book-html.ts` → browser print-to-PDF), not a batch job.

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

When an `expect()` fails the harness appends the source line and `(line N)` to the error message — e.g. `Expected false to be true | expect(x).toBe(true) (line 46)`. Line numbers refer to the test source via `//# sourceURL=inline-test`. You don't need to comment assertions out one by one to find the failure.

### Dev Server TLS

The dev server runs HTTPS using certs in `tls/` (`key.pem` + `certificate.pem`, both gitignored). If they're missing (e.g. a fresh clone), `bin/dev.ts` exits with a message telling you to run `bun tls` (`tls/create-dev-certs.sh`) — it doesn't auto-generate, because the script runs `mkcert -install` which prompts for sudo. The script uses [mkcert](https://github.com/FiloSottile/mkcert) to install a locally-trusted CA, so browsers show **no** certificate warnings (unlike a bare self-signed cert). If mkcert isn't installed the script prints platform-specific install instructions and exits; install it, then re-run. Certs cover `localhost`, `127.0.0.1`, `::1`, and `<hostname>.local` (for LAN device testing).

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
9. Generates `llms.txt` (agent-discoverability index, shipped in the published package) via `bin/make-llms-txt.ts`

The dev server watches:
- `src/` and `README.md` → triggers doc extraction + rebuild
- `demo/src/` → triggers demo rebuild only
- `icons/` → triggers icon data regeneration (`bin/make-icon-data.js` → `src/icon-data.ts`)

#### Generated files are tracked in git

`dist/`, `docs/`, `demo/docs.json`, `llms.txt`, `src/icon-data.ts`, and `src/version.ts` are build outputs but are **committed**, not gitignored. A build (`bun run build`) regenerates them, often producing large diffs in `dist/iife.js`, `dist/*.map`, `docs/*.js`, etc. — this is expected. Commit those diffs alongside the source change that caused them; do not revert or hand-edit them. Run `bun run build` before committing so the generated files match the source you're shipping.

**Rebasing/merging across generated files:** `.gitattributes` marks these paths `merge=ours` so git auto-resolves their conflicts (the next build overwrites them anyway) instead of stopping at every one. This driver is **not** stored in the repo — run it once per clone:

```bash
git config merge.ours.driver true
```

After a rebase/merge that touched generated files, run `bun run build` to regenerate them canonically, then amend/commit. Don't hand-resolve generated-file conflicts.

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
interface WidgetParts extends PartsMap {
  button: HTMLButtonElement
  label: HTMLSpanElement
}

export class TosiWidget extends Component<WidgetParts> {
  static preferredTagName = 'tosi-widget'

  static shadowStyleSpec = { /* shadow DOM styles */ }
  // static lightStyleSpec = { /* light DOM styles */ }

  static initAttributes = {
    myProperty: '',
    disabled: false,
  }

  content = () => [
    button({ part: 'button' }, span({ part: 'label' }, 'Click'))
  ]

  render(): void {
    super.render()
    this.parts.label.textContent = this.myProperty
  }
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

To find form-associated components, grep `src/` for `formAssociated = true`.

### Code Editor (CodeMirror 6)

`<tosi-code>` (`src/code-editor.ts`) is a [CodeMirror 6](https://codemirror.net/) wrapper. The heavy CM code lives in `src/code-editor-cm.ts` and is loaded **lazily on first use** via a dynamic import — a page with no `<tosi-code>` bundles none of it.

Public surface (this is the contract; the pre-1.7 ACE `theme`/`options` props were **dropped** — breaking):
- `value` — the code; `mode` — language (`javascript`, `typescript`, `tjs`, `ajs`, `css`, `html`, `markdown`)
- `disabled` → CM `readOnly`
- `change` event fires on edits (`detail.value`)
- `editor` property exposes the underlying CM `EditorView` (undefined until loaded)
- `undo()` / `redo()` / `canUndo()` / `canRedo()` for history; `showDiff(on)` diffs `value` against a captured baseline via `tosi-diff`
- Dark mode is driven by a `highlight` Compartment + a MutationObserver on `body.darkmode`; the editor background is themed from `--code-bg` / `--text-color` via `EditorView.theme`

**tjs/ajs modes** async-load tjs-lang's CodeMirror language + completion extensions (`loadTjsExtension()` → `setLanguageExtension()`). **Critical packaging constraint:** the tjs CM extension MUST share the editor's single CodeMirror instance — a separately-loaded copy carries its own `@codemirror/state` and silently no-ops. The iife build therefore *bundles* the tjs-lang CM extension (it's a prefix-match exclusion from `external`, keeping only the two `/browser` transpiler subpaths external). See memory / `codemirror-tjs-1.7-plan.md` for the full migration context.

### Subpath Exports & Tree-Shaking

`package.json` `exports` expose stable subpaths — `tosijs-ui/site`, `/icons`, `/code-editor`, `/live-example`, `/doc-browser`, `/diff`, `/theme` — plus a `./*` wildcard so `import 'tosijs-ui/rating'` resolves to `dist/rating.js` and registers just that element.

**Do NOT set a blanket `sideEffects: false`.** `elementCreator()` registers custom elements *eagerly at import time*, so a bare `import 'tosijs-ui'` tree-shakes to zero registrations under it. Per-component entry points (the Lit/Shoelace model) are the correct tree-shaking path. Components that inject global styles/listeners (menu/tooltip/float) do so on **first use** (`ensureMenu`/`ensureTooltipStyles`/`ensureFloatListeners`), not at import, to keep imports side-effect-light.

**Never add a `browser` export condition pointing at the iife.** The iife (`dist/iife.js`) inlines tosijs + marked and is not ESM — it is for CDN `<script>` tags and naive doc-sites only, never reachable via `import`.

### Documentation System

Components are self-documenting via `/*#` comment blocks containing markdown. Control nav ordering with JSON metadata:
- `/*{ "pin": "top" }*/` or `<!--{ "pin": "top" }-->` for pinning

The `createDocBrowser()` function renders documentation from extracted `docs.json`. It supports three `routing` modes (`DocRoutingMode` in `src/doc-browser.ts`):
- `'query'` (default, legacy SPA): links are `?filename`; uses `popstate`.
- `'path'`: clean per-page `/slug/` URLs, for the static pre-rendered site.
- `'memory'`: self-contained — never reads/writes `window.history`/`location` or the `__docTestResults` global, so an embedded/nested browser can't hijack the host page's URL. Drive it via `initialRoute` + `onRouteChange` and the element's `.navigate(slug)` method.

#### Doc extraction & Markdown (`src/doc-system/site/docs.ts`, `render.ts`)

Extraction rules (learn these to avoid surprises):
- A `/*# … */` block is a doc **only when it starts a line** (whitespace-only before the `/`). A `/*#` inside a `//` comment, a string, or mid-line is NOT scraped — so don't worry about writing `/*#` in prose/comments. (Regex: `/^[ \t]*(\/\*#[\s\S]+?\*\/)/gm`.)
- Files whose name starts with `_` (`_template.md`, `_drafting-log.md`) are **skipped** — use the prefix for scaffolding/working files.
- **YAML frontmatter** (a leading `---\n…\n---`) is parsed & stripped (`parseFrontmatter`): maps `title`/`order`/`author`/`date`/`draft`(→`hidden`). Frontmatter **wins** over the JSON-comment metadata; an empty `title` falls back to the H1; a bare `---` rule is left as content.
- `renderDocMarkdown` (the ONE renderer for build + client) adds prose Markdown on top of marked, each activating **only on its own syntax** (code docs unaffected): `[[slug]]` / `[[slug|label]]` **wikilinks** → `/slug/` (not inside code spans), and `[^id]` **footnotes** → numbered refs + an endnotes `<section>`. A fence info string may carry `#id` (```` ```js#my-example ````) to give that live example a stable anchor.

#### Static doc-site system (`tosijs-ui/site`)

`src/doc-system/site/` (exported as `tosijs-ui/site`, with `defineSiteConfig`/`buildSite`/`devServer`) turns a project's markdown + `/*#` block comments into a **static, pre-rendered, hydrating** documentation site: one `/{slug}/index.html` per doc with real `<head>` metadata, no-JS readable, zero-flash hydration into the live `<tosi-doc-system>` browser, plus `sitemap.xml`/`robots.txt`. Output is a plain folder of static files for any static host. The canonical reference is `src/doc-system/doc-site-system.md` — read it before working on this system. Note (per memory): `devServer(config, { build })` takes the consumer's **full** build, not just `buildSite`, because `buildSite` does `rm -rf` on the output dir on watch rebuild and would otherwise drop sibling artifacts (e.g. a separate iife bundle).

**Agent-eyes-on-the-dev-page (`haltijaDev`)**: set `haltijaDev: true` in the site config (or `HALTIJA_DEV=1`) and `bun start` injects a localhost-gated one-line loader into served HTML that pulls haltija's dev-channel `dev.js` from a local server-only HTTPS channel it spins up on 8701 — so a coding agent can drive your real running page via the `hj` CLI. Injected at **serve time only** (never in the built `docs/`) and **never bundled** (runtime `import()` from the local server), so it's zero-cost and self-disables off localhost. This is the preferred way for an agent to get eyes on this project in-browser — use `hj`, not the Claude-in-Chrome extension. See doc-site-system.md → "`haltijaDev`".

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

See `package.json` for current versions. The notable ones:

- `tosijs`: Core component framework (peer + dev dep)
- `marked`: Markdown parsing (peer dep)
- `tjs-lang`: live-example transpiler (optional peer dep, lazy-loaded — a plain component consumer never pulls it in). Live examples load its **self-contained browser bundles** (`tjs-lang/browser` + `tjs-lang/browser/from-ts`; the TypeScript compiler lazy-loads from a CDN only for `ts` examples). Load order: installed peer → **same-origin** copy the doc-site build ships under `/tjs/` (via `__TJS_LOCAL_BASE`) → CDN chain (jsdelivr → unpkg → esm.sh). The version is pinned by `TJS_VERSION` in `src/live-example/code-transform.ts` — **bump it in lockstep with the dep** when upgrading. (Replaced `sucrase`, which is gone.)
- `happy-dom`: DOM simulation for unit tests (dev dep); also the ePub builder's HTML→XHTML pass. `@resvg/resvg-js`: rasterizes the generated ePub cover. Both `happy-dom` and `@resvg/resvg-js` are **optional peer deps** (`peerDependenciesMeta.optional`) as well as dev deps — an adopter building ePubs via `tosijs-ui/site` needs them installed (both are lazy-loaded with a graceful fallback + warning when absent).
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

### Icon Composition

The icon system (introduced in 1.5.10) supports a compact composition language for combining and modifying icons inline. SVG sources live in `icons/` (subdirs `color/`, `filled/`, `stroked/`); `bin/make-icon-data.js` regenerates `src/icon-data.ts` when files there change.

The composition language uses single-character suffixes on icon names — e.g. size, fill/stroke color, x/y offset, rotation, weight — and `$` to stack multiple icons into one composite. Examples like `tool_fffF70s50x$tosi` (a tool overlaid on a person), `spin90Loader` (a rotated spinning loader), and `messageCircle80s70x_60y1W_fffF$tosiHat$glasses4y$coat$tosi` (a multi-layer composite) appear throughout the demos.

See `icons/icon-composition.md` for the full grammar — suffix codes (`o/s/r/f/x/y/F/S/W`), stacking (`$`), prefix rules, redirects, and `spin`. When working with icons, read that file first rather than guessing the syntax.

### Component Philosophy

- Work with the browser, not against it
- `value` property for state, `change` event when it changes
- `action` event for user interactions (distinct from value changes)
- Binary attributes (`hidden`, `disabled`) work as expected
- Interoperable with other web-component libraries

**Pinned-element class naming** — when a component supports pinning (sticky cells/rows), it tags the pinned elements and the boundary touching the unpinned area with parallel classes:
- Cells: `col-pinned` on every pinned column cell; `col-edge-right` on the rightmost left-pinned column (right edge of the left-pinned group), `col-edge-left` on the leftmost right-pinned column.
- Rows: `row-pinned` on every pinned row; `row-edge-bottom` on the bottom-most pinned-top row (the boundary below the pinned-top group), `row-edge-top` on the top-most pinned-bottom row.

The edge-class name describes which side of the pinned group the boundary is on, not which side of the viewport — so a new pinning context (e.g. `tab-pinned` + `tab-edge-*`) should follow the same convention.

For the consumer-facing mental model — element-creator pattern, value/change/action contract, form association, theming, localization, and a "fighting the framework" anti-pattern checklist — see `Using-Components.md` at the repo root. Read it before answering questions about how a component should be used.

## Publishing

1. Update version in `package.json`
2. Run `bun tests` to verify all tests pass
3. Build: `bun run build`
4. Commit changes including `dist/` and `docs/`
5. Tag release: `git tag v1.x.x`
6. Push: `git push --tags`

## Task Tracking

Open tasks and planned work are tracked in `TODO.md` at the project root.
