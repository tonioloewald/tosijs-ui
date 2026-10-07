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
console off (below) turns this off too. It applies to inline examples; an `:iframe`
example's output stays in its Console tab.

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
