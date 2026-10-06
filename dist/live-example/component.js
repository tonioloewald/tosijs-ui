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

## The console

Each example has a **Console** tab beside its code (open the code panel with the `<>` button).
It shows what the example logged, and it is a REPL: type an expression and press Enter to
evaluate it in the example's scope, as in the browser's console. On a phone, where browsers
have no console at all, this is the console.

Each example gets its own `console`, injected the way `preview` is, so its output is never mixed
with another example's. Everything still reaches the browser's console too.

```js
const words = ['tosijs', 'tjs', 'xinjs']
console.log('words:', words)
for (const word of words) console.log(word, word.length)
console.warn('xinjs is the old name')
preview.textContent = `${words.length} words logged`
```
```test
test('the console holds what the example logged', () => {
  const example = preview.closest('tosi-example')
  const lines = example.consoleOutput
  expect(lines.length).toBe(5)
  expect(lines[1].text).toBe('tosijs 6')
  expect(lines[4].level).toBe('warn')
})
test('and evaluates in its scope', async () => {
  const example = preview.closest('tosi-example')
  expect(await example.consoleEval('preview.textContent')).toBe('3 words logged')
  expect(await example.consoleEval('words.length')).toBe(3) // its own variables
})
```

An example that only logs still shows something. When a run finishes with nothing rendered
into its `preview`, the lines it logged appear where the preview would be:

```js
const total = [1, 2, 3].reduce((sum, n) => sum + n, 0)
console.log('1 + 2 + 3 =', total)
```

That is the same output as the Console tab, placed where a reader will see it without
opening the code panel. It steps aside as soon as the example renders anything, and it is
drawn in an element of its own, so `preview` stays empty for your code and tests. Turning the
console off (below) turns this off too.

- It shows `log`, `info`, `warn`, `error`, `debug`, `dir` and `table`, plus the error that
  stopped the example, if one did. Strings print as written, data as JSON, errors as
  `Name: message`.
- **The REPL** runs inside the example's own scope: its top-level variables and functions,
  `preview`, its `console`, and the page's modules (`import { tosi } from 'tosijs'` works).
  Input gives its value, as in a browser console (`const n = 2; n * 21` shows 42), and
  `await` works. Enter evaluates and Shift+Enter adds a line; ↑ and ↓ step through what you've
  entered.
- **`$` and `$$`**, as in a browser console: `$('.thing')` is the first match and `$$('.thing')`
  an array of all of them, **within this example's preview** (`document.querySelector` still
  reaches the page). An example that declares its own `$`, or a page with jQuery, keeps it.
- In an `:iframe` example the REPL runs inside the iframe, as the example does: `window` and
  `document` are the iframe's.
- **Completion:** as you type a name, or after a dot, a list of suggestions appears above the
  prompt: the value's properties after a dot (prototype chain included), or what's in scope.
  Tap one, or use ↓/↑ and Enter; Tab takes the highlighted one (or the first), Escape closes it.
  Matching ignores case (a phone capitalises the first letter), and the example's own names
  come first.
- Your first input re-runs the example once, to give the REPL its scope (it costs nothing
  until you use it). Two differences from devtools: a `const` or `let` you declare lives only
  for that one input (use `var`, or one input, to keep a value), and input that uses `await`
  in statements, rather than as one expression, shows `undefined`.
- A re-run starts a clean console, and a log arriving late from the previous run (a timer it
  left behind) is not shown.
- It keeps 500 lines, then counts what it drops; devtools keeps everything.
- Turn it off for one example with the fence option `{"console": false}`, for a site with
  `exampleConsole: false` in its config, or for a page with `setExampleConsole(false)` from
  `tosijs-ui/live-example`.
- A `run` dialect gets the same console as `context.console`, so a VM can forward its output
  to it.

## Adding a dialect

`js`, `tjs` and `ts` are the built-in entries of a **dialect registry**, and a site can add
its own with `registerDialect` from `tosijs-ui/live-example`. A fence in a registered
language then becomes a live example like any other: it groups with `html`, `css` and
`test` blocks, honours `:static` and the site's example policy, and saves back to source.

A dialect gives exactly one of:

- **`transform(source, options)`** — returns `{ code }`, JavaScript the example then runs
  exactly as it runs a `js` block. Imports from the page's modules are already rewritten.
- **`run(source, context)`** — executes the source itself (a VM, a fuel budget, whatever
  capabilities your registration closes over). `context` carries the example's `preview`
  element, its `options`, the page's `context` modules, an `AbortSignal` that fires when the
  example re-runs, and `report(value)`. A non-`undefined` return value is reported too: it is
  shown below the preview. While a run is pending a spinner shows over the example (after a
  quarter-second, so a fast run never flashes it); a re-run replaces it. If your language treats
  errors as values (AJS does), a run that ENDS in one is a successful run: `report()` it, and
  throw only for a broken example.

Optional `label` names the source tab and `editorMode` picks the code editor's language.
Optional `docs(source, options)` returns markdown for a **Docs** tab beside the code: the
place for documentation generated from the source (in TJS the signature *is* the docs). It
is called only when someone opens the code panel, and again as they edit.
Replacing a built-in is allowed: `registerDialect('tjs', { transform })` runs `tjs` examples
through your own tjs-lang build instead of the pinned copy.

Register in your site's bundle entry, **before the doc system starts**: examples take their
dialect when they are created, and until then a fence in the new language is plain code.

```js:static
import { registerDialect } from 'tosijs-ui/live-example'

registerDialect('ajs', {
  label: 'AJS',
  run: async (source, { options, signal }) => myVm.run(source, { ...options, signal }),
})
```

**Options.** Any fence can carry a JSON object after its language —
`` ```ajs {"fuel": 1000} `` — which arrives as the dialect's `options`. Malformed JSON is
reported in the console with the example it belongs to, rather than silently ignored.
(CommonMark unescapes backslashes in a fence's info string, so avoid `\"` inside values.)

**On a `tosijs-ui/site` site, also list your dialects in the site config:**
`dialects: ['ajs']`, and any built-in you replace (`dialects: ['ajs', 'tjs']`). The build runs
where your page's registrations don't, so this is how it learns them:

- the build-time highlighter leaves those fences alone, even when the name is also a grammar;
- a replaced built-in isn't checked or pre-transpiled with the installed tjs-lang;
- on the page, a declared dialect that nothing registered is reported in the console by name.

Here a tiny `run` dialect is registered and an example is created in it. The example in the
`reverse` dialect is the one INSIDE this example's preview, so it has its own toolbar: open
its code with its `<>` button (not this example's) to see its **Docs** tab beside its source.

```js
import { registerDialect, liveExample } from 'tosijs-ui'

registerDialect('reverse', {
  label: 'Reverse',
  run: (source, { options }) =>
    (options.shout ? source.toUpperCase() : source).split('').reverse().join(''),
  docs: (source) => `## reverse\n\nReverses its source, so \`${source}\` becomes its mirror image.`,
})

const example = liveExample()
example.dialect = 'reverse'
example.options = { shout: true }
example.js = 'stressed'
preview.append(example)
await example.whenHydrated
await example.refresh()
```
```test
test('a run dialect runs its source and reports the result', () => {
  const results = [...preview.querySelectorAll('.dialect-result')]
  expect(results.length).toBe(1)
  expect(results[0].textContent).toBe('DESSERTS')
})
test('its docs appear in a Docs tab once the code panel is open', async () => {
  const example = preview.querySelector('tosi-example')
  example.showCode()
  // showCode() goes full-screen: close it again whatever happens, or (on localhost, where
  // tests run on the page itself) the reader is left with a full-screen nested example
  const close = () => example.closeCode()
  const docs = await new Promise((resolve) => {
    const started = Date.now()
    const check = () => {
      const found = example.querySelector('.example-docs')
      if (found?.textContent.includes('mirror image')) resolve(found)
      else if (Date.now() - started > 5000) resolve(null)
      else setTimeout(check, 50)
    }
    check()
  })
  close()
  expect(docs).not.toBe(null)
  expect(docs.getAttribute('name')).toBe('Docs')
  expect(docs.textContent).toContain('stressed')
})
```

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
  // 0.10.x names each compiled wasm export `__tjs_wasm_<hash>_<n>` on globalThis — the
  // hash makes it collision-free across examples (tjs-lang#11). The kernel calls that
  // global when present and falls back to its JS twin when it's not, so a truthy one
  // means the wasm really compiled. Matched by pattern (the hash is per-transpile), and
  // asserting >0 keeps the guard from ever passing vacuously.
  const compiled = Object.keys(globalThis).filter(
    (k) => /^__tjs_wasm_[a-z0-9]+_\d+$/.test(k) && globalThis[k]
  )
  expect(compiled.length).toBeGreaterThan(0)
})
```

## Execution modes

An example runs in one of three modes. Signal the mode on a code fence with
`` ```<lang>:<mode> `` — `` ```js:iframe ``, `` ```css:ide `` — on **any** block in the
group; the first mode in the group wins (contradictory modes across a group are an
authoring error: they log to the console and the first is used). Or set the `mode`
attribute directly.

- **`inline`** (default) — runs in the page, against the **library you're building**
  (your in-page working copy). Real npm imports resolve alongside it (with the
  import-resolver enabled). Shares the page's DOM, CSS, and `tosi()` state.
- **`iframe`** — same working-copy library, but the preview gets its own document, CSS
  scope, and custom-element registry, so a demo's styles can't leak into (or be leaked
  on by) the rest of the page. It isolates **DOM and CSS, not state** — the injected
  `tosijs`/`tosijs-ui` are the host's own instances, so `tosi()` singletons stay shared;
  namespace your state to keep examples from stomping each other. (The boolean `iframe`
  attribute is a back-compat alias for `mode="iframe"`.)
- **`ide`** — fully sandboxed: real, **published** dependencies (all imports resolved by
  the import-resolver, not your working copy) in an isolated realm — the standalone-app
  mode, for running arbitrary code rather than demoing the library under development.
  *(Recognized now; its distinct real-module execution is in progress.)*

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

### Tests run CONCURRENTLY — one `test()` per flow

Each `test()` body is invoked **as it is registered**, and async bodies are gathered with
`Promise.all`. So test 2's synchronous body runs while test 1 is sitting at its first
`await`, and tests in *other examples on the same page* overlap too.

This matters because splitting one flow across two `test()` blocks that share state is a
**latent race that can pass for months**. It passes whenever the first block's `await`
resolves on the next microtask with nothing pending, and fails the day some unrelated
activity makes that await wait out a real settling round — one that now includes the second
block's mutation. Nothing about the code changed; the timing did.

So: **steps that depend on each other belong in a single `test()`.**

```typescript
// WRONG — two blocks sharing state; they interleave
test('it hydrates', async () => { await updates(); expect(input.value).toBe('a') })
test('it responds to input', async () => { input.value = 'b'; await updates() })

// RIGHT — one flow, one test
test('it hydrates, then responds to input', async () => {
  await updates()
  expect(input.value).toBe('a')
  input.value = 'b'
  await updates()
  expect(state.value).toBe('b')
})
```

Two consequences worth knowing. Assertions about **counts** should be deltas rather than
absolutes, since another example may be adding elements while you look. And a test that
leaves global state behind can perturb a concurrent one — clean up inside the test that made
the mess.

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

### A test-only example shows its results

A ` ```test ` fence with nothing beside it has no preview to render. Rather than an empty box
— which reads as a broken example and hides the one thing the block is there to show — the
results become the example's body:

```test
test('a test-only example renders its own results', () => {
  expect(1 + 1).toBe(2)
})

test('…including several of them', () => {
  expect('tosijs-ui'.length).toBeGreaterThan(3)
})
```

Useful for documenting a pure function, an invariant, or a behaviour that has no visual
output. The example above is a real one — it runs on every build of this page.

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
import { elements, StyleSheet, tosi, vars, varDefault, withAttributes, } from 'tosijs';
import { codeEditor, CodeEditor } from '../code-editor.js';
import { tosiTabs } from '../tab-selector.js';
import { icons } from '../icons.js';
import { tosiPocketBar } from '../pocket-bar.js';
import { postNotification } from '../notifications.js';
import { popMenu } from '../menu.js';
import { prefersReducedMotion } from '../reduced-motion.js';
import { popFloat } from '../pop-float.js';
import { createExampleConsole, exampleConsoleEnabled, formatConsoleArgs, formatConsoleValue, } from './example-console.js';
import { dialectDocs, dialectTransform, getDialect, isBuiltInDialect, showDialectResult, } from './dialects.js';
import { loadTransform, loadTjsTestApi, rewriteImports, rewriteContextImports, contextVarName, contextParamNames, AsyncFunction, } from './code-transform.js';
import { STORAGE_KEY, createRemoteKey, RemoteSyncManager, openEditorWindow, } from './remote-sync.js';
import { executeInline, executeInIframe } from './execution.js';
import { insertExamples, examplePolicy } from './insert-examples.js';
import { rewriteExampleBlocks, groupExamples, findFencedBlocks, } from './save-to-source.js';
import { exampleEditKey, saveExampleEdit, loadExampleEdit, clearExampleEdit, hasExampleEdit, } from './example-store.js';
import { liveExampleStyleSpec } from './styles.js';
import { runTests } from './test-harness.js';
const { div, tosiSlot, style, button, pre, span, label, input, textarea } = elements;
/** Every string property name reachable from a value, prototype chain included. */
function propertyNamesOf(value) {
    if (value === null || value === undefined)
        return [];
    const names = [];
    for (let object = Object(value); object; object = Object.getPrototypeOf(object)) {
        try {
            names.push(...Object.getOwnPropertyNames(object));
        }
        catch {
            break; // a hostile proxy; what we have is enough
        }
    }
    return names.filter((name) => /^[A-Za-z_$][\w$]*$/.test(name));
}
/*
Names an example's source declares at any depth (good enough for completion, which only
offers candidates): `const`/`let`/`var`/`function`/`class` names, destructured names, and the
names an `import { a, b as c }` binds.
*/
function declaredNames(source) {
    const names = [];
    for (const m of source.matchAll(/(?:^|[^\w$.])(?:const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/g))
        names.push(m[1]);
    for (const m of source.matchAll(/(?:const|let|var|import)\s*\{([^}]*)\}/g))
        for (const part of m[1].split(',')) {
            const name = part
                .split(/\s+as\s+|:/)
                .pop()
                ?.trim()
                .split(/\s|=/)[0];
            if (name && /^[A-Za-z_$][\w$]*$/.test(name))
                names.push(name);
        }
    return names;
}
/*
The REPL's completion list floats in <body> (so the code panel can't clip it), outside the
example's style sheet, so its styles are a global sheet injected on first use. The variables
are the menu's, so a theme that restyles menus restyles this too.
*/
let completionStylesInjected = false;
function ensureCompletionStyles() {
    if (completionStylesInjected)
        return;
    completionStylesInjected = true;
    StyleSheet('tosi-example-completions', {
        '.tosi-example-completions': {
            overflow: 'hidden auto',
            overscrollBehavior: 'contain',
            maxHeight: `min(40vh, calc(${vars.maxHeight} - 8px))`,
            minWidth: '12em',
            borderRadius: vars.spacing50,
            background: varDefault.menuBg('#fafafa'),
            boxShadow: varDefault.menuShadow(`${vars.spacing13} ${vars.spacing50} ${vars.spacing} #0004`),
            fontFamily: 'var(--mono-font, monospace)',
            fontSize: '13px',
        },
        '.tosi-example-completions [role="option"]': {
            // a touch-sized row: these are meant to be tapped
            minHeight: varDefault.touchSize('44px'),
            display: 'flex',
            alignItems: 'center',
            padding: `0 ${vars.spacing}`,
            color: varDefault.menuItemColor('#222'),
            cursor: 'default',
        },
        '.tosi-example-completions [role="option"]:hover': {
            background: varDefault.menuItemHoverBg('#eee'),
        },
        '.tosi-example-completions [role="option"][aria-selected="true"]': {
            background: varDefault.menuItemActiveBg('#aaa'),
        },
    });
}
// Test mode: controlled by localStorage, defaults to enabled on localhost
const TESTS_ENABLED_KEY = 'tosijs-ui-tests-enabled';
const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1');
function getStoredTestsEnabled() {
    if (typeof localStorage === 'undefined')
        return false;
    const stored = localStorage.getItem(TESTS_ENABLED_KEY);
    if (stored !== null) {
        return stored === 'true';
    }
    // Default: enabled on localhost, disabled elsewhere
    return isLocalhost;
}
// Test manager - observable state for test mode
export const { testManager } = tosi({
    testManager: {
        enabled: getStoredTestsEnabled(),
    },
});
// Set CSS variable on body for test visibility (CSS vars pierce shadow DOM)
function updateTestsEnabledClass() {
    document.body.classList.toggle('tests-enabled', testManager.enabled.value);
    document.body.style.setProperty('--tests-enabled', testManager.enabled.value ? '1' : '0');
}
if (typeof document !== 'undefined') {
    // Set initial state when DOM is ready
    if (document.body) {
        updateTestsEnabledClass();
    }
    else {
        document.addEventListener('DOMContentLoaded', updateTestsEnabledClass);
    }
}
/** Enable test mode (runs tests and shows indicators) */
export function enableTests() {
    localStorage.setItem(TESTS_ENABLED_KEY, 'true');
    testManager.enabled.value = true;
    updateTestsEnabledClass();
    // Re-run tests on all existing examples
    document.querySelectorAll('tosi-example').forEach((el) => {
        ;
        el.refresh();
    });
}
/**
 * How many examples on this page carry tests — regardless of whether tests are ENABLED.
 *
 * "Off" and "none exist" rendered identically: the widget is hidden when tests are
 * disabled, and they are disabled by default anywhere but localhost, so a page with
 * failing tests looked exactly like a page with no tests (tosijs-ui#113). That bites
 * hardest down the sanctioned remote-viewing path — `tosijs-tunnel` necessarily serves
 * from a non-localhost hostname — where a maintainer read a clean page as "the failure is
 * localhost-specific" and lost the thread.
 *
 * The `localStorage` override always existed, but you had to know the key, which means you
 * had to already suspect there was something to see. This is the number that lets the UI
 * say a runner exists here without turning it on.
 */
export function pageTestCount() {
    if (typeof document === 'undefined')
        return 0;
    return Array.from(document.querySelectorAll('tosi-example')).filter((el) => !!el.test).length;
}
/** Disable test mode */
export function disableTests() {
    localStorage.setItem(TESTS_ENABLED_KEY, 'false');
    testManager.enabled.value = false;
    updateTestsEnabledClass();
}
export class LiveExample extends withAttributes({
    persistToDom: false,
    iframe: false,
    // Execution mode: 'inline' (default — runs in the page against your working
    // library), 'iframe' (DOM/CSS isolation, still your working library), or 'ide'
    // (fully sandboxed, real published deps — the standalone-app mode). Set from a
    // `<lang>:<mode>` fence by insert-examples; `iframe` boolean is a back-compat alias.
    mode: '',
}) {
    static preferredTagName = 'tosi-example';
    static lightStyleSpec = liveExampleStyleSpec;
    /** Resolved execution mode — `mode` attribute wins; `iframe` boolean is the alias. */
    get effectiveMode() {
        const m = this.mode;
        if (m === 'iframe' || m === 'ide' || m === 'inline')
            return m;
        if (m)
            console.warn(`<tosi-example>: unknown mode "${m}" — running inline`);
        // STRICT boolean: only an explicit `true` means iframe. `iframe` is a
        // presence-only boolean attribute aliasing mode; a loose `this.iframe ?` would
        // treat a stray non-boolean value ('', 'false', an attribute string) as truthy
        // and silently force EVERY example into an iframe. Default is inline.
        return this.iframe === true ? 'iframe' : 'inline';
    }
    prefix = 'lx';
    storageKey = STORAGE_KEY;
    context = {};
    // The example's top-level locals from the latest run, captured in-run for tjs
    // runtime-value autocomplete (see `liveBindings`). Populated via `onScope`.
    capturedScope = {};
    uuid = crypto.randomUUID();
    remoteId = '';
    remoteSync;
    undoInterval;
    testResults;
    pendingValues = {};
    pendingShowDefaultTab = false;
    beforeUnloadHandler;
    // The code-editor panel (the 4 <tosi-code> editors + toolbar) is built LAZILY on
    // first showCode, NOT in content() — so a reader who never opens a panel never
    // pulls the CodeMirror chunk. Until then, values live in `pendingValues` (the same
    // cache used pre-hydration) and the preview runs from them. See
    // self-contained-examples-plan.md slice 3.
    editorsBuilt = false;
    static insertExamples(element, context = {}, sourceFile) {
        insertExamples(element, context, liveExample, LiveExample.tagName, sourceFile);
    }
    get activeTab() {
        if (!this.editorsBuilt)
            return undefined;
        const { editors } = this.parts;
        return [...editors.children].find((elt) => elt.getAttribute('hidden') === null);
    }
    // Hydration state is the base class's `this.hydrated`, as of tosijs 1.6.9. This file
    // used to hand-roll it as `try { return this.parts.js !== undefined } catch { false }`
    // — the one probe you must never write, since reading `parts` before hydration bound
    // the proxy to the light-DOM element permanently (it survived only by accident of
    // being light-DOM, where the root never flips). 1.6.9 invalidates the proxy at hydrate
    // and exposes `hydrated`/`whenHydrated`, so the hand-roll is gone. (tosijs#13.)
    getEditorValue(which) {
        // Until the editors are built (a reader who never opens a panel, or pre-
        // hydration) the string cache is the source of truth.
        if (!this.editorsBuilt)
            return this.pendingValues[which] ?? '';
        return this.parts[which].value;
    }
    setEditorValue(which, code) {
        if (!this.editorsBuilt) {
            this.pendingValues[which] = code;
            return;
        }
        const codeEditor = this.parts[which];
        codeEditor.value = code;
    }
    flushPendingValues() {
        for (const [which, code] of Object.entries(this.pendingValues)) {
            const codeEditor = this.parts[which];
            if (codeEditor)
                codeEditor.value = code;
        }
        this.pendingValues = {};
        if (this.pendingShowDefaultTab) {
            this.pendingShowDefaultTab = false;
            this.showDefaultTab();
        }
    }
    get css() {
        return this.getEditorValue('css');
    }
    set css(code) {
        this.setEditorValue('css', code);
    }
    get html() {
        return this.getEditorValue('html');
    }
    set html(code) {
        this.setEditorValue('html', code);
    }
    get js() {
        return this.getEditorValue('js');
    }
    set js(code) {
        this.setEditorValue('js', code);
    }
    get test() {
        return this.getEditorValue('test');
    }
    set test(code) {
        this.setEditorValue('test', code);
    }
    get remoteKey() {
        return createRemoteKey(this.prefix, this.uuid, this.remoteId);
    }
    // The source block's dialect: `js`, `tjs`, `ts`, or any name a site registered with
    // `registerDialect` (dialects.ts). Set by insert-examples from the fenced-block language;
    // persisted as an attribute so it survives a re-render. `js` is the default and keeps the
    // original pass-through behavior.
    get dialect() {
        return this.getAttribute('data-dialect') || 'js';
    }
    set dialect(value) {
        this.setAttribute('data-dialect', value);
    }
    // The fence's JSON options (```tjs {"debug": true}), handed to the dialect's `transform`
    // or `run` (#184). Set by insert-examples; an attribute, like `dialect`, so it survives a
    // re-render. Malformed JSON never reaches here — the fence parser reports it.
    get options() {
        const raw = this.getAttribute('data-options');
        if (!raw)
            return {};
        try {
            return JSON.parse(raw);
        }
        catch {
            return {};
        }
    }
    set options(value) {
        if (Object.keys(value).length === 0)
            this.removeAttribute('data-options');
        else
            this.setAttribute('data-options', JSON.stringify(value));
    }
    // Stops a `run` dialect's previous run when the example re-runs or leaves the page.
    runAbort;
    /**
     * How long a `run` dialect's run must take before its spinner appears, in ms. A faster run
     * never shows one, so a quick example doesn't flash.
     */
    static runningDelayMs = 250;
    // ── The Console tab ─────────────────────────────────────────────────────────
    // What the current run logged, kept whether or not the code panel is open (the tab renders
    // it when built), and a REPL evaluated in the example's scope. Lines are capped: an example
    // that logs in a loop must not grow the page without bound. Past the cap one line counts
    // what was dropped; devtools still has them all.
    static CONSOLE_LINES = 500;
    consoleBuffer = [];
    consoleDroppedCount = 0;
    consoleView;
    consoleLinesEl;
    consoleInputEl;
    consoleHistory = [];
    consoleHistoryIndex = 0;
    consoleScrollQueued = false;
    // the REPL's completion list (see updateCompletions); it floats in <body>, above the prompt
    static completionLists = 0;
    completionListId = `tosi-example-completions-${++LiveExample.completionLists}`;
    completionList = div({
        id: this.completionListId,
        role: 'listbox',
        class: 'tosi-example-completions',
        // keep focus (and a phone's keyboard) in the field when a suggestion is tapped
        onMousedown: (event) => event.preventDefault(),
        onClick: (event) => {
            const option = event.target.closest('[role="option"]');
            if (option)
                this.applyCompletion(Number(option.getAttribute('data-index')));
        },
    });
    /**
     * What the current run logged, as `{ level, text }` lines (and REPL input/results), ending
     * with a `dropped` line when the cap was reached, so a reader of this sees the truncation.
     */
    get consoleOutput() {
        return this.consoleDroppedCount === 0
            ? [...this.consoleBuffer]
            : [...this.consoleBuffer, { level: 'dropped', text: this.droppedText() }];
    }
    droppedText() {
        return `… ${this.consoleDroppedCount} more (see the browser console)`;
    }
    // Not in the pop-out editor window: it never runs the example, so its console would be
    // empty and its REPL would evaluate against the pop-out's own document (1.16.4 review).
    get consoleEnabled() {
        return (exampleConsoleEnabled() &&
            this.options.console !== false &&
            this.remoteId === '');
    }
    // A fresh console per run. A log arriving from a PREVIOUS run (a timer or listener it left
    // behind) still reaches devtools but not the tab, which belongs to the current run.
    consoleForRun() {
        if (!this.consoleEnabled)
            return undefined;
        const signal = this.runAbort?.signal;
        return createExampleConsole((entry) => {
            if (signal?.aborted)
                return;
            // formatted only if the line is kept: past the cap, a logging loop costs a counter bump
            this.addConsoleLine(entry.level, () => formatConsoleArgs(entry.args));
        });
    }
    clearConsole() {
        this.consoleBuffer = [];
        this.consoleDroppedCount = 0;
        this.consoleLinesEl?.replaceChildren();
    }
    /*
    An example whose whole output is `console.log` or inline tests used to be an empty box.
  
    The Console tab holds the lines, but a reader does not open a code panel to find out whether
    an example did anything — tjs-lang's first example, hello-tjs, read as broken on its own site
    (#210 item 3). So when a run has SETTLED with nothing rendered into its preview, the lines it
    logged (and its inline-test summary, when there is one) are shown where the preview would
    be. An example that does render is untouched, and so is the Console tab.
  
    The lines go in an element of their own, never into `preview`: example code and `test`
    blocks own that element, and several assert on what is in it.
    */
    runSettled = false;
    outputQueued = false;
    outputWatch;
    static OUTPUT_LINES = 50;
    previewIsEmpty() {
        const preview = this.parts.example.querySelector(':scope > .preview');
        // Inline previews only: an iframe's emptiness is its own document's business.
        return (!!preview &&
            preview.childElementCount === 0 &&
            (preview.textContent ?? '').trim() === '');
    }
    queueOutputRefresh() {
        if (!this.runSettled || this.outputQueued)
            return;
        this.outputQueued = true;
        queueMicrotask(() => {
            this.outputQueued = false;
            this.refreshOutput();
        });
    }
    refreshOutput() {
        if (!this.hydrated)
            return;
        const out = this.parts.output;
        // What a reader would see printed: not what was typed into the REPL, nor its echoes.
        const lines = this.consoleEnabled
            ? this.consoleBuffer.filter((line) => line.level !== 'input' && line.level !== 'result')
            : [];
        const tests = this.lastTjsTests?.results ?? [];
        const show = this.runSettled &&
            !this.isTestOnly &&
            (lines.length > 0 || tests.length > 0) &&
            this.previewIsEmpty();
        this.classList.toggle('-output-only', show);
        out.hidden = !show;
        this.outputWatch?.disconnect();
        this.outputWatch = undefined;
        if (!show) {
            out.replaceChildren();
            return;
        }
        const shown = lines.slice(-LiveExample.OUTPUT_LINES);
        const failed = tests.filter((t) => !t.passed);
        out.replaceChildren(...(lines.length > shown.length
            ? [
                div({ class: 'console-line console-dropped' }, `… ${lines.length - shown.length} earlier lines in the Console tab`),
            ]
            : []), ...shown.map((line) => this.consoleLineElement(line)), ...(tests.length
            ? [
                div({ class: failed.length ? 'test-fail' : 'test-pass' }, `${tests.length - failed.length}/${tests.length} inline tests passed`),
                ...failed.map((t) => div({ class: 'test-fail' }, `✗ ${t.description}${t.error ? ` — ${t.error}` : ''}`)),
            ]
            : []));
        // The moment the example renders something after all (a fetch resolved), step aside.
        const preview = this.parts.example.querySelector(':scope > .preview');
        if (preview) {
            this.outputWatch = new MutationObserver(() => this.refreshOutput());
            this.outputWatch.observe(preview, {
                childList: true,
                characterData: true,
                subtree: true,
            });
        }
    }
    addConsoleLine(level, text) {
        if (this.consoleBuffer.length >= LiveExample.CONSOLE_LINES) {
            this.consoleDroppedCount += 1;
            this.renderConsoleDropped();
            return;
        }
        const line = { level, text: typeof text === 'function' ? text() : text };
        this.consoleBuffer.push(line);
        this.queueOutputRefresh();
        if (this.consoleLinesEl) {
            this.consoleLinesEl.append(this.consoleLineElement(line));
            this.scrollConsole();
        }
    }
    // A text node, never markup: logged `<img onerror=…>` is shown, not run.
    consoleLineElement(line) {
        return div({ class: `console-line console-${line.level}` }, line.text);
    }
    consoleDroppedEl;
    renderConsoleDropped() {
        const lines = this.consoleLinesEl;
        if (!lines || this.consoleDroppedCount === 0)
            return;
        if (!this.consoleDroppedEl || !lines.contains(this.consoleDroppedEl)) {
            this.consoleDroppedEl = div({ class: 'console-line console-dropped' });
            lines.append(this.consoleDroppedEl);
        }
        this.consoleDroppedEl.textContent = this.droppedText();
    }
    // To the newest line once per burst, not once per line (reading scrollHeight forces layout).
    scrollConsole() {
        if (this.consoleScrollQueued)
            return;
        this.consoleScrollQueued = true;
        queueMicrotask(() => {
            this.consoleScrollQueued = false;
            if (this.consoleLinesEl)
                this.consoleLinesEl.scrollTop = this.consoleLinesEl.scrollHeight;
        });
    }
    buildConsoleView() {
        this.consoleLinesEl = div({ class: 'console-lines', role: 'log' });
        // A textarea, one line tall until it needs more: Enter evaluates, Shift+Enter adds a line
        // (as in browser consoles), and it grows with its content up to a few lines.
        this.consoleInputEl = textarea({
            class: 'console-field',
            rows: 1,
            spellcheck: false,
            // a code field: no capitalising the first letter, no "correcting" names (iOS does both)
            autocapitalize: 'off',
            autocorrect: 'off',
            autocomplete: 'off',
            ariaLabel: 'Evaluate in this example',
            placeholder: 'evaluate in this example (Shift+Enter for a new line)',
            onKeydown: this.consoleKeydown,
            onInput: this.consoleInput,
            onBlur: this.consoleBlur,
            role: 'combobox',
            ariaAutocomplete: 'list',
            ariaExpanded: 'false',
            ariaControls: this.completionListId,
        });
        this.consoleLinesEl.append(...this.consoleBuffer.map((line) => this.consoleLineElement(line)));
        this.renderConsoleDropped();
        this.consoleView = div({ name: 'Console', class: 'example-console' }, this.consoleLinesEl, div({ class: 'console-prompt' }, span('›'), this.consoleInputEl));
        return this.consoleView;
    }
    static CONSOLE_INPUT_MAX_ROWS = 8;
    sizeConsoleInput = () => {
        const field = this.consoleInputEl;
        if (!field)
            return;
        field.rows = Math.min(LiveExample.CONSOLE_INPUT_MAX_ROWS, Math.max(1, field.value.split('\n').length));
    };
    consoleKeydown = (event) => {
        const field = event.target;
        // While the completion list is open, the arrows move through it and Enter/Tab insert;
        // Tab is only taken when there is a list, so a keyboard user can always Tab out.
        if (this.completionsOpen) {
            const count = this.completionOptions.length;
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                const step = event.key === 'ArrowDown' ? 1 : -1;
                this.setActiveCompletion(Math.max(-1, Math.min(count - 1, this.activeCompletion + step)));
                return;
            }
            if (event.key === 'Tab' && !event.shiftKey) {
                event.preventDefault();
                this.applyCompletion(Math.max(0, this.activeCompletion));
                return;
            }
            if (event.key === 'Enter' &&
                !event.shiftKey &&
                this.activeCompletion >= 0) {
                event.preventDefault();
                this.applyCompletion(this.activeCompletion);
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                this.closeCompletions();
                return;
            }
        }
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.closeCompletions();
            if (field.value.trim() === '')
                return;
            const source = field.value;
            field.value = '';
            this.sizeConsoleInput();
            void this.consoleEval(source);
        }
        else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            const history = this.consoleHistory;
            if (history.length === 0)
                return;
            // Inside multi-line input the arrows move the caret; history only from the first line
            // (up) or the last line (down), as in browser consoles.
            const before = field.value.slice(0, field.selectionStart);
            const after = field.value.slice(field.selectionEnd);
            if (event.key === 'ArrowUp' && before.includes('\n'))
                return;
            if (event.key === 'ArrowDown' && after.includes('\n'))
                return;
            event.preventDefault();
            const step = event.key === 'ArrowUp' ? -1 : 1;
            this.consoleHistoryIndex = Math.max(0, Math.min(history.length, this.consoleHistoryIndex + step));
            field.value = history[this.consoleHistoryIndex] ?? '';
            this.sizeConsoleInput();
        }
    };
    /**
     * Evaluate `source` inside the example's own scope, like a browser console: its top-level
     * variables and functions, `preview`, its console, and the page's modules (`import { x }
     * from 'tosijs'` works). Input gives its completion value; `await` works. The first call
     * re-runs the example once, to give the REPL that scope. A `run` dialect (whose source is
     * not JavaScript) gets `preview`, the modules and the console only. The input and its result
     * go into the Console tab.
     */
    consoleEval = async (source) => {
        this.consoleHistory.push(source);
        this.consoleHistoryIndex = this.consoleHistory.length;
        // First use: re-run the example once WITH the scope hook (it is off until now, see
        // refresh()), so this input — and every later one — sees the example's own variables.
        if (!this.replWanted &&
            this.consoleEnabled &&
            !getDialect(this.dialect)?.run) {
            this.replWanted = true;
            await this.refresh();
        }
        this.addConsoleLine('input', source);
        if (this.replEvaluate)
            return this.evalInExample(this.replEvaluate, source);
        // one scope, keyed by the identifier each value is bound to; the example's own
        // variables win over a module of the same name, as they would inside the example
        const scope = new Map();
        for (const [name, helper] of Object.entries(this.replHelpers()))
            scope.set(name, helper);
        scope.set('preview', this.currentPreview());
        for (const [key, value] of Object.entries(this.context))
            scope.set(contextVarName(key), value);
        const replConsole = this.consoleForRun();
        if (replConsole)
            scope.set('console', replConsole);
        for (const [key, value] of Object.entries(this.capturedScope ?? {}))
            scope.set(key, value);
        // Plain `rewriteImports`, not the checking one: a REPL line is not a module, and an
        // error thrown here would land outside the `try` that prints errors to the console.
        const code = rewriteImports(source, Object.keys(this.context));
        const names = [...scope.keys()];
        let fn;
        try {
            // @ts-expect-error AsyncFunction constructor typing
            fn = new AsyncFunction(...names, `return (${code}\n)`);
        }
        catch {
            try {
                // @ts-expect-error AsyncFunction constructor typing
                fn = new AsyncFunction(...names, code);
            }
            catch (error) {
                this.addConsoleLine('error', formatConsoleValue(error));
                return undefined;
            }
        }
        try {
            const result = await fn(...scope.values());
            this.addConsoleLine('result', formatConsoleValue(result));
            return result;
        }
        catch (error) {
            this.addConsoleLine('error', formatConsoleValue(error));
            return undefined;
        }
    };
    /*
    Evaluate inside the example's own scope (execution's REPL hook: a direct eval in the
    example's function). Plain input returns its completion value, as a browser console does.
    `await` needs an async function, which eval's own code is not, so input that awaits is
    wrapped in an async arrow (expression first, then as statements); the arrow still closes
    over the example's scope.
    */
    replEvaluate;
    replHelpers() {
        return {
            $: (selector) => this.currentPreview()?.querySelector(selector) ?? null,
            $$: (selector) => [
                ...(this.currentPreview()?.querySelectorAll(selector) ?? []),
            ],
        };
    }
    // Set by the first REPL input; from then on each run installs the scope hook.
    replWanted = false;
    // ── REPL autocomplete (Tab) ────────────────────────────────────────────────
    /**
     * What could complete the text before the caret: after a dot, the properties of the value
     * the path before it evaluates to (in the example's scope); otherwise the names in scope —
     * `preview`, `console`, the page's modules, what the example declares, and globals.
     * `start` is where the partial name begins.
     */
    consoleCompletions = async (text) => {
        const match = text.match(/((?:[A-Za-z_$][\w$]*\s*\.\s*)*)([A-Za-z_$][\w$]*)?$/);
        const partial = match?.[2] ?? '';
        const path = (match?.[1] ?? '').replace(/\s/g, '').replace(/\.$/, '');
        const start = text.length - partial.length;
        let names;
        // the example's own names (and preview, console, modules) rank above globals
        let local = new Set();
        if (path) {
            if (!this.replEvaluate)
                await this.ensureReplScope();
            let target;
            try {
                target = this.replEvaluate ? await this.replEvaluate(path) : undefined;
            }
            catch {
                return { start, options: [] };
            }
            names = propertyNamesOf(target);
        }
        else {
            if (partial === '')
                return { start, options: [] }; // not every global at once
            local = new Set(this.localNames());
            names = [...local, ...Object.getOwnPropertyNames(globalThis)];
        }
        /*
        Case-insensitive: a phone capitalises the first letter you type (`Wor`), and what you meant
        is still `words`. Picking a suggestion replaces the partial name, so the case comes out
        right. Ranked: the example's own names first (so `Wor` offers `words` before the global
        `Worker`), then exact-case matches, then alphabetical.
        */
        const lower = partial.toLowerCase();
        const rank = (name) => (local.has(name) ? 0 : 2) + (name.startsWith(partial) ? 0 : 1);
        const options = [...new Set(names)]
            .filter((name) => name !== partial && name.toLowerCase().startsWith(lower))
            .sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0));
        return { start, options };
    };
    // What the example itself brings into scope (globals are added separately, ranked lower).
    localNames() {
        return [
            'preview',
            'console',
            '$',
            '$$',
            ...Object.keys(this.context).map(contextVarName),
            ...declaredNames(this.js),
        ];
    }
    // The REPL's scope hook is installed on first use (see consoleEval); completion is a use.
    async ensureReplScope() {
        if (this.replWanted ||
            !this.consoleEnabled ||
            getDialect(this.dialect)?.run)
            return;
        this.replWanted = true;
        await this.refresh();
    }
    // The completion list: a touchable listbox floated above the prompt, updated as you type.
    static COMPLETIONS_SHOWN = 50;
    completionOptions = [];
    completionStart = 0;
    activeCompletion = -1;
    completionFloat;
    completionRequest = 0;
    completionTimer;
    get completionsOpen() {
        return this.completionFloat?.isConnected === true;
    }
    consoleInput = () => {
        this.sizeConsoleInput();
        clearTimeout(this.completionTimer);
        this.completionTimer = setTimeout(() => void this.updateCompletions(), 80);
    };
    consoleBlur = () => {
        this.closeCompletions();
    };
    /** Recompute the completion list for the text before the caret, and show or close it. */
    updateCompletions = async () => {
        const field = this.consoleInputEl;
        if (!field || field.selectionStart !== field.selectionEnd)
            return;
        const before = field.value.slice(0, field.selectionStart);
        const request = ++this.completionRequest;
        if (!/[\w$.]$/.test(before))
            return this.closeCompletions();
        const { start, options } = await this.consoleCompletions(before);
        if (request !== this.completionRequest)
            return; // typed again meanwhile
        if (options.length === 0)
            return this.closeCompletions();
        this.completionStart = start;
        this.completionOptions = options.slice(0, LiveExample.COMPLETIONS_SHOWN);
        this.activeCompletion = -1;
        this.completionList.replaceChildren(...this.completionOptions.map((name, index) => div({
            id: `${this.completionListId}-${index}`,
            role: 'option',
            ariaSelected: 'false',
            dataIndex: String(index),
        }, name)));
        if (!this.completionsOpen) {
            ensureCompletionStyles();
            this.completionFloat = popFloat({
                content: this.completionList,
                target: field,
                // above the prompt (which sits at the panel's bottom), from its left edge
                position: 'ne',
                remainOnScroll: 'remove',
                remainOnResize: 'remove',
            });
        }
        field.setAttribute('aria-expanded', 'true');
        field.removeAttribute('aria-activedescendant');
    };
    setActiveCompletion(index) {
        this.activeCompletion = index;
        const options = [...this.completionList.children];
        options.forEach((option, i) => option.setAttribute('aria-selected', String(i === index)));
        const current = options[index];
        if (current) {
            this.consoleInputEl?.setAttribute('aria-activedescendant', current.id);
            current.scrollIntoView({ block: 'nearest' });
        }
        else {
            this.consoleInputEl?.removeAttribute('aria-activedescendant');
        }
    }
    applyCompletion = (index) => {
        const field = this.consoleInputEl;
        const name = this.completionOptions[index];
        if (!field || name === undefined)
            return;
        const caret = field.selectionStart;
        field.value =
            field.value.slice(0, this.completionStart) +
                name +
                field.value.slice(caret);
        const end = this.completionStart + name.length;
        field.setSelectionRange(end, end);
        this.closeCompletions();
        field.focus();
    };
    closeCompletions() {
        clearTimeout(this.completionTimer);
        this.completionRequest += 1; // anything still computing is now stale
        this.completionFloat?.remove();
        this.completionFloat = undefined;
        this.activeCompletion = -1;
        this.consoleInputEl?.setAttribute('aria-expanded', 'false');
        this.consoleInputEl?.removeAttribute('aria-activedescendant');
    }
    async evalInExample(evaluate, source) {
        // Plain `rewriteImports`, not the checking one: a REPL line is not a module, and an
        // error thrown here would land outside the `try` that prints errors to the console.
        const code = rewriteImports(source, Object.keys(this.context));
        /*
        `$` and `$$`, as in a browser console, unless something named `$` is already in scope (the
        example's own, or a page's jQuery): then that wins. They query THIS example's preview: in
        the REPL the example is "the document", and an :iframe example's document isn't the page.
        */
        const helpers = this.replHelpers();
        const prefix = evaluate('typeof $') === 'undefined'
            ? 'var $ = __tosiHelpers.$, $$ = __tosiHelpers.$$;'
            : '';
        const attempts = /\bawait\b/.test(code)
            ? [
                `${prefix}(async () => (${code}\n))()`,
                `${prefix}(async () => {${code}\n})()`,
            ]
            : [prefix + code];
        for (let i = 0; i < attempts.length; i++) {
            try {
                const result = await evaluate(attempts[i], helpers);
                this.addConsoleLine('result', formatConsoleValue(result));
                return result;
            }
            catch (error) {
                const syntax = error?.name === 'SyntaxError';
                if (syntax && i < attempts.length - 1)
                    continue;
                this.addConsoleLine('error', formatConsoleValue(error));
                return undefined;
            }
        }
        return undefined;
    }
    // The element the example renders into (inline), or the iframe's.
    currentPreview() {
        const { example } = this.parts;
        const inline = example.querySelector(':scope > .preview');
        if (inline)
            return inline;
        const frame = example.querySelector('iframe.preview-iframe');
        return (frame?.contentDocument?.querySelector('.preview') ?? null);
    }
    // Build-time transpiled JS for the source block, set by insert-examples from the
    // page's baked `<script type="application/tosi-transpiled">` (see
    // self-contained-examples-plan.md). When present AND tests are off (the deployed
    // reader), refresh() runs it directly and never loads the tjs transpiler. When
    // tests are on (localhost / the doc-test harness) it's ignored and refresh() takes
    // the original full-transform path — so the harness can't be regressed. Runtime
    // data only (not reflected to an attribute); absent on client-rendered SPA nav,
    // where refresh() falls back to transpiling on demand.
    compiledJs;
    // The source `compiledJs` was transpiled FROM. refresh() runs the bake only while it
    // still matches `this.js`, so the moment the user edits a tjs example the (now stale)
    // original bake is dropped and the edit transpiles on demand. Re-paired to the edited
    // source when a saved local edit carries its own bake (slice 4).
    compiledJsSource;
    // ── Read-only product tabs (tjs/ts only) ──────────────────────────────────
    // A `tjs`/`ts` example's source is editable; the JavaScript it compiles to is
    // shown read-only in an extra "JS" tab. The tab is added lazily (examples show
    // every named editor as a tab, so a static child would pollute plain-`js`
    // examples) the first time the code panel opens. `js` examples get nothing.
    jsOutEditor;
    tjsTestsView;
    productTabsReady = false;
    lastGeneratedJs = '';
    inlineTjsTestCount = 0;
    lastTjsTests;
    // Run the example's inline tjs tests (the `/*test 'desc' { … }*/` comments in
    // the tjs/ts source — distinct from the DOM-testing `test` block). Extract +
    // strip the tests, transpile the rest the same way execution does, then run
    // `execJs + testUtils + return testRunner` with the example context injected.
    async runInlineTjsTests(transform) {
        // Inline `/*test*/` comments are tjs-lang syntax: only tjs and ts sources carry them.
        if (this.dialect !== 'tjs' && this.dialect !== 'ts') {
            this.inlineTjsTestCount = 0;
            return;
        }
        const api = await loadTjsTestApi();
        if (!api) {
            this.inlineTjsTestCount = 0;
            return;
        }
        let extracted;
        try {
            extracted = api.extractTests(this.js);
        }
        catch {
            this.inlineTjsTestCount = 0;
            return;
        }
        this.inlineTjsTestCount = extracted.tests.length;
        if (extracted.tests.length === 0) {
            this.lastTjsTests = undefined;
            this.renderTjsTests();
            return;
        }
        try {
            const body = await this.inlineTjsTestBody(transform, api, extracted);
            // The test-stripped source still runs its top-level statements (to define
            // the functions under test), which may touch `preview` — give them a
            // throwaway one, mirroring execution's `{ preview, ...context }` scope.
            const fullContext = {
                preview: div({ class: 'preview' }),
                ...this.context,
            };
            const keys = contextParamNames(Object.keys(fullContext));
            const values = Object.values(fullContext);
            // @ts-expect-error AsyncFunction constructor typing
            const fn = new AsyncFunction(...keys, body);
            this.lastTjsTests = (await fn(...values));
        }
        catch (error) {
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
            };
        }
        this.renderTjsTests();
    }
    /*
    The function body that runs an example's inline tjs tests.
  
    Prefer the runner `tjs()` itself returns for the WHOLE source. That one is built from the
    test bodies after tjs-lang gave them the module's semantics, and it finds the runtime it
    needs in the module code it runs beside. The runner `extractTests` builds is from the RAW
    bodies: run that and a passing test is shown FAILING — `"hello world".capitalize is not a
    function` for a local `extend`, `Expected false but got true` for a boxed boolean (#210
    item 1). An older tjs-lang returns no runner from `tjs()`, and then the old path stands.
    */
    async inlineTjsTestBody(transform, api, extracted) {
        const whole = await transform(rewriteContextImports(this.js, this.context));
        if (typeof whole.testRunner === 'string') {
            return `${whole.code}\n${api.testUtils}\nreturn ${whole.testRunner}`;
        }
        const execJs = (await transform(rewriteContextImports(extracted.code, this.context))).code;
        return `${execJs}\n${api.testUtils}\nreturn ${extracted.testRunner}`;
    }
    renderTjsTests() {
        this.queueOutputRefresh();
        const view = this.tjsTestsView;
        if (!view)
            return;
        const results = this.lastTjsTests;
        if (!results || results.results.length === 0) {
            view.replaceChildren(div({ class: 'tjs-test-empty' }, 'No inline tjs tests.'));
            return;
        }
        view.replaceChildren(div({ class: 'tjs-test-summary' }, `${results.passed}/${results.results.length} passed`), ...results.results.map((r) => div({ class: r.passed ? 'test-pass' : 'test-fail' }, `${r.passed ? '✓' : '✗'} ${r.description}`, r.error ? span({ class: 'tjs-test-error' }, ` — ${r.error}`) : '')));
    }
    // The JavaScript `this.js` compiles to under the current dialect — the same
    // pipeline execution runs (rewriteImports → dialect transform), so the tab
    // shows what actually executes. Transpile errors render as a comment.
    async computeGeneratedJs(transform) {
        if (this.dialect === 'js')
            return '';
        try {
            return (await transform(rewriteImports(this.js, Object.keys(this.context)))).code;
        }
        catch (error) {
            return `// transpile error:\n// ${error.message}`;
        }
    }
    ensureProductTabs() {
        if (this.productTabsReady ||
            // plain js has no product tabs, unless the site replaced it (its `docs` gets a tab)
            (this.dialect === 'js' && isBuiltInDialect('js')) ||
            !this.hydrated ||
            !this.editorsBuilt // the editors it relabels don't exist yet
        )
            return;
        this.productTabsReady = true;
        const { editors } = this.parts;
        // Relabel the source tab from "js" to the actual dialect (the `part` stays
        // `js`, so everything referencing this.parts.js / this.js is unaffected), and
        // put the source editor in the dialect's mode — so a `tjs` example gets
        // first-class tjs editing (highlighting + autocomplete), `ts` gets TypeScript.
        const spec = getDialect(this.dialect);
        this.parts.js.setAttribute('name', spec?.label ?? this.dialect);
        // Runtime-value autocomplete: give the tjs completion source the example's live
        // bindings (context modules + the rendered preview) so it can suggest their REAL
        // members — including tosijs proxy members that static analysis can't see. Set
        // before `.mode` so the tjs extension loads with the config in one shot.
        this.parts.js.tjsAutocomplete = {
            getLiveBindings: () => this.liveBindings(),
        };
        this.parts.js.mode = spec?.editorMode ?? this.dialect;
        // A `run` dialect executes its source itself: there is no generated JavaScript to show.
        if (spec?.run) {
            editors.setupTabs();
            void this.updateDocs();
            return;
        }
        this.jsOutEditor = codeEditor({
            name: 'JS',
            mode: 'javascript',
            disabled: true,
        });
        editors.append(this.jsOutEditor);
        // Add a read-only "tjs tests" results tab only when the source has inline
        // `/*test*/` tests (computed during refresh, which runs before first open).
        if (this.inlineTjsTestCount > 0) {
            this.tjsTestsView = div({ name: 'tjs tests', class: 'tjs-test-results' });
            editors.append(this.tjsTestsView);
        }
        editors.setupTabs();
        this.jsOutEditor.value = this.lastGeneratedJs;
        this.renderTjsTests();
        void this.updateDocs();
    }
    // ── The Docs tab (#184 part 3) ──────────────────────────────────────────────
    // The dialect's generated documentation (its `docs` hook, or tjs-lang's for the built-in
    // tjs). Fetched only once the code panel is open, and again as the source changes. The tab
    // exists only while there are docs to show.
    docsView;
    docsRequest = 0;
    updateDocs = async () => {
        if (!this.productTabsReady)
            return;
        const request = ++this.docsRequest;
        let markdown;
        try {
            markdown = await dialectDocs(this.dialect, this.js, this.options);
        }
        catch (error) {
            markdown = `Docs could not be generated: ${error.message}`;
        }
        if (request !== this.docsRequest)
            return; // a newer edit asked again; it wins
        const { editors } = this.parts;
        if (!markdown.trim()) {
            if (this.docsView) {
                this.docsView.remove();
                this.docsView = undefined;
                editors.setupTabs();
            }
            return;
        }
        if (!this.docsView) {
            this.docsView = div({ name: 'Docs', class: 'example-docs' });
            editors.append(this.docsView);
            editors.setupTabs();
        }
        // <tosi-md> sanitizes by default: docs come from the example's source, so they render as
        // documentation, never as markup that runs. Imported here, on first use, so an app that
        // imports tosijs-ui/live-example without docs doesn't carry marked and the sanitizer.
        const { tosiMd } = await import('../markdown-viewer.js');
        if (request !== this.docsRequest || !this.docsView)
            return;
        this.docsView.replaceChildren(tosiMd({ value: markdown }));
    };
    // Capture the latest run's top-level locals (arrow property so `this` is bound
    // when passed as execution's `onScope`).
    captureScope = (scope) => {
        this.capturedScope = scope;
    };
    /**
     * Live bindings for tjs runtime-value autocomplete: the example's context modules
     * (keyed by the identifier the rewritten code uses, e.g. `tosijs`, `tosijsui`),
     * the currently-rendered `preview` element, and the latest run's top-level locals
     * (so `const app = tosi(…)` gives real `app.` / `app.items.` completions, proxy
     * members and all). Read lazily on each completion, so it reflects the latest run.
     */
    liveBindings() {
        const bindings = {};
        for (const [key, value] of Object.entries(this.context)) {
            bindings[contextVarName(key)] = value;
        }
        const preview = this.parts.example?.querySelector('.preview');
        if (preview)
            bindings.preview = preview;
        // Run locals last so they win over same-named context entries.
        Object.assign(bindings, this.capturedScope);
        return bindings;
    }
    updateUndo = () => {
        // The undo/redo buttons live in the lazy editor panel; only touch them once it's
        // built. The edited-indicator and test-results visibility work without editors
        // (they read the cached values / test state), so they always run.
        if (this.editorsBuilt) {
            const { activeTab } = this;
            const { undo, redo } = this.parts;
            if (activeTab instanceof CodeEditor) {
                undo.disabled = !activeTab.canUndo();
                redo.disabled = !activeTab.canRedo();
            }
            else {
                undo.disabled = true;
                redo.disabled = true;
            }
        }
        this.updateEditedIndicator();
        this.updateTestResultsVisibility();
    };
    /**
     * Does this example consist ONLY of tests?
     *
     * A ` ```test ` fence with no `js`/`html`/`css` beside it has nothing to render, so the
     * preview was an empty box — which reads as a broken example rather than as a passing test
     * suite, and hid the one thing the block was there to show. For these, the results ARE the
     * content.
     */
    get isTestOnly() {
        const blank = (v) => !v || v.trim() === '';
        return (!blank(this.test) && blank(this.js) && blank(this.html) && blank(this.css));
    }
    updateTestResultsVisibility() {
        const { testResults: resultsEl } = this.parts;
        const results = this.testResults;
        // The "DOM tests" tab's editor is this.parts.test (the part stays `test`
        // even though the tab label changed). No tab is active until the panel exists.
        const isTestTabActive = this.editorsBuilt && this.activeTab === this.parts.test;
        const hasFailed = results && results.failed > 0;
        /*
        A test-only example ALWAYS shows its results — they are its only output. Otherwise:
        results when the test tab is active, or when something failed.
        */
        resultsEl.hidden =
            !results ||
                results.tests.length === 0 ||
                (!this.isTestOnly && !isTestTabActive && !hasFailed);
        // Lets the stylesheet present the results as the example's body rather than as an
        // annotation under an empty preview.
        this.classList.toggle('-test-only', this.isTestOnly);
    }
    undo = () => {
        const { activeTab } = this;
        if (activeTab instanceof CodeEditor) {
            activeTab.undo();
        }
    };
    redo = () => {
        const { activeTab } = this;
        if (activeTab instanceof CodeEditor) {
            activeTab.redo();
        }
    };
    get isMaximized() {
        return this.classList.contains('-maximize');
    }
    flipLayout = () => {
        this.classList.toggle('-vertical');
    };
    // Persist this example's edits back to the source file's fenced blocks, located
    // by the source↔doc map (data-source-file + data-example-ordinal). Dev only —
    // writes via the /__docstore/source endpoint; the watcher then rebuilds.
    saveToSource = async () => {
        const sourceFile = this.getAttribute('data-source-file');
        const ordinalAttr = this.getAttribute('data-example-ordinal');
        if (!sourceFile || ordinalAttr === null) {
            window.alert('No source mapping for this example.');
            return;
        }
        let content;
        try {
            const response = await fetch(`/__docstore/source?file=${encodeURIComponent(sourceFile)}`);
            // 401/403 is "you need an invite link", NOT "this is a deployed site".
            // Conflating them sent people looking for a dev-mode problem that wasn't there.
            if (response.status === 401 || response.status === 403) {
                window.alert('This workspace needs an invite link before you can save.\n\n' +
                    'Run `tosijs-tunnel --link` on the machine hosting it and open the link once.');
                return;
            }
            if (!response.ok)
                throw new Error(String(response.status));
            content = await response.text();
        }
        catch {
            window.alert('Source endpoint unavailable — saving to source works in dev only.');
            return;
        }
        /*
        Pass the SAME policy `insert-examples` used to assign this ordinal. The ordinal is a
        shared coordinate system between the two modules; if they disagree about which fences
        are live examples, it indexes a different group here and the edit lands in the wrong
        block — silently, because a group exists at that index.
        */
        const updated = rewriteExampleBlocks(content, Number(ordinalAttr), {
            js: this.js,
            html: this.html,
            css: this.css,
            test: this.test,
        }, examplePolicy());
        if (updated === null) {
            // Distinguish the two failure modes so a source↔doc mismatch is diagnosable
            // (vs. a genuine no-op). An ordinal past the source's group count means the
            // page and the file disagree on how many example groups exist — commonly a
            // file with more than one doc comment, or fenced blocks the doc extractor
            // treats differently from a raw scan (e.g. indented inside the comment).
            const ordinal = Number(ordinalAttr);
            const groups = groupExamples(content, findFencedBlocks(content));
            if (ordinal >= groups.length) {
                window.alert(`Couldn't locate this example in ${sourceFile}: it's example ` +
                    `#${ordinal + 1} on the page, but a raw scan of the file finds only ` +
                    `${groups.length} fenced example group(s). The page↔source ordinals ` +
                    `disagree — likely multiple docs in one file, or indented fences. ` +
                    `(File a report with the source structure.)`);
            }
            else {
                window.alert('No changes to save.');
            }
            return;
        }
        try {
            const response = await fetch('/__docstore/source', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file: sourceFile, content: updated }),
            });
            if (response.status === 401 || response.status === 403) {
                window.alert('This workspace needs an invite link before it can save.\n\n' +
                    'Run `tosijs-tunnel --link` on the machine hosting it, open the link once, ' +
                    'then try again. Your edit is still here.\n\n' +
                    'If you opened this over the LAN (a `.local` address), saving will keep failing however many links you redeem — reach the workspace through its tunnel URL instead.');
                return;
            }
            if (!response.ok) {
                /*
                Surface the SERVER'S reason, not just "Save failed."
        
                The endpoint answers 501 with "editableSources is not enabled in this doc-site
                config" — an actionable sentence — and this threw it away for a generic
                failure, so the user could not tell an unconfigured server from a broken one
                and their edit appeared to vanish (tosijs-ui#34). Read the body.
                */
                const reason = await response.text().catch(() => '');
                window.alert(`Could not save to ${sourceFile}.\n\n` +
                    (reason.trim() || `The server answered ${response.status}.`) +
                    `\n\nYour edit is still in the editor.`);
                return;
            }
            window.alert(`Saved to ${sourceFile}`);
        }
        catch (e) {
            window.alert(`Save failed: ${e instanceof Error ? e.message : String(e)}\n\n` +
                'Your edit is still in the editor.');
        }
    };
    handleTestsToggle = (event) => {
        if (event.target.checked)
            enableTests();
        else
            disableTests();
    };
    // The maximize icon + title toggle purely in CSS (.hide-if-maximized /
    // .show-if-maximized); only the run-tests checkbox needs a JS sync so its state
    // is correct on first paint and after the global flag changes. (Its greyed /
    // monochrome look keys off the --tests-enabled CSS var, which is global.)
    updateExampleWidgets = () => {
        if (!this.hydrated)
            return;
        if (this.parts.testsCheckbox)
            this.parts.testsCheckbox.checked = testManager.enabled.value;
    };
    handleShortcuts = (event) => {
        if (event.metaKey || event.ctrlKey) {
            let block = false;
            switch (event.key) {
                case 's':
                case 'r':
                    this.doRefresh();
                    block = true;
                    break;
                case '/':
                    this.flipLayout();
                    break;
                case 'c':
                    if (event.shiftKey) {
                        this.copy();
                        block = true;
                    }
                    break;
            }
            if (block) {
                event.preventDefault();
                event.stopPropagation();
            }
        }
    };
    content = () => [
        div({ part: 'example' }, style({ part: 'style' }), pre({ part: 'testResults', hidden: true }), 
        // The example toolbar: a pocket bar whose collapsed `<>` handle carries the
        // test-status colour (via --widget-color). Pinned top-right, growing left, so
        // it never covers the editor in side-by-side mode.
        /*
        ORDERED BY REACH, and the order below IS the left-to-right order.
  
        The bar grows WEST from a handle pinned top-right, so the LAST child sits nearest
        the handle — the shortest travel for the pointer that just opened it. Maximize goes
        there because it is the one you reach for repeatedly while reading; tests, which you
        toggle once, sits furthest. Measured: handle at x=853, children at 694/738/781/825.
  
        The owl rather than `<>`: the handle is the one piece of this UI on every example
        of every doc site built with this, which makes it the one place branding costs
        nothing and is seen everywhere.
        */
        tosiPocketBar({
            part: 'exampleWidgets',
            icon: 'tosi',
            direction: 'w',
            onClick: this.collapseWidgetsAfterAction,
        }, label({ class: 'tests-toggle', title: 'run tests' }, input({
            type: 'checkbox',
            part: 'testsCheckbox',
            onChange: this.handleTestsToggle,
        }), icons.check()), button({
            title: 'view/edit code in a new window',
            onClick: this.openEditorWindow,
        }, icons.edit()), button({ title: 'view/edit code', onClick: this.showCode }, icons.edit2()), button({ title: 'toggle preview size', onClick: this.toggleMaximize }, 
        // Both icons render; the existing .hide-if-maximized / .show-if-maximized
        // CSS shows the right one for the current state — no JS icon swap.
        icons.maximize({ class: 'hide-if-maximized' }), icons.minimize({ class: 'show-if-maximized' }))), 
        // Shown while a `run` dialect's run is pending (see refresh()).
        div({
            part: 'running',
            role: 'status',
            ariaLabel: 'Running',
            hidden: true,
        }), 
        // What the run logged, shown in place of a preview that rendered nothing (refreshOutput).
        div({ part: 'output', role: 'log', hidden: true })),
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
    ];
    // The editor panel (4 <tosi-code> editors + toolbar). Built on demand by
    // ensureEditors(), NOT in content() — constructing a <tosi-code> is what imports
    // the CodeMirror chunk, so keeping it out of the reader's mount path is the whole
    // point of slice 3. The `part` names match what content() used, so every
    // this.parts.{js,html,css,test,editors,undo,redo} reference resolves once built.
    buildEditorPanel() {
        return tosiTabs({
            part: 'editors',
            onChange: this.updateUndo,
        }, codeEditor({ name: 'js', mode: 'javascript', part: 'js' }), codeEditor({ name: 'html', mode: 'html', part: 'html' }), codeEditor({ name: 'css', mode: 'css', part: 'css' }), 
        // The `test` block tests the rendered preview (DOM), so its tab is
        // labeled "DOM tests" to distinguish it from inline tjs unit tests. The
        // `part`/`name` stay `test`; only the displayed label differs.
        codeEditor({ name: 'DOM tests', mode: 'javascript', part: 'test' }), 
        // the Console tab (logs + REPL), unless the site or the fence turned the console off
        ...(this.consoleEnabled ? [this.buildConsoleView()] : []), div({ slot: 'after-tabs', class: 'row' }, button({
            title: 'undo',
            part: 'undo',
            class: 'transparent',
            onClick: this.undo,
        }, icons.cornerUpLeft()), button({
            title: 'redo',
            part: 'redo',
            class: 'transparent',
            onClick: this.redo,
        }, icons.cornerUpRight()), button({
            title: 'example menu — refresh, flip, undo, copy, save/revert edits',
            class: 'transparent source-menu',
            onClick: this.sourceMenu,
        }, icons.moreVertical()), button({
            title: 'close code',
            class: 'transparent',
            onClick: this.closeCode,
        }, icons.x())));
    }
    // Build the editor panel the first time a code panel is opened, flush the cached
    // values into the now-real editors, and wire the tjs/ts read-only JS tab. Idempotent.
    ensureEditors() {
        if (this.editorsBuilt || !this.hydrated)
            return;
        this.parts.codeEditors.append(this.buildEditorPanel());
        this.editorsBuilt = true;
        // pendingValues → the real editors, then pick the default tab and product tabs.
        this.flushPendingValues();
        this.ensureProductTabs();
        this.showDefaultTab();
        this.updateUndo();
    }
    connectedCallback() {
        super.connectedCallback();
        // super.connectedCallback() ran hydrate(), so `this.hydrated` is now true and
        // `parts` is safe to touch. The editor panel is NOT built here — values stay in
        // `pendingValues` and are flushed into the editors when ensureEditors() builds
        // them (first showCode). The preview runs from `pendingValues` meanwhile.
        const { sources } = this.parts;
        this.initFromElements([...sources.children]);
        // Set up remote sync
        this.remoteSync = new RemoteSyncManager(this.storageKey, this.remoteKey, (payload) => {
            if (payload.close) {
                if (this.remoteId !== '') {
                    // Remote editor window — close the popup
                    window.close();
                }
                else {
                    // Original window — restore from maximized state
                    this.classList.remove('-maximize');
                    this.parts.codeEditors.hidden = true;
                }
                return;
            }
            this.css = payload.css;
            this.html = payload.html;
            this.js = payload.js;
            if (payload.test)
                this.test = payload.test;
            // Adopt the main window's pristine snapshot (once) so this pop-out can
            // compute "has edits", diff View changes, and enable the Save actions.
            if (this.remoteId !== '' && payload.original && !this.originalCode) {
                this.originalCode = { ...payload.original };
            }
            this.refresh();
        });
        this.remoteSync.startListening();
        // Stochastic undo-state polling — jittered base interval avoids
        // synchronizing when many examples are on the same page.
        const jitter = Math.random() * 100;
        this.undoInterval = setInterval(() => {
            if (!document.hidden)
                this.updateUndo();
        }, 250 + jitter);
        // Send close signal when the tab/window closes — disconnectedCallback
        // does not fire reliably during page unload.
        this.beforeUnloadHandler = () => this.remoteSync?.sendClose();
        addEventListener('beforeunload', this.beforeUnloadHandler);
        // Reflect maximize state + tests-enabled on the pocket-bar controls. The
        // run-tests icon greys globally via the --tests-enabled CSS var (maintained on
        // <body>), so no per-instance observer is needed to keep examples in sync.
        this.updateExampleWidgets();
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this.runAbort?.abort();
        this.remoteSync?.sendClose();
        this.remoteSync?.stopListening();
        if (this.undoInterval) {
            clearInterval(this.undoInterval);
            this.undoInterval = undefined;
        }
        if (this.beforeUnloadHandler) {
            removeEventListener('beforeunload', this.beforeUnloadHandler);
            this.beforeUnloadHandler = undefined;
        }
    }
    exampleMarkdown() {
        const block = (lang, code) => code !== '' ? '```' + lang + '\n' + code.trim() + '\n```\n' : '';
        return (block(this.dialect, this.js) +
            block('html', this.html) +
            block('css', this.css) +
            block('test', this.test));
    }
    copy = () => {
        navigator.clipboard.writeText(this.exampleMarkdown());
    };
    downloadExample = () => {
        const src = this.getAttribute('data-source-file') || 'example';
        const ord = this.getAttribute('data-example-ordinal');
        const name = (src.split('/').pop() || 'example').replace(/\.\w+$/, '') +
            (ord !== null ? `-example-${ord}` : '') +
            '.md';
        const url = URL.createObjectURL(new Blob([this.exampleMarkdown()], { type: 'text/markdown' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    // ── Local edit scratchpad (per-browser; keyed by the source↔doc map) ───────
    // The original source blocks, snapshotted at mount so "revert" can restore
    // them after a locally-saved edit.
    originalCode = null;
    localEditKey() {
        const src = this.getAttribute('data-source-file');
        const ord = this.getAttribute('data-example-ordinal');
        return src && ord !== null ? exampleEditKey(src, ord) : '';
    }
    applyEdit(edit) {
        if (edit.js !== undefined)
            this.js = edit.js;
        if (edit.html !== undefined)
            this.html = edit.html;
        if (edit.css !== undefined)
            this.css = edit.css;
        if (edit.test !== undefined)
            this.test = edit.test;
        // If the saved edit carried its own bake, re-pair it to the edited source so a
        // reader reload runs the edit without the transpiler. Otherwise leave compiledJs
        // as-is; the source→bake mismatch makes refresh() transpile on demand (correct).
        if (edit.compiledJs !== undefined && edit.js !== undefined) {
            this.compiledJs = edit.compiledJs;
            this.compiledJsSource = edit.js;
        }
    }
    // "Has edits" = current code differs from the snapshotted original (trailing
    // whitespace ignored, since editors normalize it). Drives Save/Revert enabled
    // state and the local-edit indicator.
    hasLocalEdits() {
        if (!this.originalCode)
            return false;
        const o = this.originalCode;
        const t = (s) => (s ?? '').replace(/\s+$/, '');
        return (t(this.js) !== t(o.js) ||
            t(this.html) !== t(o.html) ||
            t(this.css) !== t(o.css) ||
            t(this.test) !== t(o.test));
    }
    updateEditedIndicator() {
        this.classList.toggle('-locally-edited', this.hasLocalEdits());
    }
    canUndo() {
        const t = this.activeTab;
        return t instanceof CodeEditor && t.canUndo();
    }
    canRedo() {
        const t = this.activeTab;
        return t instanceof CodeEditor && t.canRedo();
    }
    saveLocalEdit = () => {
        const key = this.localEditKey();
        if (!key) {
            window.alert('This example has no source mapping to key a local save.');
            return;
        }
        saveExampleEdit(key, {
            js: this.js,
            html: this.html,
            css: this.css,
            test: this.test,
            // Keep the transpiled code alongside the source so a restored edit runs without
            // reloading the transpiler. refresh() keeps compiledJs paired with the current
            // source, so persist it only when it still matches (never a stale value). `js`
            // needs no transpiler.
            compiledJs: this.dialect !== 'js' && this.compiledJsSource === this.js
                ? this.compiledJs
                : undefined,
        });
        this.updateEditedIndicator();
        // A local save is a per-browser scratchpad, not a file write — say so, or it
        // reads as a no-op ("I saved but the file didn't change"). "Save to source"
        // (localhost + editableSources) is the one that writes the file.
        postNotification({
            type: 'success',
            message: 'Saved to this browser only — use “Save to source” to write the file.',
        });
    };
    revertLocalEdit = () => {
        const key = this.localEditKey();
        if (key)
            clearExampleEdit(key);
        if (this.originalCode)
            this.applyEdit(this.originalCode);
        // Reverting leaves nothing to diff — drop out of the diff view if we're in it.
        if (this.viewingChanges)
            this.viewChanges();
        this.updateEditedIndicator();
        this.refresh();
    };
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
        };
        const key = this.localEditKey();
        if (!key || !hasExampleEdit(key))
            return;
        const edit = loadExampleEdit(key);
        if (edit) {
            this.applyEdit(edit);
            this.updateEditedIndicator();
            this.refresh();
        }
    };
    // Toggle a per-tab diff (current vs original source) across the example's
    // editors. Each editor diffs its own single text — no need to combine the
    // html/css/js/test split — so switching tabs shows that tab's changes.
    viewingChanges = false;
    viewChanges = () => {
        if (!this.hydrated)
            return;
        this.ensureEditors(); // diffing reaches into this.parts[tab] — build them first
        this.viewingChanges = !this.viewingChanges;
        if (this.viewingChanges)
            this.showCode();
        const originals = this.originalCode ?? {};
        for (const tab of ['js', 'html', 'css', 'test']) {
            // Set the diff baseline (the source) right before showing the diff, now
            // that the editors are hydrated.
            this.parts[tab].original = originals[tab] ?? '';
            /*
            Viewing changes is also how you UNDO some of them.
      
            Revert has always been all-or-nothing, which is the wrong shape for the common case:
            you tried four things, three worked. Each change now carries keep/revert buttons,
            defaulting to KEEP, so doing nothing here leaves your edit exactly as it was and the
            feature costs nothing to ignore. The editors apply the choices when the diff closes.
      
            "Source" and "Yours" rather than the component's own original/modified, which is
            accurate but says nothing about which side is the file and which side is you.
            */
            this.parts[tab].diffResolvable = true;
            this.parts[tab].diffOriginalLabel = 'Source';
            this.parts[tab].diffModifiedLabel = 'Yours';
            this.parts[tab].showDiff(this.viewingChanges);
        }
        // Closing the diff may have partially reverted the code, so the edited
        // indicator and the running example both need to catch up.
        if (!this.viewingChanges) {
            this.updateEditedIndicator();
            this.refresh();
        }
    };
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
            this.refreshRemote();
        }
        else {
            void this.refresh();
        }
    };
    sourceMenu = (event) => {
        const key = this.localEditKey();
        const hasEdits = () => this.hasLocalEdits();
        // View changes / Revert need the source snapshot, which only the page-embedded
        // example has — the pop-out editor window has no originalCode to compare to.
        const hasSnapshot = this.originalCode != null;
        popMenu({
            target: event.target.closest('button'),
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
                                void this.saveToSource();
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
        });
    };
    /*
    Collapse the bar once the user has actually done something.
  
    It used to stay open over the example after every action — you clicked "maximize" and
    the bar sat there covering the corner of the thing you had just maximised, until you
    remembered to click the handle again.
  
    Only the SLOTTED controls count. The handle lives in the bar's own shadow root, so
    closing on any click would close it the instant you opened it. `composedPath` because
    the click lands on an icon INSIDE a button, and a direct child of the bar is exactly
    the set of affordances we put there.
    */
    collapseWidgetsAfterAction = (event) => {
        if (!this.hydrated)
            return;
        // `close()`, not `open = false`: writing `open` behind the component's back leaves its
        // private `pinned` flag set, and then the bar re-opens on hover and stays open — the very
        // thing this handler exists to stop. (`this.parts` throws rather than returning nullish,
        // so the old undefined/null guard here was dead code.)
        const bar = this.parts.exampleWidgets;
        const acted = event
            .composedPath()
            .some((node) => node instanceof HTMLElement && node.parentElement === bar);
        if (acted)
            bar.close?.();
    };
    toggleMaximize = () => {
        this.classList.toggle('-maximize');
    };
    showCode = () => {
        this.ensureEditors(); // first open builds the CodeMirror panel (and pulls the chunk)
        this.classList.add('-maximize');
        this.classList.toggle('-vertical', this.offsetHeight > this.offsetWidth);
        this.parts.codeEditors.hidden = false;
        this.ensureProductTabs();
    };
    closeCode = () => {
        if (this.remoteId !== '') {
            // Remote editor window — send close signal to original, then close popup
            this.remoteSync?.sendClose();
            window.close();
        }
        else {
            // Original window — restore and close any remote editor
            this.remoteSync?.sendClose();
            this.classList.remove('-maximize');
            this.parts.codeEditors.hidden = true;
        }
    };
    openEditorWindow = () => {
        const { css, html, js, test } = this;
        openEditorWindow(this.prefix, this.uuid, this.storageKey, this.remoteKey, { css, html, js, test }, {
            // Give the pop-out the same source↔doc key + pristine snapshot the main
            // window has, so it offers the full menu (Save local / Save to source /
            // View changes) instead of a reduced one.
            sourceFile: this.getAttribute('data-source-file'),
            ordinal: this.getAttribute('data-example-ordinal'),
            original: this.originalCode ?? undefined,
        });
        // The pop-out window owns editing now — maximize the preview AND close the
        // inline code view here (it stays open otherwise if it was already showing).
        this.classList.add('-maximize');
        this.parts.codeEditors.hidden = true;
    };
    refreshRemote = () => {
        this.remoteSync?.send({
            css: this.css,
            html: this.html,
            js: this.js,
            test: this.test,
        });
    };
    updateSources = () => {
        if (this.persistToDom) {
            const { sources } = this.parts;
            sources.innerText = '';
            for (const language of ['js', 'css', 'html', 'test']) {
                if (this[language]) {
                    sources.append(pre({
                        class: `language-${language}`,
                        innerHTML: this[language],
                    }));
                }
            }
        }
    };
    refresh = async () => {
        if (this.remoteId !== '')
            return;
        // Reader fast path: with the build-time bake AND tests off (the deployed
        // reader — tests default off outside localhost), run the example WITHOUT
        // loading the tjs transpiler. When tests are on (localhost / the doc-test
        // harness) `bake` is undefined and this is the original full-transform path,
        // so the harness is untouched. The bake is byte-identical to what the
        // transform would produce (it IS `transform(rewriteImports(js))`).
        // ...and only while the bake still matches the current source — an edit drops the
        // stale original bake and transpiles the edit on demand (slice 4).
        // A `run` dialect (registerDialect) executes the source itself, so it has no transform and
        // no bake: the example sets up its HTML and CSS as usual, then hands the source over.
        const runner = getDialect(this.dialect)?.run;
        this.runAbort?.abort();
        const runAbort = (this.runAbort = new AbortController());
        if (this.hydrated)
            this.parts.running.hidden = true;
        this.runSettled = false;
        this.refreshOutput();
        this.clearConsole();
        const exampleConsole = this.consoleForRun();
        // The bake was made at build time by the PINNED transpiler, so it is only valid for a
        // built-in dialect. A site that registered its own `tjs` would otherwise get its override
        // in dev (tests on, no bake) and the pinned output in production (tests off).
        const bake = !runner &&
            isBuiltInDialect(this.dialect) &&
            this.dialect !== 'js' &&
            !testManager.enabled.value &&
            this.compiledJs !== undefined &&
            this.compiledJsSource === this.js
            ? this.compiledJs
            : undefined;
        const transform = bake === undefined && !runner
            ? await dialectTransform(this.dialect, this.options)
            : undefined;
        const { example, style: styleEl, exampleWidgets } = this.parts;
        // Keep the read-only generated-JS tab (tjs/ts) in sync with the source, and
        // re-run any inline tjs tests for the "tjs tests" results tab. With the bake we
        // already have the generated JS and skip the transpiler-bound inline-test run.
        if (this.dialect !== 'js' && !runner) {
            this.lastGeneratedJs = bake ?? (await this.computeGeneratedJs(transform));
            if (this.jsOutEditor)
                this.jsOutEditor.value = this.lastGeneratedJs;
            if (bake === undefined) {
                // Freshly transpiled (edited source, or a dialect the build didn't bake):
                // cache it AS the bake, paired with the source it came from. So saveLocalEdit
                // can persist it and later refreshes of the same source skip re-transpiling —
                // the transpiler is already loaded at this point, so this costs nothing.
                this.compiledJs = this.lastGeneratedJs;
                this.compiledJsSource = this.js;
                await this.runInlineTjsTests(transform);
            }
        }
        let preview;
        let executionError;
        const onError = (error) => {
            executionError = error;
            // the error that stopped the example belongs in its console, as in devtools
            if (this.consoleEnabled)
                this.addConsoleLine('error', formatConsoleValue(error));
        };
        // Scope capture feeds tjs autocomplete (getLiveBindings), which is only consulted
        // for tjs/ts examples once a code panel is open. Gating it here keeps the optional
        // tjs-lang/editors bundle (and its AST parse) off the reader path — it loads only
        // when someone actually edits a tjs/ts example. `js` never needs it. (The Console
        // tab's REPL doesn't use it: it evaluates inside the example's own scope, onRepl.)
        const onScope = this.dialect !== 'js' && !runner && this.editorsBuilt
            ? this.captureScope
            : undefined;
        // The REPL's door into this run's scope; a superseded run's evaluator is dropped. Only
        // once someone has used the REPL: the hook is a direct eval, which slows the whole example
        // and keeps its scope alive, so readers who never open the console never pay for it.
        this.replEvaluate = undefined;
        const onRepl = this.replWanted && this.consoleEnabled && !runner
            ? (evaluate) => {
                if (!runAbort.signal.aborted)
                    this.replEvaluate = evaluate;
            }
            : undefined;
        // 'iframe' and (for now) 'ide' both run in an isolated iframe. 'ide' — the fully
        // sandboxed real-published-deps mode — is a recognized flag; its distinct
        // real-module execution is a follow-up (import-resolver-plan.md phase 2), so it
        // currently uses the iframe path.
        const mode = this.effectiveMode;
        if (mode === 'iframe' || mode === 'ide') {
            preview = await executeInIframe({
                html: this.html,
                css: this.css,
                js: this.js,
                context: this.context,
                transform,
                compiledJs: runner ? '' : bake,
                exampleElement: example,
                widgetsElement: exampleWidgets,
                onError,
                onScope,
                onRepl,
                console: exampleConsole,
            });
        }
        else {
            preview = await executeInline({
                html: this.html,
                css: this.css,
                js: this.js,
                context: this.context,
                transform,
                compiledJs: runner ? '' : bake,
                exampleElement: example,
                styleElement: styleEl,
                widgetsElement: exampleWidgets,
                onError,
                onScope,
                onRepl,
                console: exampleConsole,
            });
        }
        if (runner && preview) {
            const target = preview;
            /*
            A slow run (a network call, an LLM) is an empty box until it resolves, which reads as
            broken (tjs-lang, #184). So show a spinner — after a beat, so a fast run never flashes
            it — until it resolves or a re-run supersedes it.
            */
            const running = this.parts.running;
            const showRunning = setTimeout(() => {
                if (runAbort.signal.aborted)
                    return;
                running.classList.toggle('still', prefersReducedMotion());
                running.hidden = false;
            }, LiveExample.runningDelayMs);
            try {
                const result = await runner(this.js, {
                    preview: target,
                    options: this.options,
                    signal: runAbort.signal,
                    context: this.context,
                    console: exampleConsole ?? globalThis.console,
                    report: (value) => showDialectResult(target, value),
                });
                if (result !== undefined && !runAbort.signal.aborted)
                    showDialectResult(target, result);
            }
            catch (error) {
                // A run superseded by a newer one is not a failure of the newer one.
                if (!runAbort.signal.aborted)
                    onError(error);
            }
            finally {
                clearTimeout(showRunning);
                // only if no newer run has taken over the spinner
                if (this.runAbort === runAbort)
                    running.hidden = true;
            }
        }
        // The run has settled: if it rendered nothing, show what it logged (refreshOutput).
        if (this.runAbort === runAbort) {
            this.runSettled = true;
            this.refreshOutput();
        }
        if (this.persistToDom) {
            this.updateSources();
        }
        // the Docs tab follows the source, for every dialect (a no-op until the panel is open)
        void this.updateDocs();
        // Run tests when there are any — but a build/exec failure is a test failure
        // in its own right, so surface it even when the example defines no `test`
        // blocks (and even if the failure was hard enough to produce no preview).
        /*
        A TEST-ONLY example always runs its tests: its results are its body, so with tests off (the
        default anywhere but localhost) it rendered an empty box on every deployed site. For every
        other example the page-wide toggle still decides, because there the results are an overlay.
        */
        if ((this.test || executionError) &&
            (testManager.enabled.value || this.isTestOnly)) {
            // Let queued renders (rAF) settle before running tests
            await new Promise((resolve) => requestAnimationFrame(resolve));
            this.classList.add('-has-tests', '-test-running');
            this.classList.remove('-test-passed', '-test-failed');
            // `test` blocks are conventional JS/TS regardless of the example's dialect,
            // so they're transpiled as plain js — never lowered through tjs/ts.
            const testTransform = await loadTransform('js');
            // Only run `test` blocks if the example actually produced a preview to
            // assert against; a failed build has nothing to test but still fails below.
            this.testResults =
                this.test && preview
                    ? await runTests(this.test, preview, this.context, testTransform)
                    : { passed: 0, failed: 0, tests: [] };
            if (executionError) {
                this.testResults.failed += 1;
                this.testResults.tests.unshift({
                    name: 'example loads without error',
                    passed: false,
                    error: String(executionError),
                });
            }
            this.classList.remove('-test-running');
            this.displayTestResults();
        }
        else {
            this.classList.remove('-has-tests', '-test-running', '-test-passed', '-test-failed');
        }
    };
    displayTestResults() {
        const { testResults: resultsEl, exampleWidgets } = this.parts;
        const results = this.testResults;
        if (!results || results.tests.length === 0) {
            resultsEl.hidden = true;
            this.classList.remove('-test-passed', '-test-failed');
            if (exampleWidgets)
                exampleWidgets.title = 'no tests';
            return;
        }
        resultsEl.innerHTML = '';
        const summary = div({ style: { marginBottom: '8px', fontWeight: 'bold' } }, `${results.passed}/${results.tests.length} tests passed`);
        resultsEl.append(summary);
        for (const test of results.tests) {
            const icon = test.passed ? '✓' : '✗';
            const cls = test.passed ? 'test-pass' : 'test-fail';
            const testEl = div({ class: cls }, span(icon + ' '), test.name, test.error
                ? span({ style: { opacity: '0.7' } }, ` - ${test.error}`)
                : '');
            resultsEl.append(testEl);
        }
        this.classList.toggle('-test-passed', results.failed === 0);
        this.classList.toggle('-test-failed', results.failed > 0);
        // The `<>` handle colour shows pass/fail; its tooltip carries the detail.
        if (exampleWidgets)
            exampleWidgets.title =
                results.failed === 0
                    ? `${results.passed} tests passed`
                    : `${results.failed}/${results.tests.length} tests failed`;
        // Update visibility based on tab and failure status
        this.updateTestResultsVisibility();
        // Dispatch event for doc-browser to track results
        this.dispatchEvent(new CustomEvent('testcomplete', {
            bubbles: true,
            detail: {
                results,
                element: this,
            },
        }));
    }
    initFromElements(elements) {
        for (const element of elements) {
            element.hidden = true;
            const [mode, ...lines] = element.innerHTML.split('\n');
            if (['js', 'html', 'css', 'test'].includes(mode)) {
                const minIndex = lines
                    .filter((line) => line.trim() !== '')
                    .map((line) => line.match(/^\s*/)[0].length)
                    .sort()[0];
                const source = (minIndex > 0 ? lines.map((line) => line.substring(minIndex)) : lines).join('\n');
                this.setEditorValue(mode, source);
            }
            else {
                const language = ['js', 'html', 'css', 'test'].find((lang) => element.matches(`.language-${lang}`));
                if (language) {
                    this.setEditorValue(language, language === 'html' ? element.innerHTML : element.innerText);
                }
            }
        }
    }
    showDefaultTab() {
        // No tab strip until the panel is built; remember to pick the tab then.
        if (!this.hydrated || !this.editorsBuilt) {
            this.pendingShowDefaultTab = true;
            return;
        }
        const { editors } = this.parts;
        if (this.js !== '') {
            editors.value = 0;
        }
        else if (this.html !== '') {
            editors.value = 1;
        }
        else if (this.css !== '') {
            editors.value = 2;
        }
        else if (this.test !== '') {
            editors.value = 3;
        }
    }
    render() {
        super.render();
        this.updateExampleWidgets();
        if (this.remoteId !== '') {
            const data = localStorage.getItem(this.storageKey);
            if (data !== null) {
                const payload = JSON.parse(data);
                if (this.remoteKey !== payload.remoteKey)
                    return;
                this.css = payload.css;
                this.html = payload.html;
                this.js = payload.js;
                if (payload.test)
                    this.test = payload.test;
                // The pop-out editor window IS the editor — build the panel and flush the
                // values above into it (they went to pendingValues since it wasn't built yet).
                this.ensureEditors();
                this.parts.example.hidden = true;
                this.parts.codeEditors.hidden = false;
                this.classList.add('-maximize');
                this.updateUndo();
            }
        }
        else {
            this.refresh();
        }
    }
}
export const liveExample = LiveExample.elementCreator();
// Auto-initialize remote editor window
const params = new URL(window.location.href).searchParams;
const remoteId = params.get('lx');
if (remoteId) {
    document.title += ' [code editor]';
    document.body.textContent = '';
    const example = liveExample({ remoteId });
    // Carry the source↔doc key through so the pop-out's Save local / Save to source
    // menu items appear and work (the pristine snapshot arrives via the payload).
    const sourceFile = params.get('sf');
    const ordinal = params.get('ord');
    if (sourceFile && ordinal !== null) {
        example.setAttribute('data-source-file', sourceFile);
        example.setAttribute('data-example-ordinal', ordinal);
    }
    document.body.append(example);
}
