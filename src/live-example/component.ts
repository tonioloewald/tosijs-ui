/*#
# example

`<tosi-example>` makes it easy to insert interactive code examples in a web page. It
started life as a super lightweight, easier-to-embed implementation of
[b8rjs's fiddle component](https://b8rjs.com)—which I dearly missed—but now the student
is, by far, the master. And it's still super lightweight.

*You're probably looking at it right now.*

```js
// this code executes in an async function body
// it has tosijs, tosijsui, and preview (the preview div) available as local variables
import { div } from 'tosijs'.elements
preview.append(div({class: 'example'}, 'fiddle de dee!'))
preview.append('Try editing some code and hitting refresh…')
```
```html
<h2>Example</h2>
```
```css
.preview {
  padding: 0 var(--spacing);
}

.example {
  animation: throb ease-in-out 1s infinite alternate;
}

@keyframes throb {
  from { color: blue }
  to { color: red }
}
```

## How examples run: one shared page (read this)

By default every example on a page runs **inline — in the page's own document and
JavaScript realm**, not in a sandbox. Each example gets its own `preview` element
(and its `css` is scoped to that preview), but they all share the one `tosijs`
module, so **`tosi()` state singletons are shared across every example on the page**.

This is a deliberate choice, and it buys two things:

1. It's a live demonstration of how clean tosi's isolation is — many independent
   components mount into one page and coexist without stepping on each other's DOM.
2. You can drive any demo from the console (or from another example) through the same
   global singleton — the state is right there, not walled off in a frame.

The trade-off is the gotcha to know about: **examples can see and clobber each
other's state.** Two examples that both do `tosi({ app: … })` bind to the *same*
`app` singleton (the tosi registry is keyed by the top-level name), so one overwrites
the other — and you get "impossible" bugs where an example misbehaves only when some
*other* example happens to be on the same page. Worth it, but plan for it:

- **Namespace your state.** Give each example a unique top-level key
  (`tosi({ ratingDemo: … })`, not a generic `tosi({ app: … })`).
- Prefer local variables and `preview`-scoped DOM over shared singletons when a demo
  doesn't need to be globally reachable.
- In `test` blocks, assert with **counts / deltas**, not presence/absence — other
  examples may have left their elements in the DOM.

For real isolation of the **DOM and CSS**, add the `iframe` attribute (below). Note
it does **not** isolate tosijs *state*: the `tosijs`/`tosijs-ui` handed to an iframe
example are still the host page's module instances, so `tosi()` singletons stay
shared. Namespacing is the fix for state; `iframe` is the fix for DOM/CSS bleed.

## Source dialects: `js`, `tjs`, `ts`

The executable block's fence language picks how the source is compiled before it
runs, via [tjs-lang](https://www.npmjs.com/package/tjs-lang):

- **`js`** — plain JavaScript, run as-is (tjs's `dialect: 'js'` leaves vanilla JS
  untouched, so there's no surprise rewriting).
- **`tjs`** — [tjs-lang](https://www.npmjs.com/package/tjs-lang) source, lowered to
  JavaScript. Type annotations and tjs's safety transforms are compiled away.
- **`ts`** — TypeScript, lowered to tjs (via `tjs-lang/browser/from-ts`) and then to
  JavaScript. The TypeScript compiler loads lazily, only for pages that use it.

A `tjs` block — note the type annotation (which a plain `js` block couldn't run)
and the inline `test '…' { … }` unit test. Open the code panel: the source tab
is labeled **tjs**, with read-only **JS** (the compiled output) and **tjs tests**
(the inline-test results) tabs, alongside the **DOM tests** tab.

```tjs
import { div } from 'tosijs'.elements

function badge(label: string, n: number) {
  return `${label}: ${n}`
}

test 'badge formats label and number' {
  expect(badge('count', 42)).toBe('count: 42')
}

preview.append(div({ class: 'badge' }, badge('count', 42)))
```
```test
test('tjs example transpiled and ran', () => {
  const badge = preview.querySelector('.badge')
  expect(badge).not.toBe(null)
  expect(badge.textContent).toBe('count: 42')
})
```

The inline test above is tjs's native `test '…' { … }` syntax. In a *TypeScript*
example the equivalent is written inside a comment (so it survives `tsc`) — but
that comment form can't appear inside a doc comment like this one, since the
test's own closing delimiter would end the doc comment.

## Inline WebAssembly (SIMD)

A `tjs` example can drop a hot loop into **WebAssembly** with a `wasm { … } fallback
{ … }` block — compiled to bytecode *at transpile time*, embedded as base64, and run
in your browser. No Emscripten, no `.wasm` file, no build step, no server.

WASM earns its keep with **SIMD**: scalar WASM roughly ties the JS JIT, but a
branchless `f32x4` kernel does four values per instruction. Below, a field of a few
thousand particles is held on a grid by springs and pushed aside by your pointer —
every particle's position updated four at a time in WASM SIMD. **Click the button to
toggle WASM ↔ JavaScript** and watch the per-step time — the same code, one path
compiled to SIMD bytecode:

```tjs
// One physics step for the whole field, 4 particles per iteration with f32x4 SIMD:
// a spring pulls each particle to its home cell, and an inverse-square push shoves
// it away from the pointer. Pure arithmetic — no per-lane branches (tjs's f32x4 has
// no compare/select yet), which is exactly what SIMD wants. `fallback { }` is the
// scalar-JS twin.
function step(! px: Float32Array, py: Float32Array, vx: Float32Array, vy: Float32Array, hx: Float32Array, hy: Float32Array, n: 0, tx: 0.0, ty: 0.0) {
  wasm {
    let txv = f32x4_splat(tx)
    let tyv = f32x4_splat(ty)
    let spring = f32x4_splat(0.03)
    let damp = f32x4_splat(0.86)
    let repel = f32x4_splat(1600.0)
    let soft = f32x4_splat(140.0)
    for (let i = 0; i < n; i = i + 4) {
      let off = i * 4
      let x = f32x4_load(px, off)
      let y = f32x4_load(py, off)
      let sx = f32x4_mul(f32x4_sub(f32x4_load(hx, off), x), spring)
      let sy = f32x4_mul(f32x4_sub(f32x4_load(hy, off), y), spring)
      let rx = f32x4_sub(x, txv)
      let ry = f32x4_sub(y, tyv)
      let push = f32x4_div(repel, f32x4_add(f32x4_add(f32x4_mul(rx, rx), f32x4_mul(ry, ry)), soft))
      let nvx = f32x4_mul(f32x4_add(f32x4_load(vx, off), f32x4_add(sx, f32x4_mul(rx, push))), damp)
      let nvy = f32x4_mul(f32x4_add(f32x4_load(vy, off), f32x4_add(sy, f32x4_mul(ry, push))), damp)
      f32x4_store(vx, off, nvx)
      f32x4_store(vy, off, nvy)
      f32x4_store(px, off, f32x4_add(x, nvx))
      f32x4_store(py, off, f32x4_add(y, nvy))
    }
  } fallback {
    for (let i = 0; i < n; i++) {
      const sx = (hx[i] - px[i]) * 0.03, sy = (hy[i] - py[i]) * 0.03
      const rx = px[i] - tx, ry = py[i] - ty
      const push = 1600.0 / (rx * rx + ry * ry + 140.0)
      const nvx = (vx[i] + sx + rx * push) * 0.86, nvy = (vy[i] + sy + ry * push) * 0.86
      vx[i] = nvx; vy[i] = nvy; px[i] += nvx; py[i] += nvy
    }
  }
}

// 100k particles, not 6k. At 6k each step took ~0.02ms — right at the resolution floor
// of performance.now(), so the readout was mostly measuring the timer. At this size both
// paths land in the hundreds of microseconds and the comparison actually means something.
const W = 480, H = 300, cols = 400, rows = 250, N = cols * rows

// Allocate the particle arrays INSIDE wasm memory. This is the whole ballgame: if a
// typed array's buffer isn't the wasm memory, every call copies it in and out again —
// six 6,000-float arrays per frame — and you end up timing memcpy, not SIMD. (With
// plain `new Float32Array(N)` this demo measured ~4x SLOWER than its own JS fallback.)
// `wasmBuffer` is a bump allocator handing out views into the shared wasm memory, so
// the wrapper passes a byte offset and copies nothing. Fall back gracefully if the
// wasm block didn't compile, so the JS twin still runs.
const f32 = (n) => globalThis.wasmBuffer ? wasmBuffer(Float32Array, n) : new Float32Array(n)
const px = f32(N), py = f32(N)
const vx = f32(N), vy = f32(N)
const hx = f32(N), hy = f32(N)
for (let i = 0; i < N; i++) {
  const c = i % cols, r = (i / cols) | 0
  hx[i] = (c + 0.5) * W / cols
  hy[i] = (r + 0.5) * H / rows
  px[i] = hx[i]
  py[i] = hy[i]
}

const canvas = document.createElement('canvas')
canvas.width = W
canvas.height = H
canvas.style.cssText = 'width:100%;max-width:480px;border-radius:8px;display:block;background:#0b0e14;touch-action:none;cursor:crosshair'
const ctx = canvas.getContext('2d')

// Plot straight into an ImageData buffer (one 32-bit store per particle) instead of
// 100k fillRect() calls — otherwise the DRAW would dominate and we'd be benchmarking
// canvas, not the kernel.
const img = ctx.createImageData(W, H)
const pix = new Uint32Array(img.data.buffer)
const BG = 0xff140e0b        // #0b0e14, little-endian ABGR
const TEAL = 0xffc5d14f      // #4fd1c5
const AMBER = 0xff55adf6     // #f6ad55

let tx = W / 2, ty = H / 2, idle = 0, frame = 0
canvas.addEventListener('pointermove', (e) => {
  const r = canvas.getBoundingClientRect()
  tx = (e.clientX - r.left) / r.width * W
  ty = (e.clientY - r.top) / r.height * H
  idle = 0
})

// tjs-lang 0.9.1+ gates every wasm call on `globalThis.__tjs_wasm_enabled`, so this
// flips the kernel between WASM and its JS twin without touching tjs internals.
// (Don't reach for `__tjs_wasm_0` — it's private AND index-keyed per transpile, so
// a second wasm example on the page registers the same name and you'd clobber it.)
let useWasm = true
const btn = document.createElement('button')
btn.style.cssText = 'margin:8px 0;padding:6px 12px;border-radius:6px;cursor:pointer'
const readout = document.createElement('p')
let acc = 0, frames = 0
function applyMode() {
  globalThis.__tjs_wasm_enabled = useWasm
  acc = 0; frames = 0 // don't average across a mode switch
  btn.textContent = useWasm ? '⚡ WebAssembly SIMD — click for JavaScript' : '🐢 JavaScript — click for WASM SIMD'
}
btn.onclick = () => { useWasm = !useWasm; applyMode() }

// Warm BOTH paths before timing anything. The JS twin never executes until you click
// over to it, so an un-warmed comparison times cold, un-JITed JavaScript and flatters
// WASM (it read ~2x too good). A warmed V8 does this kernel in ~0.024 ms/step; the
// zero-copy SIMD kernel does ~0.015 — a real but modest ~1.6x, which is the honest
// number this demo should show.
function warmUp() {
  for (const on of [false, true]) {
    globalThis.__tjs_wasm_enabled = on
    for (let i = 0; i < 150; i++) step(px, py, vx, vy, hx, hy, N, W / 2, H / 2)
  }
  // the warm-up perturbed the particles — put them back on the grid
  for (let i = 0; i < N; i++) { px[i] = hx[i]; py[i] = hy[i]; vx[i] = 0; vy[i] = 0 }
}
function loop() {
  if (!document.body.contains(canvas)) return // example removed → stop
  frame++
  idle++
  if (idle > 45) {
    tx = W / 2 + Math.cos(frame * 0.02) * W * 0.32
    ty = H / 2 + Math.sin(frame * 0.031) * H * 0.32
  }
  const t0 = performance.now()
  step(px, py, vx, vy, hx, hy, N, tx, ty)
  acc += performance.now() - t0
  frames++

  pix.fill(BG)
  const dot = useWasm ? TEAL : AMBER
  for (let i = 0; i < N; i++) {
    const x = px[i] | 0, y = py[i] | 0
    if (x >= 0 && x < W && y >= 0 && y < H) pix[y * W + x] = dot
  }
  ctx.putImageData(img, 0, 0)

  if (frames >= 20) {
    readout.textContent = N.toLocaleString() + ' particles · ' + (acc / frames).toFixed(3) +
      ' ms/step (' + (useWasm ? 'WASM SIMD' : 'JS') + ') · move the pointer'
    acc = 0
    frames = 0
  }
  requestAnimationFrame(loop)
}

;(async () => {
  // The wasm bootstrap is async. tjs-lang 0.9.1+ exposes an awaitable ready signal,
  // so we start only once the kernel is instantiated — otherwise the first frames
  // silently run the JS fallback while the button claims "WebAssembly SIMD".
  await globalThis.__tjs_wasm_ready?.()
  warmUp()
  applyMode()
  requestAnimationFrame(loop)
})()

preview.append(canvas, btn, readout)
```

```test
// Guard the claim the button makes. A `wasm {}` block that fails to compile falls
// back to JS *silently*, so without this the demo can advertise "⚡ WebAssembly SIMD"
// while running the JS twin, and every test stays green.
test('the wasm kernel actually compiled (no silent fallback to JS)', async () => {
  await globalThis.__tjs_wasm_ready?.()
  expect(typeof globalThis.__tjs_wasm_ready).toBe('function')
  expect(globalThis.__tjs_wasm_0).toBeTruthy()
})
```

## CSS Isolation with `iframe`

Add the `iframe` attribute to render the preview inside an iframe, giving the example
its own document, CSS scope, and custom-element registry. Reach for it when a demo's
styles would otherwise leak into (or get leaked on by) the rest of the page.

It isolates **DOM and CSS, not state.** The `tosijs`/`tosijs-ui` modules injected
into the iframe are the host page's own instances, so `tosi()` singletons remain
shared across every example (see "How examples run" above). Namespace your state to
keep examples from stomping each other; use `iframe` when you need visual/DOM
isolation.

*Fully-isolated examples (a separate module realm, so even `tosi()` state and
imported dependencies are sandboxed — the way tjs-lang's playgrounds do it with a
service worker intercepting imports) are a possible future option. For **actual
examples** the shared-page default is usually the nicer behavior: it shows off tosi's
isolation and lets you poke demos through the live global state.*

## Test Blocks

Add \`\`\``test` code blocks to write inline tests that run against the preview:

```html
<button class="demo-btn">Click me</button>
```
```js
preview.querySelector('.demo-btn').onclick = () => {
  preview.querySelector('.demo-btn').textContent = 'Clicked!'
}
```
```test
test('button exists', () => {
  const btn = preview.querySelector('.demo-btn')
  expect(btn).toBeDefined()
  expect(btn.textContent).toBe('Click me')
})

test('slow test shows running state', async () => {
  await waitMs(500)
  expect(true).toBe(true)
})
```

Tests have access to:
- `preview` - the DOM element containing the rendered HTML
- `expect(value)` - Jest-like assertions (.toBe, .toEqual, .toBeTruthy, etc.)
- `test(name, fn)` - define a test case (can be async)
- `describe(name, fn)` - group tests
- `waitMs(ms)` - wait for a specified number of milliseconds
- `waitFor(selector, timeout?)` - wait for an element to appear (default 1s timeout)
- All context libraries (tosijs, tosijs-ui, etc.)

### Async Tests

Tests can be async functions. Use `waitMs` for simple delays and `waitFor` to wait
for dynamically created elements:

```html
<button class="async-btn">Load Data</button>
<div class="result"></div>
```
```js
preview.querySelector('.async-btn').onclick = () => {
  setTimeout(() => {
    preview.querySelector('.result').innerHTML = '<span class="data">Loaded!</span>'
  }, 100)
}
// Auto-click to trigger the async behavior
preview.querySelector('.async-btn').click()
```
```test
test('waitFor finds dynamically created element', async () => {
  const data = await waitFor('.data')
  expect(data.textContent).toBe('Loaded!')
})

test('waitMs delays execution', async () => {
  const start = Date.now()
  await waitMs(50)
  expect(Date.now() - start).toBeGreaterThan(40)
})
```

## `context`

A `<tosi-example>` is given a `context` object which is the set of values available
in the javascript's execution context. The context always includes `preview`.

```
import * as tosijs from 'tosijs'
import * as tosijsui from 'tosijs-ui'

context = {
  tosijs,
  'tosijs-ui': tosijsui
}
```
*/

/*{ "parent": "Components" }*/

import { Component, ElementCreator, elements, tosi } from 'tosijs'
import { codeEditor, CodeEditor } from '../code-editor'
import { tosiTabs } from '../tab-selector'
import { icons } from '../icons'
import { popMenu } from '../menu'

import { Dialect, ExampleContext, ExampleParts, TransformFn } from './types'
import {
  loadTransform,
  loadTjsTestApi,
  rewriteImports,
  contextVarName,
  AsyncFunction,
  TjsTestResult,
} from './code-transform'
import {
  STORAGE_KEY,
  createRemoteKey,
  RemoteSyncManager,
  openEditorWindow,
} from './remote-sync'
import { executeInline, executeInIframe } from './execution'
import { insertExamples } from './insert-examples'
import {
  rewriteExampleBlocks,
  groupExamples,
  findFencedBlocks,
} from './save-to-source'
import {
  exampleEditKey,
  saveExampleEdit,
  loadExampleEdit,
  clearExampleEdit,
  hasExampleEdit,
  ExampleEdit,
} from './example-store'
import { liveExampleStyleSpec } from './styles'
import { runTests, TestResults } from './test-harness'

const { div, tosiSlot, style, button, pre, span } = elements

// Test mode: controlled by localStorage, defaults to enabled on localhost
const TESTS_ENABLED_KEY = 'tosijs-ui-tests-enabled'

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1')

function getStoredTestsEnabled(): boolean {
  if (typeof localStorage === 'undefined') return false
  const stored = localStorage.getItem(TESTS_ENABLED_KEY)
  if (stored !== null) {
    return stored === 'true'
  }
  // Default: enabled on localhost, disabled elsewhere
  return isLocalhost
}

// Test manager - observable state for test mode
export const { testManager } = tosi({
  testManager: {
    enabled: getStoredTestsEnabled(),
  },
})

// Set CSS variable on body for test visibility (CSS vars pierce shadow DOM)
function updateTestsEnabledClass() {
  document.body.classList.toggle('tests-enabled', testManager.enabled.value)
  document.body.style.setProperty(
    '--tests-enabled',
    testManager.enabled.value ? '1' : '0'
  )
}
if (typeof document !== 'undefined') {
  // Set initial state when DOM is ready
  if (document.body) {
    updateTestsEnabledClass()
  } else {
    document.addEventListener('DOMContentLoaded', updateTestsEnabledClass)
  }
}

/** Enable test mode (runs tests and shows indicators) */
export function enableTests(): void {
  localStorage.setItem(TESTS_ENABLED_KEY, 'true')
  testManager.enabled.value = true
  updateTestsEnabledClass()
  // Re-run tests on all existing examples
  document.querySelectorAll('tosi-example').forEach((el) => {
    ;(el as LiveExample).refresh()
  })
}

/** Disable test mode */
export function disableTests(): void {
  localStorage.setItem(TESTS_ENABLED_KEY, 'false')
  testManager.enabled.value = false
  updateTestsEnabledClass()
}

export class LiveExample extends Component<ExampleParts> {
  static preferredTagName = 'tosi-example'
  static lightStyleSpec = liveExampleStyleSpec

  static initAttributes = {
    persistToDom: false,
    iframe: false,
  }

  prefix = 'lx'
  storageKey = STORAGE_KEY
  context: ExampleContext = {}
  // The example's top-level locals from the latest run, captured in-run for tjs
  // runtime-value autocomplete (see `liveBindings`). Populated via `onScope`.
  private capturedScope: Record<string, unknown> = {}
  uuid: string = crypto.randomUUID()
  remoteId = ''

  private remoteSync?: RemoteSyncManager
  private undoInterval?: ReturnType<typeof setInterval>
  private testResults?: TestResults
  private pendingValues: Record<string, string> = {}
  private pendingShowDefaultTab = false
  private beforeUnloadHandler?: () => void
  // The code-editor panel (the 4 <tosi-code> editors + toolbar) is built LAZILY on
  // first showCode, NOT in content() — so a reader who never opens a panel never
  // pulls the CodeMirror chunk. Until then, values live in `pendingValues` (the same
  // cache used pre-hydration) and the preview runs from them. See
  // self-contained-examples-plan.md slice 3.
  private editorsBuilt = false

  static insertExamples(
    element: HTMLElement,
    context: ExampleContext = {},
    sourceFile?: string
  ): void {
    insertExamples(
      element,
      context,
      liveExample,
      LiveExample.tagName as string,
      sourceFile
    )
  }

  get activeTab(): Element | undefined {
    if (!this.editorsBuilt) return undefined
    const { editors } = this.parts
    return [...editors.children].find(
      (elt) => elt.getAttribute('hidden') === null
    )
  }

  // Hydration state is the base class's `this.hydrated`, as of tosijs 1.6.9. This file
  // used to hand-roll it as `try { return this.parts.js !== undefined } catch { false }`
  // — the one probe you must never write, since reading `parts` before hydration bound
  // the proxy to the light-DOM element permanently (it survived only by accident of
  // being light-DOM, where the root never flips). 1.6.9 invalidates the proxy at hydrate
  // and exposes `hydrated`/`whenHydrated`, so the hand-roll is gone. (tosijs#13.)

  private getEditorValue(which: string): string {
    // Until the editors are built (a reader who never opens a panel, or pre-
    // hydration) the string cache is the source of truth.
    if (!this.editorsBuilt) return this.pendingValues[which] ?? ''
    return (this.parts[which] as CodeEditor).value
  }

  private setEditorValue(which: string, code: string): void {
    if (!this.editorsBuilt) {
      this.pendingValues[which] = code
      return
    }
    const codeEditor = this.parts[which] as CodeEditor
    codeEditor.value = code
  }

  private flushPendingValues(): void {
    for (const [which, code] of Object.entries(this.pendingValues)) {
      const codeEditor = this.parts[which] as CodeEditor
      if (codeEditor) codeEditor.value = code
    }
    this.pendingValues = {}

    if (this.pendingShowDefaultTab) {
      this.pendingShowDefaultTab = false
      this.showDefaultTab()
    }
  }

  get css(): string {
    return this.getEditorValue('css')
  }
  set css(code: string) {
    this.setEditorValue('css', code)
  }

  get html(): string {
    return this.getEditorValue('html')
  }
  set html(code: string) {
    this.setEditorValue('html', code)
  }

  get js(): string {
    return this.getEditorValue('js')
  }
  set js(code: string) {
    this.setEditorValue('js', code)
  }

  get test(): string {
    return this.getEditorValue('test')
  }
  set test(code: string) {
    this.setEditorValue('test', code)
  }

  get remoteKey(): string {
    return createRemoteKey(this.prefix, this.uuid, this.remoteId)
  }

  // The source block's dialect (js | tjs | ts). Set by insert-examples from the
  // fenced-block language; persisted as an attribute so it survives a re-render.
  // `js` is the default and keeps the original pass-through behavior.
  get dialect(): Dialect {
    return (this.getAttribute('data-dialect') as Dialect) || 'js'
  }
  set dialect(value: Dialect) {
    this.setAttribute('data-dialect', value)
  }

  // Build-time transpiled JS for the source block, set by insert-examples from the
  // page's baked `<script type="application/tosi-transpiled">` (see
  // self-contained-examples-plan.md). When present AND tests are off (the deployed
  // reader), refresh() runs it directly and never loads the tjs transpiler. When
  // tests are on (localhost / the doc-test harness) it's ignored and refresh() takes
  // the original full-transform path — so the harness can't be regressed. Runtime
  // data only (not reflected to an attribute); absent on client-rendered SPA nav,
  // where refresh() falls back to transpiling on demand.
  compiledJs?: string

  // ── Read-only product tabs (tjs/ts only) ──────────────────────────────────
  // A `tjs`/`ts` example's source is editable; the JavaScript it compiles to is
  // shown read-only in an extra "JS" tab. The tab is added lazily (examples show
  // every named editor as a tab, so a static child would pollute plain-`js`
  // examples) the first time the code panel opens. `js` examples get nothing.
  private jsOutEditor?: CodeEditor
  private tjsTestsView?: HTMLElement
  private productTabsReady = false
  private lastGeneratedJs = ''
  private inlineTjsTestCount = 0
  private lastTjsTests?: TjsTestResult

  // Run the example's inline tjs tests (the `/*test 'desc' { … }*/` comments in
  // the tjs/ts source — distinct from the DOM-testing `test` block). Extract +
  // strip the tests, transpile the rest the same way execution does, then run
  // `execJs + testUtils + return testRunner` with the example context injected.
  private async runInlineTjsTests(transform: TransformFn): Promise<void> {
    if (this.dialect === 'js') {
      this.inlineTjsTestCount = 0
      return
    }
    const api = await loadTjsTestApi()
    if (!api) {
      this.inlineTjsTestCount = 0
      return
    }
    let extracted
    try {
      extracted = api.extractTests(this.js)
    } catch {
      this.inlineTjsTestCount = 0
      return
    }
    this.inlineTjsTestCount = extracted.tests.length
    if (extracted.tests.length === 0) {
      this.lastTjsTests = undefined
      this.renderTjsTests()
      return
    }
    try {
      const execJs = (
        await transform(
          rewriteImports(extracted.code, Object.keys(this.context))
        )
      ).code
      const body = `${execJs}\n${api.testUtils}\nreturn ${extracted.testRunner}`
      // The test-stripped source still runs its top-level statements (to define
      // the functions under test), which may touch `preview` — give them a
      // throwaway one, mirroring execution's `{ preview, ...context }` scope.
      const fullContext = {
        preview: div({ class: 'preview' }),
        ...this.context,
      }
      const keys = Object.keys(fullContext).map(contextVarName)
      const values = Object.values(fullContext)
      // @ts-expect-error AsyncFunction constructor typing
      const fn = new AsyncFunction(...keys, body)
      this.lastTjsTests = (await fn(...values)) as TjsTestResult
    } catch (error) {
      this.lastTjsTests = {
        passed: 0,
        failed: 1,
        results: [
          {
            description: 'inline tests failed to run',
            passed: false,
            error: String(error),
          },
        ],
      }
    }
    this.renderTjsTests()
  }

  private renderTjsTests(): void {
    const view = this.tjsTestsView
    if (!view) return
    const results = this.lastTjsTests
    if (!results || results.results.length === 0) {
      view.replaceChildren(
        div({ class: 'tjs-test-empty' }, 'No inline tjs tests.')
      )
      return
    }
    view.replaceChildren(
      div(
        { class: 'tjs-test-summary' },
        `${results.passed}/${results.results.length} passed`
      ),
      ...results.results.map((r) =>
        div(
          { class: r.passed ? 'test-pass' : 'test-fail' },
          `${r.passed ? '✓' : '✗'} ${r.description}`,
          r.error ? span({ class: 'tjs-test-error' }, ` — ${r.error}`) : ''
        )
      )
    )
  }

  // The JavaScript `this.js` compiles to under the current dialect — the same
  // pipeline execution runs (rewriteImports → dialect transform), so the tab
  // shows what actually executes. Transpile errors render as a comment.
  private async computeGeneratedJs(transform: TransformFn): Promise<string> {
    if (this.dialect === 'js') return ''
    try {
      return (
        await transform(rewriteImports(this.js, Object.keys(this.context)))
      ).code
    } catch (error) {
      return `// transpile error:\n// ${(error as Error).message}`
    }
  }

  private ensureProductTabs(): void {
    if (
      this.productTabsReady ||
      this.dialect === 'js' ||
      !this.hydrated ||
      !this.editorsBuilt // the editors it relabels don't exist yet
    )
      return
    this.productTabsReady = true
    const { editors } = this.parts
    // Relabel the source tab from "js" to the actual dialect (the `part` stays
    // `js`, so everything referencing this.parts.js / this.js is unaffected), and
    // put the source editor in the dialect's mode — so a `tjs` example gets
    // first-class tjs editing (highlighting + autocomplete), `ts` gets TypeScript.
    this.parts.js.setAttribute('name', this.dialect)
    // Runtime-value autocomplete: give the tjs completion source the example's live
    // bindings (context modules + the rendered preview) so it can suggest their REAL
    // members — including tosijs proxy members that static analysis can't see. Set
    // before `.mode` so the tjs extension loads with the config in one shot.
    this.parts.js.tjsAutocomplete = {
      getLiveBindings: () => this.liveBindings(),
    }
    this.parts.js.mode = this.dialect
    this.jsOutEditor = codeEditor({
      name: 'JS',
      mode: 'javascript',
      disabled: true,
    }) as unknown as CodeEditor
    editors.append(this.jsOutEditor)
    // Add a read-only "tjs tests" results tab only when the source has inline
    // `/*test*/` tests (computed during refresh, which runs before first open).
    if (this.inlineTjsTestCount > 0) {
      this.tjsTestsView = div({ name: 'tjs tests', class: 'tjs-test-results' })
      editors.append(this.tjsTestsView)
    }
    editors.setupTabs()
    this.jsOutEditor.value = this.lastGeneratedJs
    this.renderTjsTests()
  }

  // Capture the latest run's top-level locals (arrow property so `this` is bound
  // when passed as execution's `onScope`).
  private captureScope = (scope: Record<string, unknown>): void => {
    this.capturedScope = scope
  }

  /**
   * Live bindings for tjs runtime-value autocomplete: the example's context modules
   * (keyed by the identifier the rewritten code uses, e.g. `tosijs`, `tosijsui`),
   * the currently-rendered `preview` element, and the latest run's top-level locals
   * (so `const app = tosi(…)` gives real `app.` / `app.items.` completions, proxy
   * members and all). Read lazily on each completion, so it reflects the latest run.
   */
  private liveBindings(): Record<string, unknown> {
    const bindings: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(this.context)) {
      bindings[contextVarName(key)] = value
    }
    const preview = this.parts.example?.querySelector('.preview')
    if (preview) bindings.preview = preview
    // Run locals last so they win over same-named context entries.
    Object.assign(bindings, this.capturedScope)
    return bindings
  }

  updateUndo = () => {
    // The undo/redo buttons live in the lazy editor panel; only touch them once it's
    // built. The edited-indicator and test-results visibility work without editors
    // (they read the cached values / test state), so they always run.
    if (this.editorsBuilt) {
      const { activeTab } = this
      const { undo, redo } = this.parts
      if (activeTab instanceof CodeEditor) {
        undo.disabled = !activeTab.canUndo()
        redo.disabled = !activeTab.canRedo()
      } else {
        undo.disabled = true
        redo.disabled = true
      }
    }
    this.updateEditedIndicator()
    this.updateTestResultsVisibility()
  }

  private updateTestResultsVisibility(): void {
    const { testResults: resultsEl } = this.parts
    const results = this.testResults
    // The "DOM tests" tab's editor is this.parts.test (the part stays `test`
    // even though the tab label changed). No tab is active until the panel exists.
    const isTestTabActive =
      this.editorsBuilt && this.activeTab === this.parts.test
    const hasFailed = results && results.failed > 0

    // Show results if: has results AND (test tab is active OR there are failures)
    resultsEl.hidden =
      !results || results.tests.length === 0 || (!isTestTabActive && !hasFailed)
  }

  undo = () => {
    const { activeTab } = this
    if (activeTab instanceof CodeEditor) {
      activeTab.undo()
    }
  }

  redo = () => {
    const { activeTab } = this
    if (activeTab instanceof CodeEditor) {
      activeTab.redo()
    }
  }

  get isMaximized(): boolean {
    return this.classList.contains('-maximize')
  }

  flipLayout = () => {
    this.classList.toggle('-vertical')
  }

  // Persist this example's edits back to the source file's fenced blocks, located
  // by the source↔doc map (data-source-file + data-example-ordinal). Dev only —
  // writes via the /__docstore/source endpoint; the watcher then rebuilds.
  saveToSource = async (): Promise<void> => {
    const sourceFile = this.getAttribute('data-source-file')
    const ordinalAttr = this.getAttribute('data-example-ordinal')
    if (!sourceFile || ordinalAttr === null) {
      window.alert('No source mapping for this example.')
      return
    }
    let content: string
    try {
      const response = await fetch(
        `/__docstore/source?file=${encodeURIComponent(sourceFile)}`
      )
      if (!response.ok) throw new Error(String(response.status))
      content = await response.text()
    } catch {
      window.alert(
        'Source endpoint unavailable — saving to source works in dev only.'
      )
      return
    }
    const updated = rewriteExampleBlocks(content, Number(ordinalAttr), {
      js: this.js,
      html: this.html,
      css: this.css,
      test: this.test,
    })
    if (updated === null) {
      // Distinguish the two failure modes so a source↔doc mismatch is diagnosable
      // (vs. a genuine no-op). An ordinal past the source's group count means the
      // page and the file disagree on how many example groups exist — commonly a
      // file with more than one doc comment, or fenced blocks the doc extractor
      // treats differently from a raw scan (e.g. indented inside the comment).
      const ordinal = Number(ordinalAttr)
      const groups = groupExamples(content, findFencedBlocks(content))
      if (ordinal >= groups.length) {
        window.alert(
          `Couldn't locate this example in ${sourceFile}: it's example ` +
            `#${
              ordinal + 1
            } on the page, but a raw scan of the file finds only ` +
            `${groups.length} fenced example group(s). The page↔source ordinals ` +
            `disagree — likely multiple docs in one file, or indented fences. ` +
            `(File a report with the source structure.)`
        )
      } else {
        window.alert('No changes to save.')
      }
      return
    }
    try {
      const response = await fetch('/__docstore/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: sourceFile, content: updated }),
      })
      if (!response.ok) throw new Error(String(response.status))
      window.alert(`Saved to ${sourceFile}`)
    } catch {
      window.alert('Save failed.')
    }
  }

  exampleMenu = () => {
    const testsOn = testManager.enabled.value
    popMenu({
      target: this.parts.exampleWidgets,
      width: 'auto',
      menuItems: [
        {
          icon: 'edit2',
          caption: 'view/edit code',
          action: this.showCode,
        },
        {
          icon: 'edit',
          caption: 'view/edit code in a new window',
          action: this.openEditorWindow,
        },
        null,
        {
          icon: this.isMaximized ? 'minimize' : 'maximize',
          caption: this.isMaximized ? 'restore preview' : 'maximize preview',
          action: this.toggleMaximize,
        },
        null,
        {
          icon: testsOn ? 'check' : '',
          caption: 'Run tests',
          action: () => {
            if (testsOn) {
              disableTests()
            } else {
              enableTests()
            }
          },
        },
      ],
    })
  }

  handleShortcuts = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey) {
      let block = false
      switch (event.key) {
        case 's':
        case 'r':
          this.doRefresh()
          block = true
          break
        case '/':
          this.flipLayout()
          break
        case 'c':
          if (event.shiftKey) {
            this.copy()
            block = true
          }
          break
      }
      if (block) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
  }

  content = () => [
    div(
      { part: 'example' },
      style({ part: 'style' }),
      div({ part: 'testIndicator', title: 'test status' }),
      pre({ part: 'testResults', hidden: true }),
      button(
        {
          title: 'example menu',
          part: 'exampleWidgets',
          onClick: this.exampleMenu,
        },
        icons.code()
      )
    ),
    // Empty until first showCode. buildEditorPanel() fills it lazily so a reader
    // who never opens a panel never constructs a <tosi-code> (and never pulls the
    // CodeMirror chunk). See ensureEditors().
    div({
      class: 'code-editors',
      part: 'codeEditors',
      onKeydown: this.handleShortcuts,
      hidden: true,
    }),
    tosiSlot({ part: 'sources', hidden: true }),
  ]

  // The editor panel (4 <tosi-code> editors + toolbar). Built on demand by
  // ensureEditors(), NOT in content() — constructing a <tosi-code> is what imports
  // the CodeMirror chunk, so keeping it out of the reader's mount path is the whole
  // point of slice 3. The `part` names match what content() used, so every
  // this.parts.{js,html,css,test,editors,undo,redo} reference resolves once built.
  private buildEditorPanel(): HTMLElement {
    return tosiTabs(
      {
        part: 'editors',
        onChange: this.updateUndo,
      },
      codeEditor({ name: 'js', mode: 'javascript', part: 'js' }),
      codeEditor({ name: 'html', mode: 'html', part: 'html' }),
      codeEditor({ name: 'css', mode: 'css', part: 'css' }),
      // The `test` block tests the rendered preview (DOM), so its tab is
      // labeled "DOM tests" to distinguish it from inline tjs unit tests. The
      // `part`/`name` stay `test`; only the displayed label differs.
      codeEditor({ name: 'DOM tests', mode: 'javascript', part: 'test' }),
      div(
        { slot: 'after-tabs', class: 'row' },
        button(
          {
            title: 'undo',
            part: 'undo',
            class: 'transparent',
            onClick: this.undo,
          },
          icons.cornerUpLeft()
        ),
        button(
          {
            title: 'redo',
            part: 'redo',
            class: 'transparent',
            onClick: this.redo,
          },
          icons.cornerUpRight()
        ),
        button(
          {
            title: 'example menu — refresh, flip, undo, copy, save/revert edits',
            class: 'transparent source-menu',
            onClick: this.sourceMenu,
          },
          icons.moreVertical()
        ),
        button(
          {
            title: 'close code',
            class: 'transparent',
            onClick: this.closeCode,
          },
          icons.x()
        )
      )
    )
  }

  // Build the editor panel the first time a code panel is opened, flush the cached
  // values into the now-real editors, and wire the tjs/ts read-only JS tab. Idempotent.
  private ensureEditors(): void {
    if (this.editorsBuilt || !this.hydrated) return
    this.parts.codeEditors.append(this.buildEditorPanel())
    this.editorsBuilt = true
    // pendingValues → the real editors, then pick the default tab and product tabs.
    this.flushPendingValues()
    this.ensureProductTabs()
    this.showDefaultTab()
    this.updateUndo()
  }

  connectedCallback(): void {
    super.connectedCallback()
    // super.connectedCallback() ran hydrate(), so `this.hydrated` is now true and
    // `parts` is safe to touch. The editor panel is NOT built here — values stay in
    // `pendingValues` and are flushed into the editors when ensureEditors() builds
    // them (first showCode). The preview runs from `pendingValues` meanwhile.

    const { sources } = this.parts
    this.initFromElements([...sources.children] as HTMLElement[])

    // Set up remote sync
    this.remoteSync = new RemoteSyncManager(
      this.storageKey,
      this.remoteKey,
      (payload) => {
        if (payload.close) {
          if (this.remoteId !== '') {
            // Remote editor window — close the popup
            window.close()
          } else {
            // Original window — restore from maximized state
            this.classList.remove('-maximize')
            this.parts.codeEditors.hidden = true
          }
          return
        }
        this.css = payload.css
        this.html = payload.html
        this.js = payload.js
        if (payload.test) this.test = payload.test
        // Adopt the main window's pristine snapshot (once) so this pop-out can
        // compute "has edits", diff View changes, and enable the Save actions.
        if (this.remoteId !== '' && payload.original && !this.originalCode) {
          this.originalCode = { ...payload.original }
        }
        this.refresh()
      }
    )
    this.remoteSync.startListening()

    // Stochastic undo-state polling — jittered base interval avoids
    // synchronizing when many examples are on the same page.
    const jitter = Math.random() * 100
    this.undoInterval = setInterval(() => {
      if (!document.hidden) this.updateUndo()
    }, 250 + jitter)

    // Send close signal when the tab/window closes — disconnectedCallback
    // does not fire reliably during page unload.
    this.beforeUnloadHandler = () => this.remoteSync?.sendClose()
    addEventListener('beforeunload', this.beforeUnloadHandler)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()

    this.remoteSync?.sendClose()
    this.remoteSync?.stopListening()

    if (this.undoInterval) {
      clearInterval(this.undoInterval)
      this.undoInterval = undefined
    }

    if (this.beforeUnloadHandler) {
      removeEventListener('beforeunload', this.beforeUnloadHandler)
      this.beforeUnloadHandler = undefined
    }
  }

  private exampleMarkdown(): string {
    const block = (lang: string, code: string) =>
      code !== '' ? '```' + lang + '\n' + code.trim() + '\n```\n' : ''
    return (
      block(this.dialect, this.js) +
      block('html', this.html) +
      block('css', this.css) +
      block('test', this.test)
    )
  }

  copy = () => {
    navigator.clipboard.writeText(this.exampleMarkdown())
  }

  downloadExample = () => {
    const src = this.getAttribute('data-source-file') || 'example'
    const ord = this.getAttribute('data-example-ordinal')
    const name =
      (src.split('/').pop() || 'example').replace(/\.\w+$/, '') +
      (ord !== null ? `-example-${ord}` : '') +
      '.md'
    const url = URL.createObjectURL(
      new Blob([this.exampleMarkdown()], { type: 'text/markdown' })
    )
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  // ── Local edit scratchpad (per-browser; keyed by the source↔doc map) ───────
  // The original source blocks, snapshotted at mount so "revert" can restore
  // them after a locally-saved edit.
  private originalCode: ExampleEdit | null = null

  private localEditKey(): string {
    const src = this.getAttribute('data-source-file')
    const ord = this.getAttribute('data-example-ordinal')
    return src && ord !== null ? exampleEditKey(src, ord) : ''
  }

  private applyEdit(edit: ExampleEdit): void {
    if (edit.js !== undefined) this.js = edit.js
    if (edit.html !== undefined) this.html = edit.html
    if (edit.css !== undefined) this.css = edit.css
    if (edit.test !== undefined) this.test = edit.test
  }

  // "Has edits" = current code differs from the snapshotted original (trailing
  // whitespace ignored, since editors normalize it). Drives Save/Revert enabled
  // state and the local-edit indicator.
  hasLocalEdits(): boolean {
    if (!this.originalCode) return false
    const o = this.originalCode
    const t = (s?: string) => (s ?? '').replace(/\s+$/, '')
    return (
      t(this.js) !== t(o.js) ||
      t(this.html) !== t(o.html) ||
      t(this.css) !== t(o.css) ||
      t(this.test) !== t(o.test)
    )
  }

  private updateEditedIndicator(): void {
    this.classList.toggle('-locally-edited', this.hasLocalEdits())
  }

  private canUndo(): boolean {
    const t = this.activeTab
    return t instanceof CodeEditor && t.canUndo()
  }

  private canRedo(): boolean {
    const t = this.activeTab
    return t instanceof CodeEditor && t.canRedo()
  }

  saveLocalEdit = () => {
    const key = this.localEditKey()
    if (!key) {
      window.alert('This example has no source mapping to key a local save.')
      return
    }
    saveExampleEdit(key, {
      js: this.js,
      html: this.html,
      css: this.css,
      test: this.test,
    })
    this.updateEditedIndicator()
  }

  revertLocalEdit = () => {
    const key = this.localEditKey()
    if (key) clearExampleEdit(key)
    if (this.originalCode) this.applyEdit(this.originalCode)
    // Reverting leaves nothing to diff — drop out of the diff view if we're in it.
    if (this.viewingChanges) this.viewChanges()
    this.updateEditedIndicator()
    this.refresh()
  }

  // Called once by insert-examples after the source blocks + map attrs are set:
  // snapshot the original, then restore any saved local edit on top.
  snapshotAndRestoreLocalEdit = () => {
    // this.js/html/css/test are guarded (return '' before hydration). Do NOT
    // touch this.parts.* directly here — that throws "elementRef does not exist"
    // when the example isn't hydrated yet, which breaks the whole doc render.
    // Editor diff baselines are applied later, in viewChanges().
    this.originalCode = {
      js: this.js,
      html: this.html,
      css: this.css,
      test: this.test,
    }
    const key = this.localEditKey()
    if (!key || !hasExampleEdit(key)) return
    const edit = loadExampleEdit(key)
    if (edit) {
      this.applyEdit(edit)
      this.updateEditedIndicator()
      this.refresh()
    }
  }

  // Toggle a per-tab diff (current vs original source) across the example's
  // editors. Each editor diffs its own single text — no need to combine the
  // html/css/js/test split — so switching tabs shows that tab's changes.
  viewingChanges = false
  viewChanges = () => {
    if (!this.hydrated) return
    this.ensureEditors() // diffing reaches into this.parts[tab] — build them first
    this.viewingChanges = !this.viewingChanges
    if (this.viewingChanges) this.showCode()
    const originals = this.originalCode ?? {}
    for (const tab of ['js', 'html', 'css', 'test'] as const) {
      // Set the diff baseline (the source) right before showing the diff, now
      // that the editors are hydrated.
      this.parts[tab].original = originals[tab] ?? ''
      this.parts[tab].showDiff(this.viewingChanges)
    }
  }

  // The example's overflow menu. Stable item set — actions stay put and toggle
  // enabled (Save/Revert key off whether there are edits); items are only hidden
  // when they could NEVER apply here (local save needs a source-map key; save to
  // source additionally needs the dev server). Shortcuts are display-only; the
  // keys are routed by handleShortcuts / the editor, not the menu.
  // Refresh means different things in the two modes: the page-embedded example
  // re-runs itself; the pop-out editor window (refresh() is a no-op there) pushes
  // its code to the main window so IT re-runs.
  doRefresh = () => {
    if (this.remoteId !== '') {
      this.refreshRemote()
    } else {
      void this.refresh()
    }
  }

  sourceMenu = (event: Event) => {
    const key = this.localEditKey()
    const hasEdits = () => this.hasLocalEdits()
    // View changes / Revert need the source snapshot, which only the page-embedded
    // example has — the pop-out editor window has no originalCode to compare to.
    const hasSnapshot = this.originalCode != null
    popMenu({
      target: (event.target as HTMLElement).closest('button') as HTMLElement,
      width: 'auto',
      menuItems: [
        {
          icon: 'refreshCw',
          caption: 'Refresh',
          shortcut: '⌘R',
          action: this.doRefresh,
        },
        {
          icon: 'columns',
          caption: 'Flip layout',
          shortcut: '⌘/',
          action: this.flipLayout,
        },
        {
          icon: 'cornerUpLeft',
          caption: 'Undo',
          shortcut: '⌘Z',
          action: this.undo,
          enabled: () => this.canUndo(),
        },
        {
          icon: 'cornerUpRight',
          caption: 'Redo',
          shortcut: '⌘⇧Z',
          action: this.redo,
          enabled: () => this.canRedo(),
        },
        null,
        {
          icon: 'copy',
          caption: 'Copy as markdown',
          shortcut: '⌘⇧C',
          action: this.copy,
        },
        { icon: 'download', caption: 'Download', action: this.downloadExample },
        null,
        ...(hasSnapshot
          ? [
              this.viewingChanges
                ? {
                    icon: 'edit',
                    caption: 'Back to editing',
                    action: this.viewChanges,
                  }
                : {
                    icon: 'code',
                    caption: 'View changes',
                    action: this.viewChanges,
                    enabled: hasEdits,
                  },
            ]
          : []),
        ...(key
          ? [
              {
                icon: 'save',
                caption: 'Save changes (local)',
                action: this.saveLocalEdit,
                enabled: hasEdits,
              },
            ]
          : []),
        ...(key && isLocalhost
          ? [
              {
                icon: 'upload',
                caption: 'Save to source',
                action: () => {
                  void this.saveToSource()
                },
                enabled: hasEdits,
              },
            ]
          : []),
        ...(hasSnapshot
          ? [
              {
                icon: 'rotateCcw',
                caption: 'Revert to original',
                action: this.revertLocalEdit,
                enabled: hasEdits,
              },
            ]
          : []),
      ],
    })
  }

  toggleMaximize = () => {
    this.classList.toggle('-maximize')
  }

  showCode = () => {
    this.ensureEditors() // first open builds the CodeMirror panel (and pulls the chunk)
    this.classList.add('-maximize')
    this.classList.toggle('-vertical', this.offsetHeight > this.offsetWidth)
    this.parts.codeEditors.hidden = false
    this.ensureProductTabs()
  }

  closeCode = () => {
    if (this.remoteId !== '') {
      // Remote editor window — send close signal to original, then close popup
      this.remoteSync?.sendClose()
      window.close()
    } else {
      // Original window — restore and close any remote editor
      this.remoteSync?.sendClose()
      this.classList.remove('-maximize')
      this.parts.codeEditors.hidden = true
    }
  }

  openEditorWindow = () => {
    const { css, html, js, test } = this
    openEditorWindow(
      this.prefix,
      this.uuid,
      this.storageKey,
      this.remoteKey,
      { css, html, js, test },
      {
        // Give the pop-out the same source↔doc key + pristine snapshot the main
        // window has, so it offers the full menu (Save local / Save to source /
        // View changes) instead of a reduced one.
        sourceFile: this.getAttribute('data-source-file'),
        ordinal: this.getAttribute('data-example-ordinal'),
        original: this.originalCode ?? undefined,
      }
    )
    // The pop-out window owns editing now — maximize the preview AND close the
    // inline code view here (it stays open otherwise if it was already showing).
    this.classList.add('-maximize')
    this.parts.codeEditors.hidden = true
  }

  refreshRemote = () => {
    this.remoteSync?.send({
      css: this.css,
      html: this.html,
      js: this.js,
      test: this.test,
    })
  }

  updateSources = () => {
    if (this.persistToDom) {
      const { sources } = this.parts
      sources.innerText = ''
      for (const language of ['js', 'css', 'html', 'test']) {
        if (this[language as 'js' | 'css' | 'html' | 'test']) {
          sources.append(
            pre({
              class: `language-${language}`,
              innerHTML: this[language as 'js' | 'css' | 'html' | 'test'],
            })
          )
        }
      }
    }
  }

  refresh = async () => {
    if (this.remoteId !== '') return

    // Reader fast path: with the build-time bake AND tests off (the deployed
    // reader — tests default off outside localhost), run the example WITHOUT
    // loading the tjs transpiler. When tests are on (localhost / the doc-test
    // harness) `bake` is undefined and this is the original full-transform path,
    // so the harness is untouched. The bake is byte-identical to what the
    // transform would produce (it IS `transform(rewriteImports(js))`).
    const bake =
      this.dialect !== 'js' && !testManager.enabled.value
        ? this.compiledJs
        : undefined
    const transform = bake === undefined ? await loadTransform(this.dialect) : undefined
    const { example, style: styleEl, exampleWidgets } = this.parts

    // Keep the read-only generated-JS tab (tjs/ts) in sync with the source, and
    // re-run any inline tjs tests for the "tjs tests" results tab. With the bake we
    // already have the generated JS and skip the transpiler-bound inline-test run.
    if (this.dialect !== 'js') {
      this.lastGeneratedJs = bake ?? (await this.computeGeneratedJs(transform!))
      if (this.jsOutEditor) this.jsOutEditor.value = this.lastGeneratedJs
      if (bake === undefined) await this.runInlineTjsTests(transform!)
    }

    let preview: HTMLElement | null
    let executionError: Error | undefined

    const onError = (error: Error) => {
      executionError = error
    }

    if (this.iframe) {
      preview = await executeInIframe({
        html: this.html,
        css: this.css,
        js: this.js,
        context: this.context,
        transform,
        compiledJs: bake,
        exampleElement: example,
        widgetsElement: exampleWidgets,
        onError,
        onScope: this.captureScope,
      })
    } else {
      preview = await executeInline({
        html: this.html,
        css: this.css,
        js: this.js,
        context: this.context,
        transform,
        compiledJs: bake,
        exampleElement: example,
        styleElement: styleEl,
        widgetsElement: exampleWidgets,
        onError,
        onScope: this.captureScope,
      })
    }

    if (this.persistToDom) {
      this.updateSources()
    }

    // Run tests when there are any — but a build/exec failure is a test failure
    // in its own right, so surface it even when the example defines no `test`
    // blocks (and even if the failure was hard enough to produce no preview).
    if ((this.test || executionError) && testManager.enabled.value) {
      // Let queued renders (rAF) settle before running tests
      await new Promise((resolve) => requestAnimationFrame(resolve))

      this.classList.add('-has-tests', '-test-running')
      this.classList.remove('-test-passed', '-test-failed')
      // `test` blocks are conventional JS/TS regardless of the example's dialect,
      // so they're transpiled as plain js — never lowered through tjs/ts.
      // This block only runs when tests are enabled, and `bake` only exists when
      // they're off — so `transform` was loaded above and is defined here.
      const testTransform =
        this.dialect === 'js' ? transform! : await loadTransform('js')
      // Only run `test` blocks if the example actually produced a preview to
      // assert against; a failed build has nothing to test but still fails below.
      this.testResults =
        this.test && preview
          ? await runTests(this.test, preview, this.context, testTransform)
          : { passed: 0, failed: 0, tests: [] }
      if (executionError) {
        this.testResults.failed += 1
        this.testResults.tests.unshift({
          name: 'example loads without error',
          passed: false,
          error: String(executionError),
        })
      }
      this.classList.remove('-test-running')
      this.displayTestResults()
    } else {
      this.classList.remove(
        '-has-tests',
        '-test-running',
        '-test-passed',
        '-test-failed'
      )
    }
  }

  private displayTestResults(): void {
    const { testResults: resultsEl, testIndicator } = this.parts
    const results = this.testResults

    if (!results || results.tests.length === 0) {
      resultsEl.hidden = true
      this.classList.remove('-test-passed', '-test-failed')
      testIndicator.title = 'no tests'
      return
    }

    resultsEl.innerHTML = ''

    const summary = div(
      { style: { marginBottom: '8px', fontWeight: 'bold' } },
      `${results.passed}/${results.tests.length} tests passed`
    )
    resultsEl.append(summary)

    for (const test of results.tests) {
      const icon = test.passed ? '✓' : '✗'
      const cls = test.passed ? 'test-pass' : 'test-fail'
      const testEl = div(
        { class: cls },
        span(icon + ' '),
        test.name,
        test.error
          ? span({ style: { opacity: '0.7' } }, ` - ${test.error}`)
          : ''
      )
      resultsEl.append(testEl)
    }

    this.classList.toggle('-test-passed', results.failed === 0)
    this.classList.toggle('-test-failed', results.failed > 0)

    // Update indicator title
    testIndicator.title =
      results.failed === 0
        ? `${results.passed} tests passed`
        : `${results.failed}/${results.tests.length} tests failed`

    // Update visibility based on tab and failure status
    this.updateTestResultsVisibility()

    // Dispatch event for doc-browser to track results
    this.dispatchEvent(
      new CustomEvent('testcomplete', {
        bubbles: true,
        detail: {
          results,
          element: this,
        },
      })
    )
  }

  initFromElements(elements: HTMLElement[]) {
    for (const element of elements) {
      element.hidden = true
      const [mode, ...lines] = element.innerHTML.split('\n') as string[]
      if (['js', 'html', 'css', 'test'].includes(mode)) {
        const minIndex = lines
          .filter((line) => line.trim() !== '')
          .map((line) => (line.match(/^\s*/) as string[])[0].length)
          .sort()[0]
        const source = (
          minIndex > 0 ? lines.map((line) => line.substring(minIndex)) : lines
        ).join('\n')
        this.setEditorValue(mode, source)
      } else {
        const language = ['js', 'html', 'css', 'test'].find((lang) =>
          element.matches(`.language-${lang}`)
        )
        if (language) {
          this.setEditorValue(
            language,
            language === 'html' ? element.innerHTML : element.innerText
          )
        }
      }
    }
  }

  showDefaultTab() {
    // No tab strip until the panel is built; remember to pick the tab then.
    if (!this.hydrated || !this.editorsBuilt) {
      this.pendingShowDefaultTab = true
      return
    }
    const { editors } = this.parts
    if (this.js !== '') {
      editors.value = 0
    } else if (this.html !== '') {
      editors.value = 1
    } else if (this.css !== '') {
      editors.value = 2
    } else if (this.test !== '') {
      editors.value = 3
    }
  }

  render(): void {
    super.render()

    if (this.remoteId !== '') {
      const data = localStorage.getItem(this.storageKey)
      if (data !== null) {
        const payload = JSON.parse(data)
        if (this.remoteKey !== payload.remoteKey) return

        this.css = payload.css
        this.html = payload.html
        this.js = payload.js
        if (payload.test) this.test = payload.test
        // The pop-out editor window IS the editor — build the panel and flush the
        // values above into it (they went to pendingValues since it wasn't built yet).
        this.ensureEditors()
        this.parts.example.hidden = true
        this.parts.codeEditors.hidden = false
        this.classList.add('-maximize')
        this.updateUndo()
      }
    } else {
      this.refresh()
    }
  }
}

export const liveExample =
  LiveExample.elementCreator() as ElementCreator<LiveExample>

// Auto-initialize remote editor window
const params = new URL(window.location.href).searchParams
const remoteId = params.get('lx')
if (remoteId) {
  document.title += ' [code editor]'
  document.body.textContent = ''
  const example = liveExample({ remoteId })
  // Carry the source↔doc key through so the pop-out's Save local / Save to source
  // menu items appear and work (the pristine snapshot arrives via the payload).
  const sourceFile = params.get('sf')
  const ordinal = params.get('ord')
  if (sourceFile && ordinal !== null) {
    example.setAttribute('data-source-file', sourceFile)
    example.setAttribute('data-example-ordinal', ordinal)
  }
  document.body.append(example)
}
