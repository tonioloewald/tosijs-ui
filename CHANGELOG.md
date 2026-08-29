# Changelog

## 1.12.5

### Fixed: on a narrow screen, tapping a nav link left you looking at the nav

A regression from 1.12.3's full-screen work, reported from a phone-width window. The sidebar
fills the screen, you tap a link, the URL changes — and the nav stays up. The article you asked
for never appears.

Leaving full-screen had been written as the tidy mirror of entering it: `navVisible = true`. But
that setter's show-the-nav branch writes `contentVisible = false`, and it ran on **every**
navigation to a non-full-screen page — immediately after the nav click handler had set
`contentVisible = true` to do precisely the thing the reader asked for. The layout code was
overwriting a decision that belongs to the person reading.

The two directions are asymmetric now, and that is the point rather than an oversight: entering
full-screen states what it needs, and stepping out of it releases only what it claimed
(`alwaysCompact`). Which pane is showing at a narrow width is not the layout's business.

**Nothing in the test suite could have caught this.** Every layout test ran at 1400px, where
normal mode shows the nav and the content together and `contentVisible` has no visible effect —
the bug was invisible at every width the tests used. There are now narrow-viewport tests for
both directions, and the mutation that restores the old line fails them.

### A bundle that references an unserved sourcemap now says so at build time ([#103](https://github.com/tonioloewald/tosijs-ui/issues/103))

`--sourcemap=linked` appends a `sourceMappingURL` comment, so devtools fetches that file on every
load. When the map is not in the served root the fetch fails — in exactly the session where
someone is reading the console carefully for something else. It cost the reporter a wrong
hypothesis while chasing a slow load.

The uglier half was already fixed by #116 in this same release: the SPA fallback used to answer
`.map` requests with the **HTML shell**, so devtools received a web page where a JSON map should
be. Missing assets 404 now.

The remaining half is a build-time warning naming the file and where it was expected. It checks
what is **served**, not what was built — those differ whenever `bundleOutDir` is set, and the
copy across is best-effort by design, so trusting the step is what let this ship. It warns rather
than fails: a map is a debugging convenience and no site should fail to build without one.

The check is a pure, tested function rather than an inline block, because the branch it lives in
is one **this repo's own build never takes** — our bundle comes from `bin/dev.ts`, not from
`buildSite`. That is exactly why the bug reached an adopter instead of us.

### `resolveUnder` asserts path containment instead of inheriting it ([#96](https://github.com/tonioloewald/tosijs-ui/issues/96))

Defence in depth: there is no live traversal, and the reporter checked the classes carefully —
`/../../../etc/passwd`, percent-encoded and double-encoded forms all stay inside the served root
today. But they stay inside for two reasons the static handler does not own: the WHATWG URL
parser collapses `../` before `.pathname` is read, and `.pathname` is never the raw request line.
Both are properties of the **caller**, so a future call with a path from a config value, a
manifest entry or a header inherits nothing. The asserted version already lived ten lines away
in the same file.

Now an exported, tested predicate — a test that went through the server would prove nothing,
since the URL parser makes a violation unreachable from outside.

### `bun run stop` — stop THIS project's dev server, not every one on the machine ([#117](https://github.com/tonioloewald/tosijs-ui/issues/117))

There was no way to stop a dev server, so what everyone reached for was
`pkill -f 'bun bin/dev.ts'` — which matches **every** dev server on the machine, because every
project on this pipeline runs an identical command line. A sibling checkout, a worktree or
another agent's session died to a command that reads as "restart mine". Observed five times in
one working day, twice while a tunnel link was in use by a remote reviewer.

The record needed for this already existed: the build lock stores `pid`, `port` and `root`,
per-project, with staleness decided by liveness rather than age. It needed a reader and a
command. `bun run stop` (or `bun bin/dev.ts --stop`) signals that pid and nothing else, and says
plainly when nothing is running.

### The dev server can no longer die silently ([#91](https://github.com/tonioloewald/tosijs-ui/issues/91))

Reported after a ~9.4h run: `pgrep` said running, `curl` got nothing, the last log line was a
**successful** build, and there was no error, signal or exit anywhere. Every diagnostic a person
would reach for answered "fine"; it was found the next day because a human said the site was
down.

Worth correcting the report's own diagnosis, because it does not survive the evidence: the idle
path **announces itself** before exiting, and no such line was logged — so the idle timeout is
not what stopped that listener. What did is still unknown, which is exactly why the fix targets
the symptom rather than a cause.

The health tick now probes the server's own listener (`GET /__alive`, a bare 204 that
deliberately does **not** count as activity — a self-check that did would hold the idle timer
open forever). Two consecutive failures and it exits non-zero with an explanation. A process that
cannot serve has no value, and the one useful thing left to it is to stop claiming to be alive.

### `tosijs-tunnel --link` stops printing links that cannot work ([#94](https://github.com/tonioloewald/tosijs-ui/issues/94))

`--link` asks the dev server for a token, which succeeds whether or not a tunnel exists. The URL
is well-formed and the token is real — it just answers 503, because nothing is listening
upstream. Printed with exit 0 and no comment, that is indistinguishable from the far side being
down.

It still prints the link, since you may be about to start the tunnel, but it now says so and
exits non-zero, so a script treating 0 as "a usable link was produced" is telling the truth.

### Doc tests survive a context key with a slash in it ([#111](https://github.com/tonioloewald/tosijs-ui/issues/111), [#112](https://github.com/tonioloewald/tosijs-ui/issues/112), [#109](https://github.com/tonioloewald/tosijs-ui/issues/109))

Context keys become **function parameter names** — the runner builds each block as
`new Fn(...contextKeys, body)`. `test-harness.ts` carried its own copy of the rule that turns a
key into an identifier, `key.replace(/-/g, '')`, which strips hyphens and leaves slashes and
`@`. So an ordinary specifier like `'tosijs-3d/demo-utils'` became the parameter name
`tosijs3d/demoutils`, and **every test in that file died before one of them ran** with V8's
`Arg string terminates parameters early`. The examples on the same page rendered fine, because
they went through the shared sanitiser — so nothing looked wrong except a red badge.

One implementation now, in `code-transform.ts`, used by all five call sites. It also handles
what the shared version had never needed to: a leading digit (`'3d-tools'`), a reserved word
(`'class'`), and a key that reduces to nothing.

**Two keys that reduce to the same identifier now throw, by name.** Quietly suffixing the second
would leave one module bound to a name no rewritten import references — undefined at runtime with
nothing to read. The message says which two keys and what to do:

```
example context keys "tosijs-3d" and "tosijs/3d" both reduce to the identifier "tosijs3d",
so an import from one of them could not be told from the other. Rename one of the context keys.
```

There is also a structural test asserting **nothing outside `code-transform.ts` sanitises a
context key**. That is the one that would have caught this: every unit test of the shared helper
passes with the divergent copy restored, because they exercise the helper rather than the call
site — which is exactly how the bug survived.

### A missing asset 404s instead of impersonating a page ([#116](https://github.com/tonioloewald/tosijs-ui/issues/116))

The dev server fell back to the SPA shell for **any** unknown path, so a missing
`waterbump.png` answered `200 text/html`. Babylon's `Texture` fetched it, failed to decode a web
page as an image, and substituted its checkerboard — a missing asset presented as a _styling
choice_, and was complimented before it was diagnosed.

Unknown **routes** still get the shell, because client-side routing depends on it. The
distinguishing signal is a dot in the last path segment: an extension was asked for, so a file
was meant. `/v1.2/guide` is still a route; `/thing.png` is not. The 404 names the path, because
a bare "File not found" sends people to the wrong layer — the reporter went through their
texture pipeline before suspecting the server.

### `staticDirs` are watched, so a replaced asset is not served stale ([#110](https://github.com/tonioloewald/tosijs-ui/issues/110))

`buildSite` copies `staticDirs` into the output on every build, but nothing watched them — so
re-exporting a GLB over `static/model.glb` left the previous copy served indefinitely, with no
error and no hint. Both files exist and only their contents differ, which is the hardest version
of stale to see, and the workaround people find is touching a source file to provoke a rebuild.

Same shape as #49, where `docPaths` was the omission. Verified end to end: a replaced static file
is now picked up in about half a second.

### A lone custom element is no longer wrapped in a paragraph ([#115](https://github.com/tonioloewald/tosijs-ui/issues/115))

Reported by tosijs-3d: a doc page whose entire content is one custom element — the case
`layout: "full-screen"` exists for — got an element that would not fill. marked classifies raw
HTML by tag name and cannot know whether an unknown tag is block or inline, so
`<my-editor></my-editor>` alone on a line came out as `<p><my-editor></my-editor></p>`. That
paragraph is auto-height, so `height: 100%` resolved against a **33px** box inside an 842px
content area.

Measured before and after on the same page: 33px, then **842 of 842** on all three engines. The
comment promising "a definite height, so a child asking for `height: 100%` gets one" is finally
true rather than aspirational.

The unwrap is deliberately narrow, since a heuristic here earns its own bugs: it fires only when
a paragraph's entire content is a single element whose tag name contains a hyphen — a custom
element, the one case marked provably cannot classify. `<p><img></p>`, `<p><em>text</em></p>`
and `<p>see <my-thing></my-thing> here</p>` are all left exactly as they are, and mutation
testing covers both directions — unwrapping everything fails three tests, unwrapping nothing
fails one.

### The inline doc tier runs at two widths now

The same gap, one level down: the doc-test runner's iframe was hardcoded to 800x600, so **every
inline `test` block had only ever run wide**. Its size is now overridable, and the Playwright
doc-test spec runs the whole tier a second time at 390x844.

An iframe is a real viewport, so this is not a simulation — verified that
`matchMedia('(max-width: 600px)')` matches inside a 390px frame and not a 1200px one, and that
the override reaches the runner (390px frame, 386 inner; 800/796 without it).

**Widths only, deliberately.** Touch cannot be emulated from inside a page: an iframe inherits
the host's input characteristics, so `(pointer: coarse)` stays false and `maxTouchPoints` stays 0
however small the frame is. `navigator.maxTouchPoints` _can_ be redefined, and doing so would be
worse than skipping it — the property would lie while the media queries told the truth, so a test
could pass against a page behaving as desktop. Touch belongs to a Playwright context
(`hasTouch`, `devices[…]`); noted in `TODO.md` as worth its own spec, since everything
touch-shaped here is currently tested only with a mouse.

## 1.12.4

### `.tjs` source files are documented again ([#108](https://github.com/tonioloewald/tosijs-ui/issues/108))

Converting a source file from `.ts` to native `.tjs` **silently deleted its documentation page**,
and its `llms.txt` entry with it. Reported from tosijs, mid-port: one page lost per converted
module.

The silence was the real defect. The build exited 0, and the internal-link check passed —
a page that was never generated is linked from nowhere, so "41 slugs, no 404s" is a _pass_. The
only signal was a slug count nothing asserts on. `'x.tjs'.endsWith('.ts')` is `false`, so the
`llms.txt` filter excluded it too, without even the mercy of an accidental match.

`.tjs` is now scraped, in both places. The doc-block syntax is identical across these languages —
a doc block is just a comment — so there is nothing language-specific to support. The list _is_
the feature, which is exactly why an omission from it is invisible.

**And a guard for the next one.** A file carrying what looks like a doc block, in an extension we
do not scrape, is now **named** in the build output rather than passed over:

```
⚠️  1 file(s) look documented but are not scraped, so they have no page:
    src/thing.vue
    Scraped extensions: .ts, .js, .tjs, .css. Add one to SCRAPED_SOURCE_EXTENSIONS if it should be documented.
```

It warns rather than fails: a file may legitimately contain the sequence without wanting to be
documentation, and a doc site that refused to build over a comment would be worse than the bug.
But whatever the next extension turns out to be, its absence can no longer happen quietly.

## 1.12.3

### Back now has layout coverage, because a reader noticed before the tests did

Reported from the keyboard as "sometimes the full-screen page and the full-screen page with the
nav open look like different history entries". Measured, it is neither history nor
inconsistent: the nav toggle creates **no** history entry (`history.length` unchanged across
repeated toggles, URL unchanged). What happens is that **Back re-asserts the page's declared
layout** and discards the override — so leaving a page with the nav open and returning finds it
closed.

That is defensible and it is what ships: a full-screen page is full-screen whenever you arrive
at it. Whether Back should instead restore what you left is now an open decision in `TODO.md`,
with the measurements attached, rather than whatever fell out of the implementation.

The gap the report exposed was in the tests, not the feature: `doc-system.pw.ts` already covered
Back for URL, title and content, but nothing checked its effect on **layout**, and every layout
test reached its pages by clicking links. Both directions are covered now — and labelled by what
they actually do, since one is a genuine regression test (dropping `removeAttribute('data-layout')`
on navigation fails it) and the other is a contract tripwire that survives every mutation tried
against it. A test that cannot fail is usually decoration; that one is deliberate, and saying so
is the difference.

### The dev server sends `Cache-Control: no-store` on everything

It previously sent no `Cache-Control` at all, and that is not neutral: a browser may invent a
freshness lifetime when you decline to state one, and Safari is the most willing to. So the dev
server would rebuild correctly while the browser kept serving the previous build — which
presents as "my fix did not work", and is only escaped by emptying the cache by hand. It cost
exactly that here: a bug was reported against code that had already been fixed.

All three of the file-server's exits are covered — injected HTML, compressed assets, and
binaries that stream untouched — because they are separate responses and adding the header to
the obvious one is precisely how the other two get missed. Each is independently
mutation-verified.

**Dev server only.** The built site in `docs/` is unaffected; it is a static site for a real
host, and telling a CDN never to store it would be actively wrong.

### `layout: "full-screen"` — and `<tosi-sidenav alwaysCompact>` underneath it

`full-width` shipped in 1.12.2 and `full-screen` did not, because it needed something from the
sidenav that did not exist. It exists now, and it is one line rather than a new layout.

**`<tosi-sidenav>` gained `navVisible`** — the one control a "show me the navigation" button
needs. Read it, flip it:

```js
sidenav.navVisible = !sidenav.navVisible
```

It resolves what hiding the nav _means_ at the current width — forcing compact on a wide screen,
simply showing the content on a narrow one — so no caller has to know, and a narrow-screen
request does not outstay itself when the window is widened. `layout: "full-screen"` uses the
same property, so the feature is general rather than something the doc-browser knows a trick
about.

**And `alwaysCompact` underneath it.** Compact mode already shows the nav _or_ the content
and takes turns between them — which is precisely what a full-screen page wants — so this just
removes the width test rather than adding a second way to lay out. It is a named state and not a
`minSize` no viewport can reach, because the second one works and reads as a bug to the next
person.

**`layout: "full-screen"`** then means: no reading measure, no nav, no gutter, and a content area
with a real height — so a demo, a canvas or an embedded app can ask for `height: 100%` and get
it. There is a [demo page](/full-screen-demo/), and the navigation button works there: it
returns you to the normal layout rather than replacing the content with a full-screen nav, and
it **stays offered** so you can go back. Riding `compact` directly, as it used to, meant the
button vanished on its own click and stranded you in the normal layout.

Two inline styles were quietly breaking the promise. `.doc-content` receives both its
`max-width` and its `padding` inline from the doc-browser, so no stylesheet could override
either — a full-screen page rendered inset by 32px, in a box that collapsed to its content
height instead of filling. `padding` now routes through `--doc-content-padding`, the way the
measure already did.

Navigating away restores the nav, and a reader's override lasts until they navigate rather than
beyond it — **including Back**, so a full-screen page is full-screen whenever you arrive at it.
That is predictable, but it does mean leaving a page with the nav open and returning finds it
closed; whether Back should instead restore what you left is noted in `TODO.md` as a decision
rather than left to whatever fell out of the implementation. Both directions are mutation-verified, which caught a test that _looked_ like it
covered the second one and did not: it routed through a prose page, which reset the state as a
side effect.

Before hydration there is no sidenav at all, just static markup, so a stylesheet rule covers the
first paint. Those rules select `.doc-nav.doc-nav` — the class deliberately repeated — because
the pre-hydration layout further down the same sheet has identical specificity, and winning on
source order works right up until someone reorders the spec.

## 1.12.2

### `haltijaDev: 'tunnel'` — let an agent drive a page running in a headset (#104)

`haltijaDev: true` is localhost-gated, and that gate is exactly what stopped the feature
working where it is worth the most. Debugging in a VR headset is close to blind: no readable
console, no devtools, no way to inspect the DOM without taking it off — and taking it off is
the thing you cannot do, because the bug is usually _about_ being in it.

Set `haltijaDev: 'tunnel'` and the channel is also served **same-origin over the tunnel**.
Redeem an edit link on the device, load the page, and it shows up in `hj windows` like any
other — `hj eval`, `hj navigate`, `hj tree` all work against it, and `hj` never learns the
page is remote.

**Why it works at all, and why it needed no change from haltija.** The page **dials out**:
`component.js` reads `window.__haltija_config__.serverUrl` and falls back to localhost only
when that config is absent. So nothing has to reach _into_ a headset — the dev server sets
the config itself, serves the component from the page's own origin, and relays the WebSocket
to the local channel. The upstream `dev.js`/`inject.js` chain is skipped entirely; both files
carry their own localhost gates and all three of their hardcoded `https://localhost:8701`
URLs would resolve on the **headset** rather than on your machine.

**A separate opt-in, deliberately.** `true` means "an agent may drive the page on this
machine". Upgrading must never silently turn that into "wherever it is reachable", so
`'tunnel'` is its own value — and `HALTIJA_DEV=1` does **not** enable it, because that
variable is a convenience toggle and this is not a convenience.

**What authorizes it:** a live dev session cookie — the same credential that gates source
writes, via the same predicate (`mayDriveWithAgent` delegates to `mayWriteSource`, and a test
asserts they agree on every input). Driving a page with an agent is at least as powerful as
writing source, so it gets no weaker a gate. What authorizes is the **listener**, never the
peer address: a reverse tunnel counterfeits "local" by construction. Unauthorized requests
get **404**, not 403 — whether a project enabled the bridge is nobody's business but the
session holder's.

Verified end to end rather than by inspection: a real browser on the tunnel origin stores the
session, receives the loader, resolves `serverUrl` to its own origin (not `localhost:8701`),
attaches the widget, opens the relayed socket, appears in `hj windows`, and answers `hj eval`
and `hj navigate`.

### Dragging works on Firefox now — every draggable, not just table columns ([#107](https://github.com/tonioloewald/tosijs-ui/issues/107))

**The first drag on a freshly-loaded page did not work in Firefox.** The thing you grabbed
stayed put and random text highlighted instead; it only started behaving once you had clicked
somewhere — anywhere — to settle Firefox's selection state. Land on a page and drag a column
edge, which is an entirely ordinary thing to do, and the first attempt failed.

This affected **every** `trackDrag` consumer — `<tosi-sizer>`, `<tosi-float>`,
`<tosi-editable-rect>` and `<tosi-table>` column resizing — and had done since the drag tracker
landed in **v0.5.1**. Measured with no prior click: `<tosi-sizer>` did not move at all, a table
column applied one 12px step and froze. All three engines now behave identically (150 → 210 →
270 on the same gesture, and nothing selected).

Two parts, because either alone does nothing. `trackDrag` calls `preventDefault()` on the
initiating mousedown, which is narrow rather than blunt — it only ever runs once a component has
already decided a drag is starting, so ordinary clicks, focus and selection are untouched. And
`<tosi-sizer>`, `<tosi-float>` and `<tosi-editable-rect>` had to stop registering their
**mousedown** listeners as `passive`, because a passive listener makes `preventDefault` a silent
no-op — which is exactly why the table (whose listener was never passive) improved first while
the others stayed dead. Nothing is lost: `passive`'s practical value is silencing the console
warning about handlers that delay scrolling, and that warning only ever applied to touch and
wheel. `touchstart` stays passive.

It is Firefox behaving badly, and that is a diagnosis rather than an excuse — the workaround is
cheap and users do not care whose bug it is.

### Page metadata: `layout: full-width`, so a route can leave the reading column ([#105](https://github.com/tonioloewald/tosijs-ui/issues/105))

Prose wants a measure — 44em is roughly what people read comfortably, and it stays the default.
But a demo, a dashboard, a wide table or a canvas is _worse_ squeezed into a column, and having
to pick one habit for the whole site is what makes people build a second site. Now a page can
opt out, the same way it sets `pin` or `order`:

```markdown
<!--{ "layout": "full-width" }-->
```

or `layout: full-width` in YAML frontmatter. **This project's own README uses it.**

Stamped into the served HTML rather than applied on load, so the first paint is already right —
a layout applied by script would show the reading column and snap wide, the flicker
pre-rendering exists to prevent. Client-side navigation keeps it in step **in both directions**;
that second direction is the one a naive implementation forgets, and it has its own test
(mutation-verified: dropping the clear-on-navigate fails it, dropping the static stamp fails
three more including first paint).

**`layout: "full-screen"` is not implemented and is rejected with a message rather than
half-honoured.** It needs a collapsed state on `<tosi-side-nav>`: after hydration the nav
carries an inline `display`, and side-nav sets its width as an inline property, so a stylesheet
cannot override either without `!important` — and hiding side-nav itself hides the content too,
since it wraps both. A value that dropped the measure while leaving the chrome exactly where it
was would be reported as a bug, correctly. Tracked in `TODO.md`.

### `<tosi-table>`: a column drag no longer dies when `columns` is reassigned under it

The other half of the reporting app's "resize funkiness", and a different defect from #102's
torn grid — this one is not a mismatch at all. `resizeColumn` captured the `ColumnOptions`
object and mutated it for the whole drag, and that object stops being the table's the instant a
caller assigns a new `columns` array. Which the app does on a page-size change, and a page-size
change is a very likely thing to happen while someone is dragging a column edge. From then on
the drag wrote widths into an orphan: pointer moving, column not moving, nothing reported.

The drag now re-resolves the column by `prop` each step — ending cleanly if it is gone, and
rebasing on the new width if the object was merely replaced. Confirmed pre-existing rather than
introduced by 1.12.1: reverting that fix leaves the drag equally dead.

### Known: column resize does not work on Firefox at all ([#107](https://github.com/tonioloewald/tosijs-ui/issues/107))

Found while investigating the above, and it is the bigger problem. On Firefox a **plain** column
drag — no reassignment anywhere near it — applies one step and freezes: +60px reaches 162 and
+120px still reads 162, against 210 then 270 on chromium and webkit. A document-level capture
listener shows Firefox stops delivering `mousemove` to the page entirely after the first event,
so no callback can run.

The cause looks to be `trackDrag` listening on a full-screen overlay while Firefox keeps
implicit mouse capture on the element that received the `mousedown`. The fix is Pointer Events
with explicit capture, and `trackDrag` is shared by every draggable affordance — so it wants
doing deliberately, with the others re-tested on Firefox at the same time, rather than as a
footnote to this release. Ruled out first: it is not the DOM being rebuilt under the drag
(deferring renders changes nothing) and not #102 (reverting that changes nothing).

### `tosijs-release-notes`: the bump gate stops blocking on dev tooling

Two fixes, both hit while cutting this release — which is the only way anyone finds them.

**A dev-tooling path with a security surface now WARNS instead of blocking a patch.** Every
path on that list is development tooling — a dev server, a tunnel, a deploy script — and none
of it runs in an end user's browser as part of an adopter's app. Halting a release over it
spends the maintainer's attention on the release with the least at stake, and a guard that
cries wolf gets overridden or deleted, taking the case it was _right_ about with it (#79, a
loosened dev-server default shipped as a patch). The warning keeps that signal and stops
charging for it. A gate that genuinely should block would have to key on code an adopter
**ships**, which none of these are.

**The blocking branch offered advice it could not honour.** It said "explain in the notes why
this does not reach anyone" — but `bumpConcerns` never sees the notes, so nothing you wrote
could satisfy it, and the only way forward was to work that out by reading the tool's own
source. Same defect this project already fixed in the tunnel's 401 page. It now says "cut a
minor", which is the only thing that ever worked.

### Security-relevant paths that changed, and why this is still a patch

`dev-auth.ts` — the module that decides who may do privileged things — changed in this
release, and a patch touching it deserves a heading rather than a footnote.

**The change is purely additive, and that is checkable rather than asserted.** The diff against
1.12.1 removes **zero lines**, and `mayWriteSource` is **byte-identical** to 1.12.1. What was
added is one new exported function, `mayDriveWithAgent`, whose entire body delegates to
`mayWriteSource` — with a test asserting the two agree on every combination of `viaTunnel`,
`hasValidSession` and peer address, so they cannot drift apart later without that test going
red.

**Nothing reaches an existing adopter.** The new predicate is consulted only by the
`/__haltija/` routes, which exist only when `haltijaDev: 'tunnel'` is set. Every existing
authorization decision — source writes, link minting, session validation — is executed by the
same bytes as in 1.12.1. If you have not opted in, the reachable behaviour of this release is
identical to 1.12.1.

**What it would mean if you do opt in:** a live dev session cookie becomes sufficient to let an
agent drive your page over the tunnel, in addition to editing source. That is a real widening
of what a session can do, which is why it is a distinct config value and not implied by
`haltijaDev: true`.

**A patch, not a minor**, despite reading like a feature: it is a new optional _value_ on an
existing config field, plus routes that exist only under it. `haltijaDev: true` behaves exactly
as before and nothing is removed or renamed, so the contract a patch carries — it does not
break you — holds.

## 1.12.1

### The Playwright lane no longer fights itself

Local workers are pinned to **6** rather than Playwright's default (~half the cores, 9 here).
Every engine had taken a turn producing a `page.goto` timeout or a `docs.json` load failure —
roughly one full run in five, always passing in isolation — because 9 browsers were hitting one
dev server. 1.11.0 fixed the client half (`fetchCorpus` retries); this reduces the contention
instead of surviving it.

Measured, not guessed: 9 workers ran the suite in 82s and 6 in 81s, so the lane is not
CPU-bound at 9 and a third of the load is free; 4 workers costs 106s and buys nothing further.
6/6 clean afterwards. Contributor-facing only — CI already runs at 1 worker.

### `<tosi-schema-form>`: all three perf guards, and they cover different things

The keystroke perf guard counts DOM lookups, and provably could not see `syncValues` — which
runs on add/remove-item, not on keystrokes. A root-scoped per-field scan reintroduced there
passed the existing test. There is now a sibling test on that path; mutation-testing takes it
from 1 lookup per add to 41 → 161 as field count grows, while the keystroke test stays green
under the same mutation.

Wall-clock is back alongside them, too. It was removed in 1.11.0 for flaking; with the lane
quiet the isolated and loaded distributions now overlap (3.20-4.57 vs 2.64-4.14 across all
three engines, against 4.0 for linear and 16 for quadratic), so a threshold of 8 separates
them. It earns its place by catching what counting cannot: an O(N) scan per field that uses no
selector at all fails it at 9.63x while both count guards pass.

### `<tosi-table>`: the header and body can no longer describe different columns (#102)

Reported from a host app that changes column visibility when the page size changes. `set
columns` updates the column list **synchronously** but defers the rebuild to the next frame,
so between the assignment and that frame anything recomputing widths — a resize drag, a scroll
handler, or the host's own page-size code — wrote a grid template for the NEW columns over the
cells the OLD ones had built.

Why that reads as _disagreement_ rather than a missing column, which is what made it confusing
to report: with fewer tracks than cells, CSS Grid auto-places the surplus into **implicit**
tracks, and implicit tracks size to content. Header text and body text differ, so the two rows
resolve them to different widths and the columns visibly step apart.

`setColumnWidths()` now describes the column set the DOM was actually built from, refreshed by
`render()` on the frame that installs those cells. A column change is therefore **deferred, not
dropped** — and because column objects are shared by reference, a resize drag still moves
widths immediately: it is the shape that is pinned to the DOM, not the widths. All three
properties have tests, and the fix is mutation-verified (reverting it fails with
`tracks: 3, headerCells: 4`).

The caller arguably should not reassign columns mid-render. It does not matter — a table that
can show a header and a body describing different columns is our defect whenever the
assignment lands.

## 1.12.0

### tosijs-ui is Apache-2.0 as of this release (MIT through 1.11.1)

**Nothing already published changes licence.** 1.11.1 and everything before it stay MIT under
the terms they shipped with — a licence grant already made cannot be withdrawn, and this is not
an attempt to. The change applies from 1.12.0 forward.

**Why.** tosijs went Apache-2.0 in its 1.8.0, and `dist/iife.js` inlines tosijs, so this package
already redistributes Apache-2.0 code and already had to carry its NOTICE. Matching the licence
of the thing we are built on removes the mismatch rather than papering over it, and it is the
right direction on its own terms: Apache-2.0 adds an explicit **patent grant** and a
patent-retaliation clause that MIT simply does not address.

**What it means for you, concretely:**

- **Using tosijs-ui in an app, or hosting what you build with it — unaffected.** No new
  obligation.
- **Redistributing it** (vendoring, forking, shipping a bundle that contains it) — §4(d) asks
  you to carry the attribution text from `NOTICE`, and §4(b) to mark files you modified.
- **GPLv2-only projects can no longer use it.** This is the one real loss and it is worth
  stating plainly rather than burying: Apache-2.0 is incompatible with GPLv2-only. GPLv3+ is
  fine. If you are on GPLv2-only, 1.11.1 remains MIT and remains available.
- **You gain a patent grant** you did not have under MIT.

The root `NOTICE` now carries our own attribution plus tosijs, marked, Feather Icons and
CodeMirror. It ships in the package (`files`), so a redistributor has it without hunting.

### Upstreams: verified against tosijs 1.8.0 and tjs-lang 0.13.4

Both are admitted by our existing peer ranges (`^1.7.8`, `^0.13.1`) — so adopters of 1.11.0 resolve to them today whether or
not we bump. All six lanes pass against both: unit (1118), Playwright ×2, haltija (60),
consumer (44 checks), typecheck, format.

The peer floors are **unchanged**. Nothing here needs anything new in either release, and the
floor encodes required fixes rather than a date. `TJS_VERSION` in
`src/live-example/code-transform.ts` moved to 0.13.4 in lockstep with the dep — it is the CDN
pin used when an adopter has no tjs-lang peer installed, and the two silently diverging would
mean testing one transpiler and shipping another. Both CDN assets verified reachable at that
version.

### Licence: a NOTICE file, because the iife redistributes Apache-2.0 code

**tosijs is Apache-2.0 as of 1.8.0** (BSD-3-Clause through 1.7.x). `dist/iife.js` inlines
tosijs and marked so a page can use the components from a single `<script>` tag, which makes
this package a redistributor, and Apache-2.0 §4(d) asks redistributors to carry the NOTICE
text of what they redistribute. There is now a `NOTICE` file at the root, shipped in the
package, reproducing tosijs's verbatim.

**This does not travel with `import 'tosijs-ui'`.** The ESM build bundles neither — tosijs and
marked are peer dependencies there, resolved from the consumer's own `node_modules`. The
obligation attaches to the iife and to anything built from it. tosijs-ui itself remains MIT.

### Known: the iife grew

`dist/iife.js` is **419.1 KB gzipped, up from 402.3 KB** — +16.8 KB (+4.2%) — entirely from
tosijs 1.8.0, whose own notes measure +2.9 kB on an app bundle that touches no new API (the
contract seam, path-segment guard and binding bookkeeping sit on the ordinary path). Ours is
larger because the iife bundles more of tosijs than a typical app does. Recorded rather than
absorbed silently: the gate on weight here has always been the printed gzip delta.

### Note for anyone on tosijs 1.7.x

tosijs 1.8.0 **deviates from semver and says so** — it removes `data-ref` and `<xin-slot>`
markup handling, reduces `<xin-blueprint>`/`<xin-loader>` to warning tombstones, and flips
`on<Event>` member precedence and type-contradicting attribute writes. A consumer on
`^1.7.9` receives all of it on a routine update. **tosijs-ui uses none of them** — verified by
grep and by the full lane run, which is why our peer range still spans both. If your own app
uses any, read tosijs's 1.8.0 notes before updating.

## 1.11.0

**Schema-driven editing.** Three new pieces that compose: `<tosi-schema-form>` renders a form
from a JSON Schema, `<tosi-crud>` puts search, list and edit over a store you supply, and
`hashState` keeps filter and selection in the URL so a filtered list with a record open is a
link you can send.

**The dev bridge is usable on a headset.** The edit-link token is now **seven characters** you
can read off one screen and type on another, instead of twenty-two of mixed-case base64url.
That change came from watching the feature fail in practice: people gave up and typed LAN IP
addresses instead, and a credential too painful to use is not protecting anything.

> **If you are on 1.10.0, this is a three-version jump.** 1.10.1 and 1.10.2 were tagged in git
> but **never published to npm** — `latest` has been 1.10.0 throughout. Nothing is lost: every
> change in those releases is in this one, and their notes are below where they always were.
> They are simply not installable, so `npm i tosijs-ui@1.10.2` will fail.

### Breaking

- **`tosijs-schema` floor is `^1.8.0`** (optional peer). 1.8.0 enforces `oneOf`,
  `exclusiveMinimum` and `exclusiveMaximum` — which is what
  [tosijs-schema#8](https://github.com/tonioloewald/tosijs-schema/issues/8), filed from this
  work, asked for — and exports `unenforcedKeywords`. The form now asks the **registered
  validator** which keywords it does not check, falling back to a local list only when a
  validator cannot answer. Against 1.7.0 a `oneOf` field carried "oneOf is not validated";
  against 1.8.0 it carries nothing and the value is genuinely checked. Verified with
  `bun bin/verify-schema-dep.ts --version=1.8.0` (17/17).

- **Validation is supplied, not imported.** `setSchemaValidator({ validate, inferSchema, unenforcedKeywords })` —
  one line, anywhere, before or after render. The CDN `<script>` build and any `tosijs-ui/site`
  doc site register it themselves, so only an ESM consumer writes it.

  The reason is worth knowing, because it is not a preference. A bare `import('tosijs-schema')`
  in shipped code is either **resolved** by your bundler — which fails the build for anyone who
  did not install it, including people using only `<tosi-table>` — or left **external**, which
  cannot resolve in a browser and kills validation for everyone. Both were measured. There is
  no third option, so the component asks for two functions instead of a package. The upside is
  that they are just functions: an Ajv wrapper, a house validator or a test stub all work.

- **`tjs-lang` moves to `^0.13.1`** (from `^0.12.0`), and `TJS_VERSION` in `code-transform.ts`
  moves in lockstep. 0.12.0 is **deprecated on npm**, and the deprecation names this release's
  own combination — _"tosijs-schema >=1.5.0 breaks the battery atoms' output validation in these
  versions. Upgrade to 0.13.1."_ Worse for adopters, `^0.12.0` does not admit 0.13.x, so anyone
  on current tjs-lang got a hard `ERESOLVE`. The tjs CodeMirror extension is still bundled
  rather than externalized — the constraint that silently no-ops highlighting if it breaks.

- **The edit-link token is 7 Crockford base32 characters**, and `linkTtlMinutes` defaults to
  **5** (was 15). A link minted by an older server is not redeemable by a newer one; both are
  in-memory and per-process, so this only matters across a restart mid-session.

### New

**`<tosi-schema-form>`** — a form from a JSON Schema. `value` is the state and `change` fires on
edit, the same contract as every other component here.

- Scalars, enums, `const`, and `format`-driven input types. Anything it cannot render is a
  labelled placeholder saying so, never a silently omitted field — a field that vanishes is
  indistinguishable from a schema that never mentioned it, which is how an editor loses data.
- **Nested objects** become `<details>` sections to any depth, with fully-qualified leaf paths
  (`address.geo.lat`), so value sync and error keying work at depth with no special cases.
  `required` is scoped to the object that declares it, which is what JSON Schema means: a
  required `city` inside an optional `address` says _if you give an address, it needs a city_.
- **Arrays** with add, remove and reorder. Each element expands against `items`; scalar items
  are a single field at the index (`tags.0`), object items expand to their properties
  (`items.0.sku`).
- **Unions** (`anyOf`/`oneOf`), each rendered as what it actually is: `[X, null]` is just an
  optional X, an all-`const` union is a `<select>`, an all-object union is a variant picker plus
  the matching branch's fields. Anything else names the shapes it saw ("a union of string |
  object"). Discriminators are derived from the property every branch pins to a different
  `const`, or declared as `x-discriminator`.
- **Format plugins** — `registerFieldPlugin(format, plugin)` claims a schema `format`. The
  plugin owns the control; the form keeps the label and the error slot. Plugins are dispatched
  first and for every node kind, so `unsupported` is the fallback, not the ceiling. Register
  whenever you like: styles are injected on registration and live forms rebuild.
- **Validation is optional.** Without a validator the form still renders and edits and simply
  reports no errors, which is a smaller failure than refusing to render.
- **No schema? It infers one** from the value, via `inferSchema`. Read it back from `.schema`,
  edit it, set it again — that round trip is the point.

**`<tosi-crud>`** — search, list, edit over a `CrudStore` adapter (`list` / `save?` / `delete?`,
promise-returning). There is **no transport in the component**: REST, a DocStore, IndexedDB, an
array in a closure and a mock all satisfy the same three methods. Omit `save` and the form is
read-only; omit `delete` and its button is not shown. `columnsFromSchema()` lets one description
of the shape drive both surfaces — strictly better than the table's own inference, which reads
`Object.keys(array[0])` and silently loses the column for a property the first row lacks. The
search term and selected id live in the URL hash, so typing **replaces** the history entry while
selecting a record **pushes** one: back leaves the record rather than un-typing your search a
letter at a time.

**`hashState({ namespace, mode })`** — key-value state in the page hash. Every key is namespaced
in the URL and bare in the API, and a write never touches a key it did not put there, so two
instances (or a hashState beside a hash router) share one URL without deleting each other. That
is the failure that made `createDocBrowser` grow a `'memory'` routing mode, so `mode: 'memory'`
is here from the start.

**Editable `<tosi-table>`** — set `editable` and cells become inputs, per-column overridable
either way; a column with its own `dataCell` is never made editable. A `schema` drives the
control type and validates edits, using the same model the form uses. A `change` event carries
`{ item, field, oldValue, newValue, error }` and commits on `change`, not `input`: an event per
keystroke would make `3` a legitimate intermediate state of typing `35`.

**Localization** — `localize(pattern, values)` fills `{name}` placeholders **after** translating,
so the key is the whole sentence (`'Add {item}'`, never `'Add ' + item`). A concatenated
sentence is untranslatable in principle: the translator sees a dangling fragment and cannot move
the placeholder to where their language puts it. An unknown placeholder stays visible as
`{name}` rather than blanked. `<tosi-schema-form>` localizes its own chrome and rebuilds on
locale change.

**The dev bridge.** `mintLinkToken()` / `normalizeLinkToken()`: Crockford base32 excludes `I`,
`L`, `O` and `U`, so the `0`/`O` and `1`/`l` mistypes that hurt most on a floating keyboard are
impossible rather than merely unlikely. `randomInt`, not `randomBytes % 32`. Redemption folds
case, accepts `I`/`L` as `1` and `O` as `0`, and ignores hyphens — normalising on **redemption**
rather than only when minting, because case-insensitivity that exists in the alphabet but not in
the comparison is a claim rather than a behaviour, and the failure it produces is a correct human
being told they typed it wrong. `--link` prints the code on its own line as well as in the URL.

The TTL is 5 minutes because the link is a **bearer token** for its lifetime — which the
`dev-auth` header comment now says plainly instead of describing the single-use rule it stopped
following in 1.10.0. About 35 bits is ample for what this actually is: an online-only guess
against a `Map` lookup, for a token redeemed seconds after minting, that mints only a write
session `mayWriteSource` still gates.

Guess-rate control: redemption runs **one at a time** and every attempt occupies at least 100ms,
so ten attempts a second against 32⁷ is ~111 years to exhaust and about 1 in 11 million inside a
five-minute window (measured — 20 concurrent attempts complete at 9.8/sec). After ten
consecutive failures the slot widens to a second. Not a lockout: the door never closes on a
human, it only gets slower to knock on. An earlier draft of this used escalating delays plus a
lockout, and replacing it was the right call — that version had two tunable constants, a counter
needing reset, and a lockout an attacker could trigger, which is a denial of service against the
developer on the one credential they need in order to work.

`tosijs-tunnel` prints the host **and where the address came from** before it acts —
`tosijs-deploy` is dry-run by default and shows its target, this one is not.

**Tooling.** `bin/verify-schema-dep.ts` runs the twelve requirements from tosijs-schema#6 plus
both directions of #7 against a candidate release and exits non-zero on any failure.
`PREVIEW_HOST` now also resolves from `~/local-secrets/tosijs-preview.env`, because the previous
advice — export it from your shell profile — is present for a human and **absent for every
tool**: non-interactive shells inherit no interactive profile, so an agent or CI step sees
nothing and reports a missing credential rather than a missing `export`. `readLocalSecret` parses
`KEY=value` only and never evaluates; a credentials file that needs a shell to read is one that
can run code. `bin/preview-host.test.ts` includes a guard that greps the committed config for a `user@host`
literal — and asserts the pattern would have caught the real one, so it cannot pass by being
wrong. `bin/smoke-consumer.ts` gained four things it could not previously see: resolution of the
new subpaths from an installed tarball, a `tsc --noEmit` over an installed consumer with
`skipLibCheck: false` and no optional peers, a bundle entry that actually imports the library,
and both vendored types pinned by assignability tests in both directions.

- **`<tosi-table>` gained `full-width-header`.** A table whose columns add up to less than its
  container left a strip of blank space on the right for no reason; with the attribute the
  leftover width goes to the last **unpinned** column. Right-pinned columns are skipped —
  they sit against the right edge by definition, so stretching one would push the space back
  into the middle. When the columns overflow, nothing changes: every column keeps its width
  and the table scrolls, because the row width is `max(sum, 100%)` and `1fr` then resolves to
  exactly the width it was given. Header and body share one `grid-template-columns`, so they
  stretch together.

### Process

- **`bun run release-check` must run AFTER the release commit, and it is the last thing before
  `git tag`.** The range is `<last tag>..HEAD`, so a bullet written _in_ the release commit is
  not in the range you checked a moment earlier — 1.11.0 shipped a commit whose body claimed
  the gate was green while it exited 1 on the state that commit created. The range is also
  exclusive of the since-commit, so tagging turns the gate green without the bullet ever being
  written: the annotation escapes in both directions. Now documented in `CLAUDE.md`.
- The `unenforced.ts` parity test is a **subset** check rather than equality. Upstream growing
  the set of keywords it enforces is good news, and an equality assertion turned that into a
  red build. Upstream _shrinking_ below our fallback is the dangerous direction — the fallback
  would claim a keyword is checked when it is not — and that is still caught.

### Fixed after the pre-release review

The nine-lens review ran **three times** against this release. Everything in this section was
found by it and fixed before tagging.

- **Editable numeric cells silently truncated what you typed.** Typing `19.95` into a
  `<tosi-table editable>` number cell committed **95**; `-4` committed **4** — and every
  commit fired `change` with `error: null`, so nothing reported that a digit had gone. Two-way
  `bindValue` wrote the model on every `input`, and `<input type=number>` sanitizes an
  intermediate `"19."` to `""` under the HTML value-sanitization algorithm, so the binding
  wrote `""` straight back into the focused input. The binding is one-way now and
  `handleCellChange` is the sole model write — which also makes "commits on `change`, not on
  `input`" true of the _model_ and not only of the event.

  It was invisible to every lane because every test assigned `.value` programmatically or
  typed with no delay, and neither ever lets a frame run between keystrokes. There are three
  tests that genuinely **type**, with a per-character delay, across all three engines.

The nine-lens review ran twice against this release. Everything below was found by it and
fixed before tagging.

- **`<tosi-crud>` destroyed unsaved edits** — one frame after any keystroke, with no user
  action, and `save()` then posted the unedited record.
- **`<tosi-crud>`'s table selection never followed the form**, so a `#?people.id=2` deep link
  opened the record with nothing highlighted — the feature these notes headline, producing a
  list that did not show where you were. **Back** also left the opened record on screen while
  the URL said otherwise, so back-then-reload showed you two different things; and a
  hash-driven selection change fired no `change` event. Saving a new record now writes its id
  to the hash, which is both correct and what makes "absent id means deselect" safe.
- **`<tosi-crud>` rebuilt the entire table on every keystroke.** Identity-guarded; measured at
  zero table renders per keystroke afterwards.
- **`<tosi-schema-form>` emitted duplicate `change` events** — a checkbox click produced
  three. `<tosi-table>` fixed the identical hazard in this release; the sibling shipped
  without it.
- **The "not validated" note skipped containers**, so `uniqueItems` on an array and `allOf` on
  an object — exactly the keywords a validator is most likely to skip — carried nothing.
- **`columnsFromSchema` re-derived property types** and got `{anyOf:[{type:'boolean'},
{type:'null'}]}` wrong, and emitted only `title` as the column name — so a title-less schema
  gave headers reading `firstName` beside a form showing "first name".
- **`<tosi-table>`'s column menu still concatenated localized words**, which the localize docs
  in this same release condemn by name. All five languages checked rendered wrong:
  `Sortieren Aufsteigend`, `숨기기 열`, `非表示 カラム`, `隐藏 列`, `Cacher Colonne`.
  `localizePhrase(key, fragments)` asks for the whole sentence and joins the fragments only
  when nobody has translated it — so an existing translation table keeps its behaviour exactly
  and adding one row upgrades it. Nothing is orphaned.
- **Six `on<Event>` members were shadowed by the element factory**, which warns about it in
  the console. Renamed to `handle<Event>` per the framework's own guidance.
- **The no-validator path had no coverage in any tier** — the default for every ESM adopter,
  while every lane ran with a validator registered. It has its own test file now. Two real
  defects were behind that gap: removing a validator left the warnings permanently
  suppressed, and a single once-flag meant whichever component spoke first silenced the rest.
- **A form with no schema and no validator rendered an empty box**, warning about validation
  when the problem was that it had nothing to render. It says so on screen now, and the
  warning names the right problem.
- **`change.detail.oldValue` was `undefined` for every cell edit after the first.** The
  baseline was deleted on each commit rather than rolled forward, and the delete ran _before_
  the equality guard — so a no-op commit wiped it, and clearing a numeric cell as the second
  edit fired no `change` at all and skipped the coercion write, leaving a schema-typed integer
  holding a raw string.
- **The documented `setSchemaValidator` recipe was wrong**, and only for the people it was
  written for. `{ validate, inferSchema }` omits `unenforcedKeywords`, so the form fell back
  to a keyword list frozen at tosijs-schema 1.7.0 and labelled every `oneOf` and
  `exclusiveMinimum` field "not validated" while 1.8.0 was checking it. Our own doc site was
  correct because the iife passed all three — so the failure was visible _only_ to the ESM
  adopters the docs instruct. Pass all three.
- **`crud.table` and `crud.form` threw before hydration** — the only two accessors on the
  class without the guard the rest have — so the documented way to reach the composed parts
  threw on the line the docs told you to write. They return `null` now. The snippet was also
  in a display-only fence, so no lane ran it; it is executable and tested. And its second line
  was wrong too: `crud.form.readOnly = true` was silently reverted on the next render.
- **`<tosi-crud>` wrote `history.replaceState` on every search keystroke.** WebKit throws past
  ~100 calls in 10s — a held key clearing a long term gets there — and the throw preceded the
  debounce, so search silently stopped working with an uncaught error. The URL write moved
  inside the debounce, where the store query already was.
- **An empty `PREVIEW_HOST` swallowed the whole resolution chain.** `??` only skips
  null/undefined, so `PREVIEW_HOST=''` — what a CI `env:` renders for a missing secret —
  counted as "set" and hid both the site config and `~/local-secrets`, the exact symptom that
  rung was added to abolish.
- **Adding or moving an array item dropped focus.** Every row is rebuilt, so the button you
  just clicked stopped existing: you could not press ↓ twice to move an item two places, or
  add two rows from the keyboard. Focus is restored by role and index, skipping controls that
  are disabled at the destination.
- **`<tosi-schema-form>` was quadratic in the keystroke path** — one root-scoped
  `querySelector` per field, twice, per keystroke. Measured on the built component: 800 fields
  cost **240 ms** per keystroke before and **0.64 ms** after. An index built with the DOM
  replaces the scans.
- **The redemption gate had 21 tests and its wiring had none.** Reverting the dev server to a
  bare `redeemLink()` call restored both the unbounded queue and the unthrottled guess rate
  while leaving every lane green — a security control held in place by nothing but the diff.
  The decision is an exported function now, like the others in that file, and is tested.
- **Notes read `root.uniqueItems is not validated`** on a field called Tags — upstream's
  `unenforcedKeywords` answers with paths. The leading `root.` is stripped and deeper segments
  kept, since for a container the keyword may be several levels down.
- **These notes themselves published the old preview-host precedence**, inverted against the
  code and against another paragraph thirty lines earlier. Corrected, with a test asserting
  all four places that state it agree — that sentence had been written three different ways.
- **A duplicate mid-file import** in `dev-auth.test.ts`, found only because nothing had ever
  type-checked the test suite. (~150 accumulated type errors remain; that is tracked, not
  fixed here.)
- **The two vendored-type anti-drift guards were never type-checked** — `tsconfig.json`
  excludes `*.test.ts`, so both were inert and one was **red**: `json-schema.test.ts` asserted
  our `JSONSchema` is assignable to theirs, which TypeScript cannot decide because both types
  recurse through `additionalProperties`. The guard now asserts the direction it CAN decide —
  theirs → ours, the assignment the code actually performs when storing an inferred schema —
  and the reverse is exercised at runtime by validating an ours-typed schema through their
  validator. `bun run typecheck-guards` (`tsconfig.guards.json`) runs in CI beside the
  existing typecheck; mutation-verified that drifting the vendored type turns it red.
- **`<tosi-table>`'s four column-menu captions** now use `localizePhrase`, so the docs and the
  docs' own worked example agree.

### Also fixed in the review passes

- `<tosi-schema-form>` let the control's native `change` escape to consumers, so a form edit
  fired a duplicate event — the `input`-only handler's `stopPropagation()` never saw a
  `change`. Three events per checkbox click became one.
- `localizePhrase` asked "did the output differ from the input?" rather than "does a row
  exist", so a locale that deliberately maps a phrase to itself fell back to joined fragments
  — the behaviour the row was added to replace. It also re-implemented annotation stripping
  with a weaker regex than the module's own, which already disagreed about `tag\#42`.
- `--tosi-spacing-50` is not a variable — the scale is `-xs/-sm/-lg/-xl` — and the `var()`
  fallback made the mistake invisible. The three genuinely-new customization points
  (`--tosi-error`, `--tosi-border`, `--tosi-border-radius`) are documented on the schema-form
  page rather than left accidental.
- `<tosi-table>`'s `fieldFor` was documented as "cached per render pass" and cached nothing,
  while allocating a schema and running the validator's keyword walker per editable cell per
  render.
- `SiteConfig.tunnel.linkTtlMinutes` said "Default 15" two lines above "Defaults to 5"; the
  summary line is what an editor tooltip shows.
- `tosijs-tunnel --link` now prints the 7-character code as well as the URL, which the docs
  already described and only the dev server's own banner did.
- The "No preview host" instructions promised a `700` credentials directory and gave a command
  that neither created nor secured it — and failed outright on a machine that did not have it.
- `src/docs/utilities.md` was a five-line stub duplicating a section `helper-libraries.md`
  already provides. Removed.
- `src/docs/migrating.md` has a **1.11.0 section** — the validator seam, the `tjs-lang` floor,
  and the edit-token change. It exists for "releases you may be upgrading past" and had no
  entry despite this release having a Breaking section.

- `<tosi-table>`'s `change` event reported `oldValue: undefined` whenever no `focus` event had
  fired on the cell — an unfocused browser window, or any consumer who sets `.value` and
  dispatches `change`, which is what an adopter's test does. The old value came from a
  `WeakMap` filled on focus, which existed because two-way `bindValue` used to overwrite the
  model as the user typed. The one-way binding shipped earlier in this release ended that, so
  the old value is now read from the model immediately before the write — no focus event
  required, and one mechanism instead of two. Caught by the haltija lane, which the other
  three lanes do not substitute for.

- `crud.save()` threw away the record it sent when the store returned nothing. A 204-style
  adapter satisfies `Promise<any>` by resolving `undefined`, which is a perfectly ordinary
  thing for a REST store to do, and the row went blank. It now keeps what it sent when the
  store has nothing to say.
- The `doc-system.pw.ts` nested-doc-system flake — the **fourth** instance this release of a
  spec racing the page's own inline doc tests. The runner is now disabled for that whole
  spec file rather than per test, because after four the fix plainly belonged at the file
  level. 6/6 clean since.

- `<tosi-doc-system>` gave up on the first failed `docs.json` fetch, so a doc site rendered
  nothing at all when one request lost — a real-user failure, not only the test flake that
  surfaced it. It now retries three times with full-jitter backoff (250ms base, 4s cap) and
  honours `Retry-After`. It retries **only 429, 5xx and network errors**: a 404 or a 403 is an
  answer, and re-asking cannot change it — which is what stops a retry turning an overloaded
  server into a self-inflicted DoS.

### Known issues

- **firefox intermittently reports `no WebAssembly compiler available`** under the full
  parallel test lane, which stops the inline-WASM example loading at all. Filed as
  [tjs-lang#36](https://github.com/tonioloewald/tjs-lang/issues/36): a `wasm {} fallback {}`
  block should take its fallback branch when the engine declines to compile, which is exactly
  what that branch is for. Affects the test lane, not shipped behaviour — the example
  degrades to not rendering rather than misreporting, and the doc-test guard against _silent_
  fallback is unaffected.

- **[#102](https://github.com/tonioloewald/tosijs-ui/issues/102)** — `<tosi-table>`'s header
  and body columns can disagree when a programmatic `columns` assignment lands while a render
  is already in flight. The reporting app changes column visibility on a page-size change,
  which is what produces the timing. The host app arguably should not reassign columns
  mid-render, but a torn header/body is ours either way. Targeted at **1.11.1**; the path
  predates 1.11.0.

### Fixed

**Packaging — this one affects existing `<tosi-table>` users.** `<tosi-table>` no longer reaches
for a schema library at all: it is the component people use _without_ one, and it must never make
anyone install something in order to build.

`tosijs-schema` was imported by
shipped `dist/` and declared in **no dependency field**, so a consumer's build failed on a
package they were never told they needed. It is now a declared optional peer at `^1.7.0` — which
is what the design note said from the start — and nothing we ship imports a type from an optional
peer any more: `import type` is erased from emitted JS but **not** from emitted `.d.ts`, and
declaring a peer optional does not help because TypeScript has no notion of an optional peer.
A second instance had been shipping for a while: `dist/code-editor-cm.d.ts` imported a type from
`tjs-lang/editors/codemirror`, a declared optional peer that TS2307s anyway (reported upstream as
tjs-lang#28). Verified from a packed tarball in a clean project: `tsc` and `vite build` both exit
0 with the peers absent.

- The `./*` subpath wildcard mapped `tosijs-ui/schema-form/fields.js` to
  `dist/schema-form/fields.js.js`, so the extension-ful spelling — what an adopter copying this
  repo's own ESM import style would write — did not resolve at all. A second `./*.js` wildcard
  fixes it, strictly additively.

**Localization was wrong in shipped data, and the keys were why.** `<tosi-table>`'s column-header
menu asked for bare words, and our own translation table shows the cost: `Right` came back in the
_correct_ sense rather than the direction in four of nine languages (sv `Rätt`, zh `正确的`, es
`Bien`, it `Giusto`), `Column` as `柱子` (a pillar), `Sort` as `种类` / `종류` (a kind of thing),
`Show` as `Espectáculo` / `Spettacolo` (the kind with a stage). Every one is a competent
translation of the word it was given — which is the point. The keys now carry sense annotations
(`Right#direction`, `Column#table`, `Sort#order`, `Show#reveal`, `Hide#conceal`, `Pin#fasten`,
`Ascending#sort-order`), and `demo/src/localized-strings.ts` has matching rows with the
wrong-sense entries corrected, verified in a browser across sv/es/zh. Annotating a key is
backward compatible, so this cannot orphan an existing table.

**`<tosi-crud>` destroyed unsaved edits.** Four specs now cover delete, its rejection path and
`createNew`→`save`; mutation testing confirms that restoring the defects turns two of them red.

`showSelected()` compared `form.value !== _selected`,
and `setByPath` is immutable, so after the first keystroke that was permanently true and every
render wrote the record as loaded back over the edit — one frame later, with no user action, and
`save()` then posted the unedited record. The fix keeps the load guard
(`_loaded !== _selected`) — one invariant, one place — and drops a form-change listener that set
`_selected = form.value`, which nothing needed: `value` and `save()` read `form.value` directly,
and `remove()` is better with the record as opened than with a half-edited copy of it. Mutation
testing settled that: the two were independently sufficient, so neither was pinned and either
could have been removed without a single test failing.

- `<tosi-crud>`'s destructive paths ran in no lane, and the gap hid two defects: `createNew()`
  followed by `remove()` sent `store.delete({})`, and the Delete button raised an unhandled
  rejection on a rejecting store.
- Grid navigation swallowed arrows, Home and End inside editable cells, so the caret could not be
  moved and focus jumped away mid-edit; on an enum `<select>` the cell could not be changed by
  keyboard at all. Escape and Tab stay with the grid.
- The cell's native `change` no longer escapes the cell. It bubbles, so a listener on the table
  received both — theirs with a `detail`, the input's with none.
- The "this keyword is not validated" note rendered **only for unions**, so the honesty it exists
  for covered exactly one keyword while the docs promised otherwise.
- `validate` is called with `strict: true`. Without it the validator samples: `maxProperties` is
  skipped entirely and a bad element deep in a long array is stepped over.
- The optional-peer degrade was silent. It now warns once naming the package and the seam, and
  `validationAvailable` lets a Save handler tell _"this conforms"_ from _"nobody checked"_.
- We read `x-discriminator` first. `discriminator` is an OpenAPI keyword that tosijs-schema's own
  `agentContract` refuses, so a schema written to pass their check spells it `x-`.
- The schema→control layer existed twice and had drifted: a `const` property was readonly in the
  form and a freely editable text box in the table.
- Variant detection scores branches on how many required keys are present, rather than demanding
  every key — a half-filled variant used to match nothing and show an empty box.
- `readOnly` hides the add/remove/reorder controls instead of disabling them.
- The array controls carry stable classes (`.schema-move-up`, `.schema-move-down`,
  `.schema-remove`) alongside their localized `title`/`aria-label`: a localized tooltip cannot
  also be a selector.
- The hash router treats `?…` in the hash as a query, not part of the path. `#/invoices/42?q=x`
  previously matched no route at all.

The intermittent Playwright failure was chased rather than re-run until green: `hash-state.pw.ts`
on WebKit, about one run in four, because the page's own inline doc test writes into the hash
asynchronously and could land after the spec cleared it. A doc page under test is also a page
running tests.

**The dev bridge's own guard was a denial of service.** Serialized redemption on an
unauthenticated path with no depth cap meant 50 junk requests delayed a legitimate link by 42
seconds, and a trickle outgrew the drain so the denial outlasted the attack. Depth is capped;
overflow is refused instantly with 503 and `Retry-After`. The clock is also read on **arrival**,
so a token valid when you clicked can no longer expire while queued.

**Preview host handling.** A project's own `preview.host` outranks
`~/local-secrets/tosijs-preview.env`; the machine-global file holds one host, and when it won,
running `tosijs-tunnel` in someone else's checkout pointed it at your box — and that bin does not
merely print a target. One `resolvePreviewHost()` now serves all three bins. The tunnel's link
line no longer claims "Single-use edit link (valid 15 min)", and `doc-site-system.md` no longer
shows `host:` in its example config. `UPSTREAM.md` claimed 0.12.0 was the latest tjs-lang; stale
by two minors.

### Housekeeping: we published a preview address, and rotated it

Our own `tosijs-site.config.ts` committed the preview host as an ssh target
(`user@address`) — an **address, not a credential**. Nothing an adopter installs is
affected, and this is not a security advisory for anyone but us. Recording it because the
practice it produced is worth adopting.

Verified rather than assumed, since "we're sure there were no keys in there" is exactly the
sort of claim that deserves checking:

- **no private key material anywhere in the repo's history** — no `BEGIN … PRIVATE KEY`
  block in any commit on any ref, and no `.pem`, `.key`, `id_rsa` or `id_ed25519` file ever
  added. `*.pem` is gitignored; the only tracked files under `tls/` are a README and the
  cert-generation script.
- access to that box always required a key that was never published, so the exposure was an
  address someone could try to connect to — not a way in.

It has been **rotated regardless**, because a value that has ever been committed to a public
repo is public: `git log -S` finds it in seconds, and rewriting history does not un-publish
anything.

The practice that came out of it, now in `tosijs-coding-practices` → `deployment.md`:
machine-local credentials live in `~/local-secrets/` — a `700` directory beside the repos,
never inside one, so committing them is structurally impossible rather than merely against
the rules. `tosijs-ui`'s bins resolve `--host=` > `PREVIEW_HOST` > `PREVIEW_SSH` > site config >
`~/local-secrets/tosijs-preview.env` — the machine-global file is **last**, so a project that
names its own host is never silently redirected at someone else's box — and a regression test
now greps our own
config for a `user@host` literal. The rule had been documented in `site-config.ts` the whole
time and violated in the same repo — which is why the guarantee is now a directory.

## 1.10.2

> **Never released.** This version was tagged but never published, and the tag has since been
> deleted. Everything below shipped in **1.11.0** instead — including the `killStrayServer`
> fix, which is why the withdrawal is safe rather than a dropped security patch. npm went
> straight from 1.10.0 to 1.11.0. Kept here because these changes are real and a reader
> tracing when something landed needs to find them. ([#101](https://github.com/tonioloewald/tosijs-ui/issues/101))

**The dev server no longer serves stale content after a rebuild.** This is the one that
presented as random flakiness across several sessions: a served `/docs.json` disagreeing with
the file on disk made the doc browser's route match fail, so live-example insertion silently
skipped — the page rendered, hydration reported success, custom elements were defined, and
**zero examples appeared, with no error anywhere**.

The cause was a cache key of `path + lastModified`, with a comment asserting that a rebuild
invalidates it naturally. It does not: `lastModified` is millisecond-granularity, and six
rapid writes to one file report the same value. A rebuild that rewrote a file inside one
millisecond kept serving the first compressed body until the process restarted — which is why
a restart "fixed" it. The cache is now emptied on every completed rebuild, and the key carries
the file size. (#50)

**`killStrayServer` no longer shoots an unrelated process.** Reclaiming the port checked that
the holder was a JS runtime (`bun`/`node`/`deno`) — but "a JS runtime" is not "our dev
server", and a colleague's dev server, a language server or a test runner would all pass. It
now requires the process to be working in **this project**, and skips with a message naming
the directory when it is not. If the working directory cannot be read it skips too: refusing
to start costs you ten seconds, shooting the wrong process costs you an afternoon. (#77)

**`bun run release-check` now checks the version against what actually changed** — it blocks a
patch that carries a `[break]` annotation or touches a security-relevant path, and warns on a
`[change]`. The nine-lens review triggers on the version _letter_, so it only ever fired when
the letter was already right; 1.9.9 was prepared, gated, tagged and pushed as a patch while
relocating a build artifact and loosening a security default, and was caught only because a
human asked for a review anyway. (#78, #79)

**Docs:** `bundleOutDir` is in the Bundle config table it belongs in, and `checkExamples` —
including `contextKeys`, which **extends** the default context rather than replacing it — is
documented where adopters actually look. (#80, #81)

## 1.10.1

> **Never released.** This version was tagged but never published, and the tag has since been
> deleted. Everything below shipped in **1.11.0** instead — including the `killStrayServer`
> fix, which is why the withdrawal is safe rather than a dropped security patch. npm went
> straight from 1.10.0 to 1.11.0. Kept here because these changes are real and a reader
> tracing when something landed needs to find them. ([#101](https://github.com/tonioloewald/tosijs-ui/issues/101))

Two fixes to 1.10.0's row grouping and scroll preservation, both reported by snowfox against
a real wide, grouped, pinned table.

**A pinned column that repeats a group value is no longer a hole.** A column that is both
`pinned` and listed in `nonRepeatingGroupedRowCells` used `visibility: hidden` on its repeated
cells — which suppresses _everything the cell paints_, including the opaque background
`.col-pinned` exists to provide. On every row but the first of its group, horizontally
scrolled cells showed through the sticky column **and were clickable there**: a visual hole
and a hit-testing hole from one rule. Repeated cells now hide their _content_ (transparent
text, `display: none` on element children, `user-select: none`) and keep painting their box.
(#83)

**`preserveScroll` now restores horizontal position too.** It restored `scrollTop` alone, and
the tables that most need it are the wide ones — normally read scrolled sideways, with pinned
columns as the identity and the interesting columns off to the right. Sorting or toggling a
group snapped back to column 0, so the row stayed put while appearing to say something
completely different. `scrollLeft` is captured independently of the row anchor, so it also
survives on a table that is scrolled sideways but still at the top — which used to return
early and lose the columns. (#86)

Group ids are memoized per render in a `WeakMap`; the map is replaced each render, so a
cached id can never outlive the values it came from.

## 1.10.0

Mostly a **silent-failure** release: several things that were quietly not working, or quietly
not being checked, now say so. If you use `tosijs-ui/site`, three of these have probably cost
you time already.

### `<tosi-table>`

**Scroll position survives a re-render.** Sorting, filtering, or toggling
`visibleGroupedRowIds` no longer throws you back to the top. The table anchors on the
**topmost visible row**, not on `scrollTop`, and restores that row to the same offset — the
distinction matters as soon as the row count changes, because the same pixel offset then
shows entirely different rows. Set `preserveScroll = false` for the case where a render means
"here is a different dataset" and starting at the top is right.

### The tunnel: links now work on a second device

A magic link is redeemable **repeatedly for 15 minutes** instead of dying on first use. The
old behaviour collided with the feature's own purpose: glance at a link and close the tab and
you need a new one; open it on a laptop then reach for your phone and it is dead — in a
workspace built for reading your uncommitted tree _on a phone_. One project had already
replaced it with a never-expiring link of their own, which is the tell.

The bound moved from _uses_ to _time_, not away. Set the level per project:

```typescript
tunnel: { linkPolicy: 'single-use', linkTtlMinutes: 2 }   // ratchet up
```

An expired link is refused under either policy — widening reuse never widens lifetime.

Every user-facing string — including the line the CLI prints at the moment you share a link
— is derived from the policy in force, rather than asserting "single-use" regardless.

### Silent failures, now loud

- **`docPaths` are watched.** A root-level doc was served and rendered but never watched:
  edit, save, refresh, stale page, no rebuild, no message — indistinguishable from a browser
  cache. (#49)
- **Two builders on one output tree are refused,** naming the holder's pid and port. Both
  wipe-then-repopulate `docs/`, so running a standalone build against a live dev server meant
  each deleted what the other was writing; it killed a dev server with no error anywhere and
  left `docs/` a fraction populated. A standalone `buildSite()` refuses; a second **dev
  server** only warns and continues, because `bun playwright test` and `bun run test-browser`
  each start their own and a hard failure there would break the lanes this protects. The lock
  is stale-safe (a dead holder's lock is debris), re-entrant, released on Ctrl-C, and fails
  open. (#51)
- **A truncated `/*#` doc block warns, by name.** Block comments cannot nest, so a `*/`
  inside a doc demo ends the doc there — previously surfacing as parse errors pointing at
  _prose_, never at the delimiter responsible. (#70)
- **Inline doc tests no longer under-report.** A page could report "done" before its examples
  had run, so their tests were omitted rather than failed — silently, with the suite green.
  **If you use `tosijs-ui/site` with async examples, your counts may have been wrong;** a
  number that goes UP after upgrading is this fix.

### Build output

**The hydration bundle now builds into your site output, not `dist/`.** It was written into
the library tree with only the `.js` copied out, stranding the sourcemap in a directory you
publish and commit but never serve — 65 MiB across 216 packed blobs in one adopter, ~35% of
that repo's packed blob store, for a file nothing could load. Set `bundleOutDir` if your
bundle is itself a published artifact. If you have that history:
`git rm --cached dist/iife.js dist/iife.js.map` and gitignore them. (#69)

### Also in this release

- **`checkExamples` accepts `{ contextKeys: [...] }`** as well as a boolean, so a library
  that documents ITSELF — whose examples import its own package name — keeps the guard on
  instead of disabling it. The keys are **added to** the `tosijs` / `tosijs-ui` defaults, not
  substituted for them. (#71)
- **`preview.tunnel.linkPolicy`** (`'window'` | `'single-use'`) and
  **`preview.tunnel.linkTtlMinutes`** (default 15) set the link security level.
- **`SiteConfig.preview.host` is optional.** The documented practice supplies it from
  `PREVIEW_HOST`, so a correct config used to fail typecheck. (#72)
- **`marked` peer is `^16.4.2 || ^17.0.0 || ^18.0.0`** — it was two majors behind `latest`, so
  a consumer on a current marked got a peer violation on a fresh install. (#60)
- **The live-example docs now state that `test()` bodies run concurrently** within a fence,
  and give the rule that follows: steps that depend on each other belong in one `test()`.
  (#43)
- **`llms.txt` carries the browser-control affordance** when a project sets `haltijaDev`, so
  an agent learns it can drive the running page instead of inferring behaviour from source.
  (#18)
- **Host bootstrap in `doc-site-system.md` now gives the actual commands** rather than
  describing the danger and leaving the dangerous step as an exercise.
- **`svg2DataUrl`: two real fixes, and one that is NOT done.** It wrote `strokeWidth` /
  `strokeLinecap` / `strokeLinejoin` — names SVG ignores — on any element carrying inline
  style, and explicit `fill` / `stroke` / `strokeWidth` arguments were clobbered by the style
  pass. Both fixed.

  **[#68](https://github.com/tonioloewald/tosijs-ui/issues/68) is NOT closed by this.** Most
  icons carry their styling on the **root** `<svg>`, which this does not touch, so a
  `stroked` icon — about 280 of ~287 — still serializes with no stroke at all and renders as
  a solid black wedge. Verified after the fix: `svg2DataUrl(icons.chevronRight())` emits no
  `stroke` and no `stroke-width`. Prefer inline `<svg>` over a data URL for stroked icons
  until this lands.

- **`acquireBuildLock` / `lockDecision`** in `build-lock.ts` — the
  output-tree lock behind the concurrent-build refusal. **Internal**: not exported from
  `tosijs-ui/site`, so do not build on it yet. Say so if you want it public.
- New **`tosijs-caddy-install`** bin — installs the Caddy snippets the deploy/tunnel bins
  need, **refuses** to install a template with placeholders left in it, keeps the outgoing
  config as `Caddyfile.bak`, and is dry-run by default. That refusal was the reason this
  existed as a private script; shipping the template without it was the wrong half to keep.
- The unit lane now covers `bin/` — `bunfig.toml`'s test root was `./src`, so tests anywhere
  else were silently never collected.

> **Versioning note.** This is a patch that adds public API. Minors are for breaking changes
> and feature rollouts; additive, non-breaking extensions ship as patches. The contract you
> rely on is unchanged: **a patch never breaks you.**

## 1.9.8

**Grouped tables can now say how much of a group is showing.** The piece missing from 1.9.7's
row grouping: a cell that reports on its group ("showing 2 of 7") or offers a **show-all**
toggle needs to compare what is rendered against what exists — and that is the one comparison
a cell renderer cannot make for itself. The filter has already run by then, so a consumer
sees the survivors with nothing to measure them against. The table sees both sides.

```js
const id = table.groupIdFor(row)
const { visible, total } = table.rowGroupCounts.get(id) ?? { visible: 0, total: 0 }
cell.textContent = visible < total ? `showing ${visible} of ${total}` : `${total} lines`

// the toggle is just a set of ids handed back to the table
expanded.has(id) ? expanded.delete(id) : expanded.add(id)
table.visibleGroupedRowIds = [...expanded]
```

- **`table.rowGroupCounts`** — a `Map` from group id to `{ visible, total }`, rendered rows
  against rows before filtering. Recomputed each render and readable while cells render.
- **`table.groupIdFor(row)`** — a row's group id, or `null` when ungrouped. This matters when
  the grouping was **inferred** from `nonRepeatingGroupedRowCells`: you never wrote that
  function, so its ids are otherwise unreproducible and the map would be keyed by strings you
  could not construct.

Groups the filter removed **entirely** stay in the map with `visible: 0`, so "nothing here
matched" stays distinguishable from "no such group" — the first being exactly when a show-all
toggle is worth offering. `rowGroupCounts` is always a `Map` (empty when ungrouped), so
`.get()` needs no null check. Pinned rows sit outside grouping and are not counted.

Additive only; ungrouped tables are unaffected.

## 1.9.7

**`<tosi-table>` can group rows.** The motivating shape is invoice lines: rows that belong
together, striped as a unit, with the values they all repeat shown once.

```js
table.rowGroupId = (row) => `${row.invoice}/${row.buyer}`
table.nonRepeatingGroupedRowCells = ['invoice', 'buyer'] // shown once per group
table.visibleGroupedRowIds = ['INV-1001/Acme'] // stays visible past the filter
```

Set `nonRepeatingGroupedRowCells` on its own and the grouping is **inferred** from exactly
those columns, so the common case is one line. Grouped rows get `table-cluster-even` /
`table-cluster-odd`, alternating **per group** — a five-line invoice is one stripe, not
five.

`visibleGroupedRowIds` keeps whole groups visible regardless of the filter, so a search
matching one line of an invoice can open the whole invoice without the filter needing to
know anything about grouping. It is additive to the filter's own result, so a filter that
ranks as well as selects keeps its ranking.

Two details worth knowing. **Clusters keep your sort**: groups appear in first-appearance
order, so a group lands wherever its best-sorted row landed. Sorting the clusters by their id
instead would have quietly thrown away the sort the user just clicked.

And repeated cells are **hidden, not emptied** — transparent text plus `display: none` on
element children, via `.tr:not(.table-cluster-first) .cluster-repeat`. Deliberately not
`visibility: hidden`, which also stops the cell painting its **background**: a pinned
column's background is the only thing masking the columns scrolling underneath it, so
repeated cells there became windows onto the scrolled content. And never `display: none` on
the cell itself — every cell is an item of the row's grid, so removing one pulls each later
cell a column left and the row renders under the wrong headers.
`table.isFirstInGroup(row)` answers the same question in JavaScript.

Group ids are **memoized per render** in a `WeakMap` — the id is computed several times for
one row in a single pass (clustering, parity, first-of-group, counts, then again per stamped
row), and the inferred form does a `JSON.stringify` each time. The map is replaced on every
render rather than kept, so a cached id can never outlive the values it came from.

Ungrouped tables are unaffected — all three properties default to off.

**The inline doc-test lane was under-reporting, and staying green about it.** If you use
`tosijs-ui/site` and have doc pages whose examples do async work, **your test counts may
have been wrong.** A test iframe reported "page done" as soon as its _first_ example
settled, so any example still awaiting a slow `js` block — a `fetch`, typically — never ran
its tests, and they were omitted rather than failed. On this repo's own table page that was
8 tests silently becoming 1, with the suite reporting "passed" either way.

Completion is now decided by which examples have `test` **source**, which is known before
anything executes, so an example that has not started yet is waited on instead of
overlooked. An example that never finishes now fails by name with an excerpt of its source.
The rule itself is exported as `unsettledExamples()` / `isSettled()` from
`src/doc-system/test-completion.ts`, pure and unit-tested — a bug whose symptom is a
_missing_ test cannot be caught by the browser lane it breaks.

Check your own counts against what your pages actually contain; a number that goes **up**
after upgrading is this bug, not a new one.

**The dev server no longer 404s while it rebuilds** — the actual cause behind the LAN
stalls in #63, traced by tosijs-3d.

`buildSite` moves the output directory aside (`mv docs docs.last-good`) and repopulates it
from empty, so for the length of every build **every served path is simply absent**. Two
failures follow:

- a request that _starts_ in that window gets a plain 404 — the page loads and never
  hydrates
- a request already _in flight_ has its file vanish underneath it, stops producing data,
  and idles until something closes it — the "loads then stalls" symptom

It only ever bit over the LAN because a loopback transfer finishes in ~22 ms and almost
never overlaps the hole, while a multi-MB transfer to a phone or a second machine is
easily still running two seconds later. It also explains why reloading never helped while
you were actively editing: every save reopened the window.

The dev server now falls back to the last-good tree for any path missing from the live
one. That copy exists for exactly the window's duration — created by the stash at the
start of a build, removed on success — so the fallback is self-scoping, and no stale
content can be served outside a rebuild.

Measured across real rebuilds: **2 failed requests before, 0 after**.

**Formatting is gated.** `bun format` was named in no gate, so drift only accumulated — 24
unformatted files at 1.9.0, 40 by now — and the cost always landed on whoever next ran it,
as three dozen unrelated files in their feature diff. New `bun run format-check`
(`prettier --check .`), run in CI. Adopters get the script; nothing about the published
package changes.

> **On versioning.** This is a patch that adds public API, which the project's own rule
> previously called a minor. The rule has changed: minors are for **breaking changes and
> feature rollouts**, while additive, non-breaking extensions ship as patches. The contract
> you rely on is unchanged and is the whole point — **a patch never breaks you.**

> The `idleTimeout` raise and asset compression in 1.9.6 both help, but neither closes this
> window — compression shortens the exposure, and `idleTimeout` only decides how long a
> stalled request waits before failing. If you are on 1.9.6 and still seeing LAN stalls,
> this is the release that fixes them.

## 1.9.6

**`<tosi-table>` sorts correctly** (#62, reported by snowfox). Two independent defects, one
in each half of the column comparator.

**Numeric strings sorted by first digit.** The comparator used a raw `>`, which compares
strings lexically — so `'9'` sorted after `'399'`, and `'1200'` before `'3.5'`. Real data
is full of numeric strings: CSV and TSV imports, BigQuery exports, JSON where numbers
arrived as text, anything id-shaped. Sorting now compares naturally:

- numeric values (including numeric strings) compare as numbers, decimals and negatives
  included
- very long integers stay exact — two 20-digit ids differing in the last digit order
  correctly, where a plain `parseFloat` comparison calls them equal
- text compares with a locale collator, so accented letters order the way the reader
  expects rather than the way ASCII does
- blank cells sort **last in both directions** — a descending sort that opens on a
  screenful of empty cells is never what was clicked for

The old comparator also never returned `0`, so two _equal_ values each claimed to be
greater than the other. `Array.sort` is entitled to turn an inconsistent comparator into
arbitrary output, not merely wrong output.

**New `ColumnOptions.sortValue`** — sort by what the cell _shows_, when that differs from
what the row stores. A column with a custom `dataCell` renders whatever it likes while the
sort keyed on `prop`, so the rows reordered by an invisible value:

```typescript
{
  name: 'Invoice #',
  prop: 'Customer invoice ID',   // what the row stores — CSV export, lookups
  dataCell: invoiceCell,          // what the reader sees
  sortValue: (row) => row['Invoice number'] || row['Customer invoice ID'],
}
```

Purely additive; `table.sort` still overrides everything for cases a per-column value
cannot express.

**New `naturalCompare` / `naturalSorter` / `isBlank`** exported from `tosijs-ui`, since the
same comparison is wanted outside tables.

### Build system

- **Code-split chunks land in `_chunks/` instead of the web root** (#64). `--splitting`
  emits one hashed chunk per dynamic import, flat beside `index.html` — for a corpus that
  pulls something large, that is thousands of files: tosijs-3d reported **2,473 hashed
  chunks among 2,604 files**, all tracked in git because `docs/` is the Pages source.

  The cost that hurts is not legibility. Any dependency bump rewrites every hash, so
  upgrading one package became a multi-thousand-file commit — which makes the standing
  "never commit `docs/` from a feature push" hazard far worse, since a stray `git add -A`
  moves thousands of files and the diff is unreviewable. Assets move to `_assets/` for the
  same reason.

- **The dev server no longer times out mid-transfer on LAN loads** (#63). `Bun.serve`
  defaults to a 10s `idleTimeout`, sized for small API responses — but a doc site's bundle
  can be multiple MB, and over wifi to a phone or a second laptop that legitimately takes
  longer, so the connection closed part-way. It never reproduces on loopback, which makes
  it look like a client-side stall. Now 120s, overridable with
  `DEV_REQUEST_TIMEOUT_SECONDS`. Testing on real devices over the LAN is exactly what the
  dev cert covers `<host>.local` for.

### Also

- **The release lane now checks, against the packed manifest, that each peer dependency we
  also develop against is pinned within the range we publish** (#57). A floor the library
  is not itself built against is a contract nobody tests, and the only signal was an
  adopter's install warning. `tosijs`'s `^1.7.8` floor is not arbitrary — it encodes
  tosijs#20 (the `parts` proxy crossing into nested components) and #21 — and that reason
  is now recorded in `CLAUDE.md` rather than only in an old changelog entry.

`makeSorter` deliberately keeps its existing comparison: switching it would change _case_
ordering (`'Zed'` before `'alice'` today) in a general-purpose utility where that has not
been reported as a problem. Coerce numeric strings in the valuator, or pass values through
`naturalCompare` yourself.

## 1.9.5

**`localize()` no longer destroys literal `#`** (#55, reported by snowfox).

`#` separates a string from a context annotation (`Okay#confirm`) and every `#` was
stripped, so any literal one was lost: `'C# Tutorial'` became `'C'`, `'Issue #42'` became
`'Issue '`, and `'#hashtag'` became `''` — an empty string, which renders as a blank label
rather than an obvious error.

An annotation is a **suffix identifier**, so only a `#` that looks like one is treated as
one — immediately preceded by a non-space, followed by letters/digits/`_`/`-`, at the end
of the string:

| string         | read as                       |
| -------------- | ----------------------------- |
| `Okay#confirm` | annotation                    |
| `C# Tutorial`  | literal — space after         |
| `Issue #42`    | literal — space before        |
| `#hashtag`     | literal — nothing before      |
| `C#`           | literal — no annotation after |

No author action and no data migration; every documented annotation form is unchanged.
Escape with `\#` for a literal that genuinely looks like an annotation (`tag\#42`).

**The worse half:** annotations were stripped from the _translated value_ too, so a
translation containing `#` was truncated **even when the source string had none** —
`'Sharp'` → `'Dièse #1'` came back as `'Dièse '`. A translator writing an ordinary string
had it silently cut, with nothing in the source to hint why. Translations are no longer
scanned for annotations at all: an annotation belongs to the lookup key, not to the text
it resolves to.

### Also

- **`brace-expansion` pinned to `>=5.0.9`** (GHSA-rgw5-rvv9-x895, HIGH, DoS-only). A
  follow-up advisory against a package already pinned at `>=5.0.8` for the previous one —
  the new advisory covers `<5.0.9`. The audit gate blocked the build on it, which is the
  case a one-time fix misses and a gate does not.

## 1.9.4

**The dev server now uses your own installed `haltija`** (#48, reported by tosijs-3d).

It spawned its own channel via `bunx haltija@^1.6.1` and ignored the project's dependency
entirely — and because **bunx caches the resolution**, a range that resolves forward never
_re_-resolves once its cache key exists. So an adopter who bumped `haltija` to `^1.11.2`
for a fix, restarted, and still didn't have the fix was running a cached 1.11.0: new
enough to look current, old enough to lack it. `hj where` reports the _spawned_ server, so
the version indicator agreed with them.

- Your `node_modules/.bin/haltija` is preferred when present. `HALTIJA_VERSION` still
  overrides everything.
- The fallback floor moves `^1.6.1` → `^1.11.2`. Its practical job is to make bunx
  re-resolve, not to express a minimum — a stale cache key was half the bug.
- **Both spawn sites now print which channel they used and where it came from** —
  `1.11.2 (this project's dependency)`, `haltija@^1.11.2 (bunx)`,
  `haltija@beta (HALTIJA_VERSION)`. The failure was never that a wrong version ran; it
  was that nothing said so.

If you were working around this with `HALTIJA_VERSION`, you can drop it.

## 1.9.3

Two adopter-reported fixes, both with the diagnosis largely done by the reporter.

### The dev server crashed instead of exiting (#47)

A long-lived `bun start` **segfaulted at the 8-hour idle timeout** rather than exiting —
so a workspace left up for a working day went offline silently, and the first sign was a
tunnel link failing. All six exit paths called `server.stop()` immediately before
`process.exit()`; that buys nothing (the OS closes the sockets) and was exactly where it
died. They now just exit.

Note for anyone hitting this elsewhere: **`try/catch` is not a mitigation** — a segfault
is not a catchable exception, so the only workaround is not calling the API. Filed
upstream as [oven-sh/bun#36788](https://github.com/oven-sh/bun/issues/36788).

### ePub volumes are now linkable (#46)

The build wrote an ePub per volume and linked to none of them, so a reader had no route
to a book that existed. The filename is _derived_ (`<project>-<volume>.epub`), so
hand-written links rot silently when a volume is renamed.

Three ways to surface them, and the ePub build now names its output through the same
helper, so a link cannot point at a name nothing wrote:

```text
<!-- epub-downloads -->        drop in any page → a link per volume
/epub-volumes.json             manifest: book, title, filename, url
listEpubVolumes()              exported from tosijs-ui/site
```

`epub.volumeTitles` renames what humans read without moving what published links point
at.

### Also

- **A valid session now trumps a stale invite link** (#45). Clicking an older link while
  already signed in — a second window, a link scrolled back to in chat, a bookmark —
  walled you with "that invite link has been used". The stale token is simply irrelevant
  to someone who already holds a session.
- **`tosijs-tunnel --close` confirms identity before signalling.** It SIGTERMed every
  `pgrep -f` match, and `pgrep -f` matches an argv _substring_ — a shell echoing the
  command or an editor holding a log path both matched. It now checks the process really
  is `ssh`, says what it signalled, and names what it skipped. It also interpolated `host`
  into a REGEX unescaped, so `me@a.b` matched `me@axb` and a host containing `+`, `(` or
  `*` changed the pattern's meaning outright.

### Internals, for anyone reading the source

- One `shutdown(code)` helper replaces the six copy-pasted exit sites. The 1.9.0 review
  had flagged that duplication as a tidiness follow-up; it turned out not to be untidy but
  to be six copies of the crash above — you cannot fix a bug once if it exists six times.
- `resolveLinkArrival()` joins `mayReadSite` / `isLockedDown` as a decision extracted from
  the dev server's request closure, where nothing could test it. Each of these was
  extracted only after shipping a bug in it.

## 1.9.2

**Accessibility: every default color pair now meets WCAG AA.** Found by running
`hj map` (haltija 1.11) over the doc site, which reports a measured contrast ratio per
node — none of these were visible as wrong to the eye.

| pair                      | was                                                | now                         |
| ------------------------- | -------------------------------------------------- | --------------------------- |
| test widget, running      | white on `#fa0` — **1.9:1**                        | `#2b1a00` on `#fa0` — 8.8:1 |
| test widget, passed       | white on `#0a0` — **3.1:1**                        | white on `#008a00` — 4.5:1  |
| `--tosi-accent` as text   | `#EE257B` — **4.05:1** on white, 4.3:1 on the page | `#d92270` — 4.6:1           |
| `--tosi-accent` as a fill | white on `#EE257B` — **4.05:1**                    | white on `#d92270` — 4.8:1  |

**The brand pink is 9% darker** (`#EE257B` → `#d92270`). It is imperceptible side by side
and it was the only value that clears AA in _both_ directions — as text on the page, and
as a fill carrying white text. Override `--tosi-accent` if you want the original.

Two more, found by sweeping wider — both in **example code we publish**, which matters
more than a component default because people copy it: the `.-negative { color: #e44 }` we
document for negative numbers in tables sat at **3.63:1** (now `#d32f2f`, 4.77:1), and
`#007AFF` — the accent in every theming example in our docs — was **4.02:1** under white
text (now `#0064d2`, 5.59:1).

Also fixed: the doc-site brand bar's text was a hand-tuned warm off-white
(`brandColor.rotate(30).brighten(0.9)` → `#fbeae9`) sitting at **4.09:1** on the brand —
under AA for the normal-size nav links in it. Every brighten value short of pure white
also misses, so it now uses `contrasting()`, which picks the readable extreme for whatever
the brand currently is and cannot drift when the brand moves. Three stale `#EE257B` /
`#007AFF` fallbacks were still live in `header.ts` and `doc-browser.ts` and now match.

Verified across 8 pages in both themes on haltija 1.11.2: **0 failures, 0 uncertain**.

**The browser-test lane now runs its own private haltija.** It used to reuse any running
instance and otherwise spawn with `-f`, which reclaims haltija's shared default port and
kills whatever held it. Both halves were wrong: adopting meant inheriting the _desktop
app's_ window, whose visibility depends on whatever else is on screen — and `hj` rightly
refuses to drive a hidden tab, since a backgrounded tab throttles `requestAnimationFrame`
and would produce plausible-but-wrong results. The lane failed roughly two runs in three
with no programmatic way out. It now takes an isolated instance on an ephemeral port:
**4/4 runs green**, and a concurrent haltija belonging to someone else survives untouched
(verified both). Closes #18 and #21.

The test widget's text color is now **paired** with its background rather than hardcoded
to white. Amber is a genuinely light color: darkening it enough for white text turns it
brown and stops reading as "in progress", so it keeps its hue and takes dark text, which
is the conventional warning-badge treatment. New `--tosi-test-text-color-{pass,fail,running}`
variables if you theme these.

In dark mode the brand color is **brightened** rather than reused: `invertLuminance` flips
the neutrals but leaves a saturated hue roughly where it was, so a pink dark enough for a
near-white page landed at 4.4:1 on a near-black one. The hue is the brand; the luminance
belongs to whatever it sits on.

## 1.9.1

**`tosijs-ui` did not import under Node.** Shipped `dist/` used extensionless relative
imports (`from './site-config'`), which bun resolves and Node ESM does not — so a Node
consumer got `Cannot find module` on entry points that had nothing to do with bun. Every
entry point is affected, and this goes back well before 1.8.0.

Everything shipped now uses explicit `.js` specifiers, which Node requires and every
bundler accepts. **If you are on Node, upgrade; 1.9.0 and earlier will not resolve.**

Two runtime requirements are unchanged, and are now documented rather than implied — they
are honest constraints, not bugs, but the failure messages named symptoms rather than
causes:

| entry point                          | runtime                                    |
| ------------------------------------ | ------------------------------------------ |
| `tosijs-ui/site`                     | **bun** — it shells out, builds and spawns |
| `tosijs-ui`, `tosijs-ui/<component>` | a **browser** or a bundler targeting one   |
| `tosijs-ui/icon-svg`                 | anything — deliberately DOM-free           |

`engines` now declares bun, and `doc-site-system.md` has a "Runtimes — what runs where"
section.

**Why four test lanes missed it:** all four run under bun. `test-consumer` packs the real
tarball, installs it and builds from a foreign cwd — but with bun, so it proved the
package works for people exactly like us. It now imports every entry point through **Node**
and asserts the absence of module-resolution errors specifically, separating "packaging is
broken" from "this needs a DOM / needs bun". Verified against the published 1.9.0: all
three checks fail on it.

## 1.9.0

Consumer repairs, remote access, and **authoring: many books from one corpus**.

**Anyone on 1.8.0 should upgrade, whether or not they want the new remote-editing
feature.** 1.8.0's `tosijs-ui/site` entry point does not import at all in a clean
install — `index.js` statically re-exports `devServer`, which imports `chokidar` at top
level, and `chokidar` was declared only in `devDependencies` (#32). 1.8.0 also shipped
5.2 MB / 16 files of doc-site hydrate bundle into every consumer's `dist/` (#31), and
broke the `tosijs-make-icons` bin (#30). All three are fixed here.

### Consumer repairs

- **`tosijs-ui/site` imports in a clean install again** (#32). `chokidar` is now an
  optional peer, imported lazily by the watch path only — a plain `buildSite()` never
  reaches for it.
- **The library package no longer carries the doc-site hydrate bundle** (#31). It built
  into `dist/hydrate/` and shipped to everyone though nothing references it; one adopter's
  package went from 0.62 MB / 398 files to **10.2 MB / 2888 files**. It now builds in a
  temp dir. Caught only by reading `npm pack` output, which is why there is now a lane
  that does exactly that (`bun run test-consumer`).
- **`tosijs-make-icons` no longer strips `fill-rule`** (#30), which rendered holes in
  compound `evenodd` paths solid — a keyboard drawn as one path came out filled. It was
  stripped in **three** places, not one. `fill-rule` is fill _topology_, not colour, and
  takes no part in the tinting the strip exists for. Ships as a bin, so it affects anyone
  generating their own icon data.
- **The shipped bins have shebangs** (#35, #36 — reported independently by both adopters).
  Without one, `node_modules/.bin` shims hand TypeScript to the shell.
- **`/version.json`'s `generator` reports tosijs-ui's version, not the consumer's** (#37).
  It read `package.json` from the _cwd_, so the one field that answers "which tosijs-ui
  built this?" named the wrong package entirely.
- **A failed "save to source" says why** (#34). The server answers 501 with an actionable
  reason and the client discarded it for a generic "Save failed.", so an unconfigured
  server was indistinguishable from a broken one and the edit appeared to vanish.
- **New: `iconSvg(name)` / `iconNames()`** (#33) — raw SVG markup with **no DOM
  required**, for build scripts, ePub passes and server-rendered templates. `defineIcons()`
  could write to the icon map but nothing could read it.

### Remote access — view and edit your dev server from anywhere

`preview.tunnel` exposes the dev server running on your machine at an authenticated public
URL over an SSH reverse tunnel, so you can read and edit real source from a phone or a
borrowed laptop. The box does no compute — it terminates TLS and routes — which is what
lets one small VPS front many projects. Two hostnames make the posture legible:

| host                             | what it is                    | gate            |
| -------------------------------- | ----------------------------- | --------------- |
| `<project>.dev.example.com`      | read-only snapshot, shareable | invite cookie   |
| `<project>.edit.dev.example.com` | live workspace, yours         | session, always |

`tosijs-tunnel --link` prints a single-use link; opening it once exchanges the token for a
durable `HttpOnly; Secure; SameSite=Lax` session cookie and redirects with the token
stripped, so it never lands in history or a `Referer`. `tosijs-deploy` publishes the static
snapshot and self-registers a Caddy fragment, so adding a project edits no shared file.

**Write authorization keys on the LISTENER, never on a peer address or a header.** Tunnel
traffic arrives on a dedicated loopback listener, and anything arriving there needs a valid
session — because a reverse tunnel counterfeits "local" by construction.

### Security

- The tunnelled workspace's **read** gate keyed on `X-Forwarded-*` rather than the
  listener, so any forwarder that omits those headers — `ssh -R` with `GatewayPorts yes`,
  `ngrok tcp`, `socat`, iptables DNAT, nginx `proxy_pass`, HAProxy without
  `option forwardfor` — read the entire uncommitted working tree unauthenticated, while
  `requireToken` promised "nothing at all, not even the page". Now keyed on the listener,
  like every other gate.
- `POST /report` was unauthenticated and reachable through the tunnel — a stranger could
  fabricate `{passed:N, failed:0}` and make the test lane **exit green on a suite that
  never ran**. Now local-only.
- Build-error text (absolute paths from your machine) was injected into every served page
  with no auth check. The label stays public; the detail needs a session.
- `rsync --delete` accepted any absolute path two segments deep — including `/usr/lib` and
  `/etc/caddy`, which it would have _mirrored_, i.e. emptied. Now an allowlist of preview
  roots, and never the root itself: one dropped path segment would otherwise have deleted
  every other project on a shared box, including the Caddy fragments that route them.
- `tunnel.requireToken` defaults to **`true`**. The hostname is not a secret — Let's
  Encrypt publishes every certificate to public CT logs — so the session gate carries the
  weight. See the docs for what the hostname discloses and what to do about it (#38).

### Fixed

- **A 403 could destroy uncommitted work.** An unauthorized read fell through to GitHub
  `main`, so you edited the _published_ file, and the save then handed you a download of
  it — applying which silently reverts your working copy.
- **`?t=` was intercepted on every request and method**, so any dev server answered
  `GET /?t=12345` with "that invite link has been used" instead of the page, and 401'd
  POSTs carrying `t`. (`t` is the classic cache-buster name.)
- **Tunnel ports are derived, not fixed** (#39). The bin fell back to a hard-coded 8788
  while the server used `PORT + 1`; they agreed only when `PORT` was 8787. `remotePort` is
  now derived per project too, so two projects on one host cannot collide. One resolver
  serves both, and `tosijs-tunnel --status` reports the ports it would use.
- **The last-good build protection moved to where the wipe is** — it lived in the dev
  server's watch branch, so `bun run build`, CI, adopters and `bun start`'s own initial
  build had none of it. A red `tsc` no longer discards a freshly generated site either.
- Two dev servers can coexist; the idle-exit timer counts requests again, not just builds;
  "Build failed" is no longer overwritten by test results seconds later.

### ⚠️ `hidden` now actually withholds

**If you have been using `draft: true` or `hidden: true` for working notes or unfinished
chapters, they were public.** `hidden` only removed a doc from the nav and the book — its
full text was still written into `docs.json`, and it still got a pre-rendered page at its
own URL. The code comment claimed "drafts don't ship"; a probe confirmed they did, twice
over.

`hidden: true` now means **not published at all**: absent from `docs.json`, from the
generated pages, from every book, and from `llms.txt`. It is filtered at _extraction_,
because the corpus is the thing that gets published and any filter applied after it is
written is too late.

It is inherited, and a child **cannot** un-hide itself from a hidden parent — accidentally
publishing one chapter of a withheld section is the failure worth preventing.

### Books

A `book` value on a doc selects which volume it binds into. Volumes are discovered from
the corpus, so a second book needs no configuration:

```text
<!--{ "book": "field-guide" }-->              → its own volume
<!--{ "book": ["default", "field-guide"] }--> → bound into both
<!--{ "book": "none" }-->                     → on the site, in no book
```

Like `hidden`, it is inherited down the `parent` chain — you mark a section, not every
leaf — with the **nearest declaration winning outright**, so a chapter can divert to
another volume, join several, or opt out. A list is what gets you shared front matter: a
glossary or licence page bound into every volume from one source file rather than copied
per book. `"none"` anywhere in a list wins, because a contradiction should resolve to
withholding. `"default"` exists as a writable name for the main volume precisely so a list
can include it — without one, an array could only ever express "not the default".

`config.book` (the manifest that curates and orders docs _within_ a volume) and a doc's
`book` metadata (_which_ volume) are different things that share a word; both are
documented.

### Release notes assemble themselves

`tosijs-release-notes` builds a CHANGELOG section from `[tag]` bullets in commit bodies,
so notes are written next to the diff rather than reconstructed from memory at the end —
which is where three false claims in the 1.9.0 notes came from. One bullet per
separately-interesting _thing_, layered on the conventional subject rather than replacing
it: a `type:` prefix can only ever represent one change, and the 1.9.0 review commit did
ten things.

    tosijs-release-notes            # assemble the section
    tosijs-release-notes --check    # gate: nothing since the last tag is unaccounted for

`--check` fails when an annotation is missing from the changelog, and separately reports
any commit whose `[fix]`/`[new]` bullets are contradicted by a **markdown-only diff** —
the shape of the worst 1.9.0 bug, where an auth-gate fix was asserted by a commit whose
diff never touched the file it named. Matching is deliberately loose: rewriting a bullet
into prose is the intent, and demanding a literal match would only train people to paste.

This section was assembled by the tool and then written up by hand, which is the intended
workflow — it generates a skeleton and a coverage gate, never the prose. The gate then
caught two things this very section had dropped, including a bug found by running the tool
over this repo's own 2026-04/05 history: a bullet used as the commit _subject_ swallowed
the entire body as continuation text, so one note came out as three paragraphs of
implementation detail.

### Also

- `tosijs-make-icons` emits clean, stable, formatter-conformant output, and honours your
  prettier config if prettier is resolvable. Generated icon data no longer churns against
  a formatter (and should still be added to `.prettierignore`).
- `resolveBook` → `resolveBooks`, returning a list. New in this release; no migration.

### Late fixes (rc.3 → rc.4)

Three review passes ran against this release. The last two found defects **introduced by
the previous pass's fixes**, which is why these are listed separately rather than folded
in silently.

**⚠️ `deploy/Caddyfile` is now a TEMPLATE — action required if you installed it.** It
shipped in every tarball carrying a real ACME email, a specific preview domain, and a
literal `__PREVIEW_TOKEN__`, while its own header told you to `scp` it to `/etc/caddy`.
Following that gave you a preview host whose entire invite gate was a string published in
a public repo, issuing certificates under someone else's Let's Encrypt account. Set
`PREVIEW_TOKEN`, `ACME_EMAIL` and `PREVIEW_DOMAIN` in `/etc/caddy/preview.env` and
re-install with `deploy:caddy`, which now substitutes all three, **refuses to install if
any placeholder survives**, and validates into a temp file before replacing the live
config rather than after.

- **Every ePub volume shipped an identical `dc:identifier`, `dc:title` and cover.**
  `unique-identifier` is EPUB3's primary key, so importing two volumes into Apple Books
  or Calibre made the second replace the first — you would silently lose a book. Volumes
  now derive their own identity; `epub.volumeTitles` names them properly.
- **An ePub volume matching no documents shipped as a success** — a typo'd book name
  produced a valid ~10KB book with a cover, a nav and no chapters, at exit 0. It now fails
  and lists the volumes that do exist. Relatedly, a corpus where _every_ doc names a
  volume no longer errors on its empty default bucket.
- **An invite link was unredeemable** on a proxied dev server with no `preview.tunnel`
  block: the lock armed off a config section that did not exist while the `?t=` reader,
  correctly gated on it, refused to look. One predicate now, exported and tested.
- **`tosijs-tunnel` ignored `PORT` and `--port`**, targeting one port while the server
  listened on another — the drift #39 was meant to end, reintroduced by the commit that
  claimed to end it.
- **The deploy and tunnel bins printed ✅ over failed remote steps.** `tosijs-deploy` now
  distinguishes _deployed_ from _routed_ and exits non-zero when the files landed but
  nothing serves them; `tosijs-tunnel` marks a public URL that is not routed.
- **Preview roots other than `/srv/preview` registered successfully and routed nothing** —
  the write side was de-hardcoded while the Caddyfile glob and index script still named
  the default. One place decides now, and a mismatch says so. Override with
  `preview.caddySitesDir`.
- **`release-check` cleared an empty range** at exactly the release boundary, because
  `git describe` returns the nearest tag including prereleases. It now baselines on the
  last stable release _this commit descends from_, so a hotfix tagged out of order or a
  maintenance branch cannot mislead it.
- **Publishing now gates on `release-check`.** It was added mid-cycle, and the first thing
  it caught was nine unrecorded annotations including a `[break]` — the `deploy/Caddyfile`
  change above, which would otherwise have shipped with no migration note at all.
- **The release gate hardened against itself.** `release-check` is now baselined on the
  last stable release this commit _descends from_ (`git describe --exclude`), so a hotfix
  tagged after a later release, or a maintenance branch, cannot mislead it — a repo-wide
  tag scan got both wrong. Its coverage matcher also stopped crying wolf: it filtered
  short words out of the annotation but not out of the changelog, so entries that were
  plainly written up got reported as missing.
- **`isLockedDown()` and `hasTunnel()` are exported** from the auth module. The predicate
  existed in three places, one of them recomputed inside its own regression test — so
  reverting the fix left the entire suite green. The test imports the real function now.
- **The browser-test lane keys on haltija's `ready` signal** (haltija ≥ 1.6.1, added in
  response to us filing it): a server that is up but has no connected tab is no longer
  adopted, because `hj navigate` then fails with "no browser reachable". That cost three
  lane runs in a day, each needing a manual `pkill`. The floor also named 1.5.5, a version
  that was never published.
- **New "Host bootstrap" docs**, because the preview host needs setting up once before
  any project can register. Both bins write fragments that `import preview_site` /
  `import tunnel_site` — snippets that only exist once the host has a Caddyfile — so an
  un-bootstrapped box failed `caddy validate` forever, for every project, silently. That
  failure now names the missing prerequisite.
- `epub.volumeTitles` is now accepted by `defineSiteConfig` — it was documented and
  type-rejected. `extractDocs`'s hidden-filtering gained tests at the tier that matters:
  real files, real entry point, verified by mutation.

### For maintainers of adopting projects

`bun run test-consumer` packs the tarball, installs it into a scratch project, and builds
from that project's cwd. Every other lane runs _in this repo, from this repo, with one dev
server_ — and four regressions shipped anyway, each living outside exactly that envelope.
More unit tests would have caught none of them; the gap was context, not depth.

### 1.9.0-rc.2 (prerelease detail)

Fixes everything both consumers hit within minutes of `rc.1`. Three were regressions
introduced by rc.1 itself.

- **The `tosijs-tunnel` / `tosijs-deploy` bins had no shebang** (#35, #36 — reported
  independently by both consumers), so `node_modules/.bin` shims handed them to the
  shell, which ran TypeScript as a shell script. Added to every shipped bin.
- **`/version.json`'s `generator` reported the CONSUMER's version** (#37). rc.1 replaced
  an import of the generated `src/version.ts` (which caused a `bun --watch` rebuild loop)
  with a read of `package.json` — but that resolves against the **cwd**, i.e. the
  adopter's repo. So the one field you consult to answer "which tosijs-ui built this?"
  answered with the wrong package entirely. Now resolved relative to the module.
- **Two dev servers could not coexist.** The tunnel listener bound a fixed port
  regardless of `PORT`, so a second server — or this repo's own Playwright lane beside a
  `bun start` — died with `EADDRINUSE`. It now defaults to `PORT + 1`, and a busy tunnel
  port warns instead of taking the whole server down: it is an optional extra, and
  refusing to start over it turns "another instance is running" into "my dev server is
  broken".
- **New lane: `bun run test-consumer`** — packs the tarball, installs it into a scratch
  project, runs every bin through the `node_modules/.bin` shims, and builds a site from
  that project's cwd. Every other lane runs _in this repo, from this repo, with one dev
  server_, and all four rc.1-era regressions lived outside that envelope. It found a real
  bug on its first run.
- **A failed "save to source" now says why** (#34). The endpoint answers 501 with an
  actionable sentence ("editableSources is not enabled…") and the client threw it away
  for a generic "Save failed.", so an unconfigured server was indistinguishable from a
  broken one and the edit appeared to vanish. The server's reason is surfaced, and every
  failure path now states that the edit is still in the editor.

### 1.9.0-rc.1 (prerelease detail)

Release candidate. Everything the nine-lens review and the first adopters raised is
addressed; no features are pending. Install with `tosijs-ui@rc`.

**Edit and view are now separate hostnames**, which makes the security posture legible
without reading config:

| host                             | what it is                           | gate            |
| -------------------------------- | ------------------------------------ | --------------- |
| `<project>.dev.example.com`      | read-only static preview — shareable | invite cookie   |
| `<project>.edit.dev.example.com` | live editable workspace — yours      | session, always |

- **`tunnel.requireToken` now defaults to `true`.** The old default (read-open) was
  justified by "an expired link should degrade to a readable page when you open a second
  window" — but a second window **shares the session cookie**, so a holder is never
  walled. The wall only appears for someone genuinely unauthenticated, which is the right
  answer for a workspace mirroring an uncommitted tree. Note the hostname is not a
  secret: Let's Encrypt publishes every certificate to public CT logs. Set `false`
  deliberately if you want a live read-only audience.
- **An edit host with no tunnel behind it explains itself** — a 503 saying the workspace
  is offline, with a link to the static preview, instead of a bare 502. It deliberately
  does _not_ fall back to serving the snapshot: you would think you were looking at live
  work when you were not.
- **A spent invite link says so.** The likely culprit is a chat-app link-preview bot,
  whose GET _is_ the first use; previously you got a silent redirect and discovered it
  when a save failed.

**Security fixes** (all found by review or adopters, none reported in the wild):

- `POST /report` was unauthenticated and reachable through the tunnel — a stranger could
  fabricate `{passed:N, failed:0}` and make the test lane **exit green on a suite that
  never ran**. Now local-only.
- Build-error text (absolute paths from your machine) was injected into every served page
  with no auth check. The label stays public; the detail needs a session.
- `rsync --delete` accepted any absolute path two segments deep — including `/usr/lib`
  and `/etc/caddy`, which it would have _mirrored_, i.e. emptied. Now an allowlist of
  preview roots, extracted and tested.

**Adopter-reported fixes** (all from tosijs-3d, all consumer-facing):

- **`tosijs-make-icons` stripped `fill-rule`** (#30), so a compound path using `evenodd`
  for holes — a keyboard drawn as one path — rendered the holes solid. `fill-rule` is
  fill _topology_, not colour, and takes no part in the tinting the strip exists for.
  It turned out to be stripped in **three** places, not one; the `stroked/` branch is the
  one that bit. This ships as a bin, so it affects anyone generating their own icon data.
- **The doc-site hydrate bundle was written into the library `dist/`** (#31) and shipped
  to every consumer, though nothing references it — one adopter's package went from
  0.62 MB / 398 files to **10.2 MB / 2888 files**, caught only by reading `npm pack`
  output. It now builds in a temp dir; tosijs-ui's own package drops 16 files and 5.2 MB
  of uncompressed payload.
- **New: `iconSvg(name)` and `iconNames()`** (#33), from `tosijs-ui/icon-svg` — raw SVG
  markup with **no DOM required**. `defineIcons()` could write to the icon map but
  nothing could read it, and `icons.foo()` returns an `SVGElement`, so a build script,
  ePub pass or server-rendered template had no way to get markup except parsing the
  package's source. Deliberately a separate module: `icons.ts` imports tosijs and throws
  on `HTMLElement` outside a browser, which is the exact context that wanted it.

**Correctness:**

- **A 403 could destroy uncommitted work.** An unauthorized read fell through to GitHub
  `main`, so you edited the _published_ file, and the save then handed you a download of
  it — applying which silently reverts your working copy. 401/403 is now its own case in
  both editors.
- **The last-good build protection moved to where the wipe is.** It lived in the dev
  server's watch branch, so `bun run build`, CI, adopters, and `bun start`'s own initial
  build had none of it. Now in `buildSite`, in a `finally` covering both a throw and a
  `return false`, with exit codes checked (the old restore could fail while still logging
  that it had succeeded).
- "Build failed" is no longer overwritten by test results seconds later.
- `?t=` is only intercepted when a tunnel is configured, and only on GET — `t` is the
  classic cache-buster name, and a 302'd POST loses its body.

### 1.9.0-beta.3 (prerelease detail)

Fixes three blockers found by the nine-lens review of beta.2, all in the remote-editing
feature, plus a rebuild loop the review did not catch because nothing automated runs
`bun start`.

- **`bun run tunnel --link` never worked.** It ran `pgrep -f 'bun bin/dev.ts'`, which does
  not match the documented start command (`bun --watch bin/dev.ts`) — so the headline flow
  was unreachable. Worse, it _did_ match `bun bin/dev.ts --build-only`, whose process exits
  before the signal handler is registered, so the default SIGUSR2 disposition **killed
  in-flight builds**. Now it asks the dev server over a loopback-only `/__devlink` endpoint:
  no process guessing, no signals, and it cannot touch a sibling project. (`/__devlink` is
  refused over the tunnel — a read-only visitor minting a write session would be privilege
  escalation.)
- **Write authorization failed OPEN.** It inferred "this is local" from the _absence_ of
  `X-Forwarded-*`, so any forwarder that doesn't set them — `ssh -R` with `GatewayPorts yes`,
  `ngrok tcp`, `socat`, iptables DNAT, nginx without `forwardfor` — delivered an off-machine
  request as `{peer: 127.0.0.1, no headers}` and got an **arbitrary repo write**, which the
  watcher rebuilds and runs. The dev server now binds a **separate loopback-only port** for
  tunnel traffic; arriving there always requires a session. Which socket you connected to is
  not something a client can forge.
- **The decision guarding that RCE had no tests**, while its own comment claimed a
  regression test that did not exist. It is now `mayWriteSource()` — pure, exported, and
  covered including a named regression case for the fail-open above.
- **The remote-access tooling now ships** as `tosijs-tunnel` and `tosijs-deploy` bins
  (tosijs-ui#27, and independently the review's ecosystem lens). Previously `SiteConfig`
  exposed `preview`/`tunnel` as typed public API while the ~390 lines of
  security-sensitive glue that implement them lived only in this repo — so every adopter
  hand-copied them and owned the drift. They resolve the consumer's site config
  (`--config=`, `TOSIJS_SITE_CONFIG`, then `./tosijs-site.config.ts` / `./site.config.ts`)
  and deliberately do **not** walk up the tree: these commands deploy and expose a
  workspace, so silently adopting a neighbour's config would publish the wrong project.
- **Fix: the tunnel probed the wrong port**, so forwarding to a dead listener failed
  silently with a 502 and a healthy-looking dev server (tosijs-ui#28). `ssh -R` can't
  catch it — the _remote_ bind succeeds, so `ExitOnForwardFailure` stays quiet; it's the
  local end that connects to nothing. It now probes the port it actually forwards to and
  **refuses to open**, naming the likely cause (including "your tosijs-ui predates the
  tunnel listener").
- **Tunnelled workspaces self-register too** (tosijs-ui#29). Static previews have
  self-registered since beta.1, but a tunnelled host still needed a block hand-added to
  the _shared_ Caddyfile — so the one remaining manual edit was the **riskier** one: a
  typo there breaks routing for every project on the box, which is exactly what the
  fragment design set out to abolish. `tosijs-tunnel` now writes its own fragment with
  the same validate-before-reload discipline, and the shared file names no hostnames at
  all.
- **`tunnel.remotePort` is allocated per project** instead of defaulting to 9787 for
  everyone (tosijs-ui#29). Two projects taking the default collided, quietly and in the
  direction that matters. The default is now derived from the project name — stable, and
  nobody has to allocate it — while an explicit `remotePort` still wins.
- **Fix: `chokidar` is no longer a hard runtime dependency of the build** (tosijs-ui#32).
  `dev-server.js` had a top-level `import { watch } from 'chokidar'`, and a consumer's
  `bin/site.ts` loads that module even in `--build` mode — so adopters hit
  `Cannot find package 'chokidar'` on a plain build. It is now imported lazily inside the
  watcher path and declared an **optional peer**, so building needs nothing extra and the
  watching dev server explains itself if it is missing.
- **Fix: `bun start` was in a rebuild loop** (measured at 899 restarts in ~40s), which made
  the documented dev command unusable. The build stamp imported the _generated_
  `src/version.ts`, putting it in `bun --watch`'s module graph while prebuild rewrote it every
  build. The import is gone, and generated files are now written **only when the content
  changes**, which makes the whole class of self-write loops impossible.

### 1.9.0-beta.2 (prerelease detail)

> Prerelease — install with `tosijs-ui@beta`. `latest` stays on 1.8.0.

**Remote editing, authenticated.** `bun run tunnel` exposes this machine's dev server at
a public URL; a single-use invite link is exchanged for a durable session cookie, and
editing through it is indistinguishable from sitting at the keyboard — same dev server,
same watcher, same files.

- **`bun run tunnel`** (`--status` / `--close` / `--link`). An SSH reverse tunnel to your
  preview box. **The box does no compute** — it terminates TLS and checks a credential —
  which is what lets one small VPS serve many projects. The work stays where the data is.
- **Magic-link auth.** Two tokens on purpose: the **link** rides in a URL so it is the
  one that leaks (history, `Referer`, proxy logs, chat-app link previews) and is
  therefore _single-use and 15 minutes_; the **session** never appears in a URL, arrives
  as an `HttpOnly` cookie, and is durable. A durable token pasted into a URL would be
  strictly worse than basic auth. `SameSite=Lax` gives the write endpoint free CSRF
  protection.
- **`tunnel.requireToken`** — default `false`: the workspace renders for anyone with the
  URL but **writes always need a session**, so a stranger gets a read-only page. Set
  `true` to require a session even to view. The default means an expired link degrades
  to a readable page rather than a wall — which is what you hit when you already hold a
  session and open a second window.
- **Security fix: source endpoints are no longer exposed to your LAN.** `Bun.serve` binds
  every interface, so on any shared network an unauthenticated `POST /__docstore/source`
  was **remote code execution** — write a repo file, the watcher rebuilds, the build runs
  it. Now: loopback, or a valid session.
- **Multi-project preview host.** Projects **self-register** — each deploy writes its own
  Caddy fragment, so adding one touches no shared config and needs no DNS change. The
  deploy validates before reloading and refuses on invalid config, so one bad fragment
  can't break routing for everyone. The root serves a **generated index** of what's
  deployed and which commit each is serving.
- **Invite links replace basic-auth dialogs** on the static preview hosts too. Knowingly
  weaker than the workspace's auth (a shared bearer secret in a cookie, not a per-client
  session) — Caddy serving static files has no session store — but equivalent to the
  basicauth it replaces, with no dialog.

### 1.9.0-beta.1 (prerelease detail)

> **Prerelease.** The preview-host system works end to end and is in daily use, but the
> plan it belongs to (`REMOTE-ACCESS-PLAN.md`) has two more phases. Published under the
> `beta` dist-tag — **install with `tosijs-ui@beta`**; `latest` stays on 1.8.0.
>
> It's a **minor**, not a patch, despite being unfinished: it adds public API
> (`SiteConfig.preview`), emits a new artifact into every adopter's output
> (`/version.json`), and changes what happens when a build fails. Semver tracks the
> shape of a change, not how done it feels.

- **New: preview hosting.** `bun run deploy` rsyncs the built site to a box you control,
  so a phone, a client, or a reviewer can see it without your dev server — or your
  laptop — being up. The whole artifact is a few MB, so this is a copy, not a pipeline.
  - **`preview: { host, path?, url? }`** in the site config. Only `host` is required;
    `path` defaults to `/srv/preview/<name>`. Flag > env > config, so a one-off push
    elsewhere doesn't need a config edit.
  - **Dry run by default.** It runs `rsync --delete` (the remote must mirror the build,
    stale pages must not linger), so the destructive form has to be typed: `--go`. It
    also refuses any target that isn't an absolute path at least two levels deep.
  - **Projects self-register.** Each deploy writes its own Caddy fragment; the server
    glob-imports them. Adding a project touches no shared config and needs no DNS
    change. The deploy **validates before reloading** and refuses to reload on invalid
    config, so one bad fragment can't take down every project on the box.
  - `deploy/Caddyfile` and `deploy/build-index.sh` are committed — server config in git
    beats server config in someone's shell history.
- **New: `/version.json`** in every build — `{ generator, site, commit, commitTime }`.
  Nothing exposed which commit produced a given site before. It matters wherever a
  deploy is a snapshot: a reviewer can otherwise report a bug you fixed this morning
  with no way to tell from the page which of you is stale.
  **Deliberately deterministic** — no build timestamp, no dirty flag — so a committed
  output dir doesn't churn on every build. Git fields are omitted (never blank) when
  git isn't available.
- **Fix: a failed rebuild no longer destroys the site.** `buildSite()` opens with
  `rm -rf <outputDir>`, so a build failing after that left nothing to serve — save a
  typo, and the next refresh was a dead site. The dev server now moves the working
  build aside first and restores it on failure, **and says so on the page**: the
  existing floating widget (which already means "the far end has something to tell
  you") shows the failure until a good build clears it, with detail in the console.
  Note it survives the "tests disabled" preference — otherwise the one person who
  turned test indicators off is the one who never learns their build is broken.
- **New: `DEV_NO_WATCH=1`** serves the built site without watching, for automated
  suites that want a server rather than a rebuilder.

## 1.8.0

> **Read this first if you use `tosijs-ui/site`.** This release adds a **dependency-audit
> gate that is ON BY DEFAULT and can fail your build** — on advisories in _your_ dependency
> tree, not ours. That is deliberate, and there are three ways out (below). Minor, not patch,
> precisely because `bun run build` can now exit 1 where it previously didn't.

- **New: dependency-audit gate** (`src/doc-system/site/audit-guard.ts`, exported from
  `tosijs-ui/site`). `bun audit` knows the registry advisory database; nothing in a normal
  build ever asked it, so a high-severity advisory in a transitive dep stayed invisible until
  someone ran it by hand. Now it's asked at the point a human is looking.
  - **Runs synchronously in every mode** — inside `buildSite` for `bun run build` / `--test`,
    and in `devServer` **just before it binds the port** (it throws, so the server never comes
    up). Sub-second in practice; a gate you wait for can't be raced. **Watch rebuilds never
    audit** — that would put a network call in your edit loop and break offline dev.
  - **What blocks:** any advisory at or above `level` (default `high`) that isn't gated.
    Consumer-facing and developer-facing advisories block **alike** — a dev-only dependency
    still runs on your machine, and the escape hatch makes over-blocking cheap.
  - **Three ways out:** `audit: { allow: [{ advisory, reason, expires }] }` to accept a risk
    **on a deadline** (an expired or malformed gate stops suppressing, so it comes back for
    review instead of living in an allowlist nobody re-reads); `audit: { mode: 'warn' }` to
    report without failing; `audit: false` or `TOSIJS_AUDIT=off` to disable.
  - **Fails open, never closed, when it can't check** — offline, registry down, `bun` too old,
    or past its 20s timeout: it warns and proceeds. It fails **closed** only on a real finding.
  - **Not downgraded in CI.** Unlike the machine-health preflight (a heuristic about someone's
    local box), an advisory is deterministic and environment-independent.
  - **Findings are grouped, sorted worst-first, and annotated** with the _nature_ of the risk
    (`LEAK/ALTER` / `DoS-only` / `DoS?+ESCALATABLE` / `UNCLASSIFIED`), parsed from the CVSS
    vector (3.x and 4.0) plus CWEs. Annotation only — it never changes what blocks, and it
    fails **closed**: ~20% of real advisories carry no CVSS vector at all, and those skew
    severe. Sub-threshold advisories are listed compactly (previously collected and never
    shown), plus an **advisories-per-package tally** — a dependency that keeps producing them
    is a code smell worth replacing rather than patching.
- **Fix (issue #24, reported by a consumer): nav `order` now sorts numerically.** Section nav
  and the generated `<!-- toc -->` built a zero-padded _string_ key and compared it lexically,
  so a fractional order silently sorted to the **end** of its section — `order: 1.5` landed
  after `2`, `3`, … because `"01.5" > "0002"` as text. "Insert a page at N.5" reads like a
  supported idiom and did the opposite with no warning. The same padding capped `order` at 4
  digits (10000+ overflowed the width) and mis-sorted negatives. `pinnedSort` is now a
  multi-key comparator (pin bucket → numeric order → title → filename), which fixes all three.
  **Removed `navSortKey`** (the string-key builder) — it was never in a public index, but was
  reachable via the `./*` subpath, so: technically breaking. A string key cannot express this
  ordering, so there is no corrected version of it.
- **`src/doc-system/nav-tree.ts` was a binary file.** The old sort key joined title and
  filename with a raw NUL byte, which makes macOS `grep` silently match **nothing** in that
  file (exit 1, no message) — so searching it for any symbol came back empty and the sort bug
  above was effectively unfindable. The comparator needs no delimiter; the NUL is gone.
  - **Adopting the gate — budget for one upgrade, not one pin.** From the first real
    adoption (`tosijs`, which went from 12 blocking advisories to zero): if the gate flags
    **`brace-expansion`**, note that `GHSA-mh99-v99m-4gvg` marks _every_ version below
    **5.0.8** affected, so the override is mandatory — and `brace-expansion@5` breaks
    **eslint 8**'s bundled `minimatch@3` with `expand is not a function`. In practice that
    means **an eslint 8 → 10 migration** (flat config + typescript-eslint 8), not a one-line
    pin. The upside is that it clears the whole `minimatch`/`js-yaml`/`flatted` cluster at
    once — which is exactly what the advisories-per-package tally is telling you when it
    fingers a stale toolchain. Expect "replace, don't patch" to be the right answer more
    often than a targeted override.
- **New: `openBrowser`** site-config option — opens the doc site on dev-server start, reusing
  an existing tab on macOS rather than piling up new ones.
- **New: `DEV_NO_WATCH=1`** serves the built site without watching. The E2E lane used to run
  `bun start`, so a file watcher stayed live for the whole suite and could `rm -rf docs/` and
  regenerate underneath a test mid-navigation — the lane flaked against its own build system,
  which presents as a product bug.
- **New public API on `tosijs-ui/site`:** `auditDependencies`, `reportAudit`,
  `resolveAuditMode`, `classifyRisk`, `groupAdvisories`, `openBrowser`, plus their types.
  `buildSite` takes an optional second argument (`{ skipAudit }`).
- **Fix: `bun run test-browser` no longer reports success on a failed build.** It computed the
  build result and launched the test run regardless, so a failing build (or a blocking
  advisory) still went green. One-shot modes now exit 1.
- **Fix: the E2E lane can register ServiceWorkers over the dev cert.** `ignoreHTTPSErrors` is a
  browser-_context_ option and never covered a ServiceWorker's own script fetch, so the
  import-resolver worker failed to register and `hydration.pw.ts` caught it as a console error.
  Chromium now launches with `--ignore-certificate-errors`.
- **Dependency pins:** `overrides` for `flatted` (`>=3.4.2`) and `brace-expansion` (`>=5.0.8`)
  clear live high-severity advisories. Added `.github/dependabot.yml` so advisories published
  later against an unchanged lockfile still surface.
- Includes the unpublished 1.7.5 (header-logo sizing) — npm goes 1.7.4 → 1.8.0.

## 1.7.5

- **Header logo size/spacing are now CSS-tunable** (follow-up to 1.7.4). The brand mark no
  longer hard-wires a pixel height inline; it carries a `.logo-mark` class driven by two
  variables — `--tosi-logo-mark-size` (default **32px**, was a fixed 40px) and
  `--tosi-logo-mark-gap` (default 10px) — for icon, `<img>`, and inline-`<svg>` logos alike.
  (Icon `<svg>`s take their height from `--tosi-icon-size`, set inline by `makeIcon()`, so the
  class points that knob at the same variable rather than fighting the inline height.) Retune a
  logo from CSS instead of editing the build.

## 1.7.4

- **Configurable header logo.** A new `logo` option lets a doc site set the brand mark shown
  left of the site title, instead of always inheriting the tosijs-ui logo. Accepts the name of a
  known icon (from `tosijs-ui`'s `icons`, e.g. `'tosiUi'`), an image URL / path / `data:` URI
  (rendered as an `<img>`), or a raw inline `<svg>…</svg>` string. Threaded through
  `SiteConfig.logo` (`tosijs-ui/site`), `createDocBrowser({ logo })`, and an embedded
  `<tosi-doc-system config='{"logo":"…"}'>`. Omit it to keep the prior behavior: the tosijs-ui
  logo when `projectLinks.tosijs` is set, otherwise no mark. Previously the header logo was
  hard-wired to the tosijs-ui mark — the one branding element `SiteConfig` couldn't override.

## 1.7.3

- **New `<tosi-pocket-bar>` component.** A "pocket buttonbar": a single translucent icon at
  rest that expands into a bar of slotted icon-button controls on hover/tap, then collapses
  again. `direction` (the full `FloatPosition` vocabulary, `auto` by default) determines both
  layout and growth direction; the handle stays put and toggles the bar; touch counts as hover.
  Built as a thin wrapper around `positionFloat`.
- **The live-example toolbar is now a pocket bar**, pinned to the top-right of the preview (so
  it never sits over the code editors in side-by-side mode). The collapsed handle carries the
  example's pass/fail color, "run tests" is a checkbox that greys when off, and the bar stays
  visible when the example is maximized.
- **Build system is fragility-tolerant.** An _unsupported import_ in a live example (a bare
  specifier the runtime can't resolve) now downgrades that block to display-only with a warning
  instead of failing the whole build; genuine syntax errors still fail the build.
- **Removed a render-skip anti-pattern** from `<tosi-segmented>`, `<tosi-color>`, and
  `<tosi-form>`. They previously depended on `render()` being _skipped_ after interaction via a
  `valueChanged` flag — fragile timing that broke under tosijs's parts changes. Renders are now
  idempotent: they skip only _provably-redundant_ writes by comparing values (colors compared
  **parsed**, so a `#rrggbb ↔ rgba()` round-trip no longer clobbers the caret/selection in the
  field being edited).
- **Code editor background is now a neutral off-white** (off-black in dark mode) instead of a
  brand-tinted color — both the default `<tosi-code>` and live examples.
- **Fix: nav flickered on refresh / reflowed on hydration.** The static no-JS nav relied on the
  browser's native `<details>` collapse (`::details-content { content-visibility: hidden }`),
  which Chromium applies lazily and non-deterministically on first paint — a closed section
  could render at full height for a frame before snapping shut. Closed sections now collapse
  synchronously via `display: none` (still opening on a no-JS `<summary>` toggle). Enforced by
  `tests/hydration.pw.ts`.
- **Moved the doc-browser test-counter widget to the bottom-left** so it no longer sits under
  the haltija dev overlay.
- **tosijs bumped to `^1.7.8`**, which fixes the `this.parts` proxy crossing into nested
  component instances (tosijs#20 — surfaced by the self-hosting doc demo, where clicking "edit"
  on one example opened the editor in the wrong one) and change-handler value staleness
  (tosijs#21).

## 1.7.2

- **Fix: doc sites are now mount-point-agnostic** (issue #25). The build baked `basePath` into
  every functional URL (nav/content links, `scriptUrl`, `stylesUrl`, favicon, `docsUrl`), so a
  build was locked to one mount — adding a custom domain to a GitHub project page flipped the
  live site to the root while `docs/` still pointed at `/repo`, 404ing every asset into a bare,
  unstyled shell with no warning. Functional URLs are now emitted **relative to each page**, so
  one build works at `/repo`, a custom-domain root, or a moved mount with no rebuild. _Metadata_
  URLs (`canonical`, `og:url`, `og:image`, `sitemap.xml`) stay absolute via `baseUrl`+`basePath`
  — so `basePath` now only affects metadata, never the page's assets. (The hydrated SPA's own
  nav/`pushState` and `__TJS_LOCAL_BASE` remain root-relative — tracked in #16.)
- **Fix: the haltija dev channel loaded once per background-test iframe.** The doc-browser's
  background test runner loads every page-with-tests in a hidden iframe, each served the injected
  dev-channel loader — so `dev.js` was imported N times into throwaway frames. The loader is now
  gated to the top window (`self===top`).
- **Live examples get a rounded, padded card.** `.preview` gains `padding` (breathing room around
  rendered content) and its first child's top margin is dropped; the inset border moves to the
  example's `:host` with a `border-radius`, so the whole example (preview + editors) reads as one
  bordered card. CodeMirror tooltips render fixed-positioned so autocomplete isn't clipped by the
  card's `overflow: hidden`.
- **Removed the "blueprint loading" doc page.** It documented tosijs's own
  `<xin-loader>`/`<xin-blueprint>` elements (no tosijs-ui component), so it belongs in tosijs's
  docs. The generic `blueprint` icon stays.

## 1.7.1

- **Fix: components looked wrong in the doc site's dark mode** (e.g. `<tosi-table>` stayed
  white). The doc-system theme drives the legacy `--background`/`--text-color` family and never
  set the `--tosi-*` component palette, so components fell back to their baked-in light defaults
  (`var(--tosi-bg, #fff)`). The doc-system now bridges `--tosi-accent`/`--tosi-bg`/`--tosi-text`/
  `--tosi-bg-inset` onto its own colors **as references**, so every `--tosi-*` component follows
  the site theme automatically — including dark mode (the referenced vars flip via
  `invertLuminance`). The data-table pinned-row example now uses `var(--tosi-table-bg)` instead of
  a hardwired `#eee`.
- **Data-table `type` example** demonstrating the new column types (currency, number, percent,
  fixed, bytes, boolean) added to the docs.

- **Fix: "edit page source" showed HTML instead of source in a dev server without
  `editableSources`.** The `/__docstore/source` endpoint was only routed when
  `editableSources` was on; otherwise the request fell through to the SPA `index.html`
  fallback and returned the rendered page at status 200 — so the client loaded HTML _as_ the
  source (and save read HTML). The endpoint is now handled unconditionally and answers a clean
  `501` when editing is disabled, so `loadSource` falls back to the GitHub raw source (read-only
  editing, matching the deployed site). Belt-and-suspenders: the client also rejects any
  `text/html` response from that endpoint (guards SPA-rewrite hosts too). Documented the option
  more fully in `doc-site-system.md`.
- **Local example save now gives feedback.** "Save changes (local)" writes a per-browser
  scratchpad (not the file) — it used to do so silently, reading as a no-op. It now posts a
  toast (`postNotification`): _"Saved to this browser only — use 'Save to source' to write the
  file."_

- **`valueRenderer(type)` + declarative `<tosi-table>` column `type`.** A new exported helper
  turns a compact type string into a reusable, locale-aware renderer with a sensible default
  alignment: `number`, `currency`/`currency(USD)`, `fixed`/`fixed(n)` (default 2),
  `percent`/`percent(n)` (of a fraction; default 0), `sci`, `eng`, `bytes`/`bytes(iec)` (SI ÷1000
  or IEC ÷1024 units, right-aligned), and `boolean`/`boolean(t)`/`boolean(t,f)` (icons via the
  `icons` proxy, centered; default `checkSquare`/`square`). Numeric cells also get a
  `-negative` / `-zero` **state class** by value sign, so you get red negatives (etc.) from one
  CSS rule — no custom cell renderer. Data-table columns take a `type`
  (`ValueRendererType`) and format + align automatically — no hand-rolled `dataCell`; an explicit
  `align`/`dataCell` still wins. Formatting follows `setLocale()`. Verified end-to-end (unit +
  browser).

- **Deprecation cleanup: `on<Event>` component callbacks → `handle<Event>`.** tosijs reserves the
  `on<Event>` prefix for elements-factory event-handler sugar and now warns when a component
  _defines_ such a property. Renamed the internal ones: `onResize` → `handleResize` (`size-break`,
  `side-nav`, `code-editor`, `babylon-3d`, `tab-selector`) and `onScrollEnd` → `handleScrollEnd`
  (`data-table`). Verified: those pages now load with zero `on<Event>` deprecation warnings.
  (`<tosi-tabs>`'s public `onCloseTab` still uses the old name — a breaking rename deferred to a
  deprecation-alias pass; and the `tosiValue()`/`tosiPath()` accessor deprecation is a separate,
  larger cleanup — both tracked.)

- **CSS canary** — an inline doc-test on the `live-theme` page that smoke-tests the whole
  styling chain in a real browser (`StyleSheet()` → the `vars` proxy → scaled-var `calc()` →
  `createTheme`/`applyTheme` → cascade → `getComputedStyle`), plus a theme color-change
  propagating to computed style, dark-mode luminance inversion, and `Color.inverseLuminance`.
  Each link is silent when it breaks (happy-dom can't resolve `var()`/the cascade), so a red
  now means a system-level CSS break, not a component quirk. Runs in the `doc-tests.pw.ts` CI
  gate.

## 1.7.0

> ### ⚠️ BREAKING CHANGE — `<tosi-code>` moved from ACE to CodeMirror 6
>
> This is a **breaking change shipping under a minor version**, deliberately. `<tosi-code>`
> (and the `<tosi-code>`-backed code panels in live examples / the doc browser) is now a
> CodeMirror 6 wrapper instead of ACE. The public contract that **survives** is unchanged:
> `value`, `mode`, the `change` event, `disabled`, and `undo`/`redo`. What is **removed**:
> the ACE-era **`theme`** and **`options`** props — there is no compatibility shim for them
> (CodeMirror's theming model is different in kind, so a shim would silently no-op). If you set
> either, migrate: dark mode is now automatic (driven by `body.darkmode`), and editor styling
> comes from the `--code-bg` / `--text-color` CSS variables. The `editor` property now exposes
> a CodeMirror `EditorView` rather than an ACE editor.
>
> **Why a minor, not 2.0.0:** the `2.0` name is reserved for the tjs-native tosijs port that
> follows tosijs 2.0; spending it on an editor swap now would missignal that larger change.
> The deviation from strict semver is intentional and called out here + in the README. **To
> defer the change, pin `tosijs-ui@1.6`.** Everything else in 1.7.0 is additive.

The headline: the editor became first-class for **tjs** and **WebAssembly**, and doc pages got
dramatically lighter — a reader loads a page with **neither the tjs transpiler nor CodeMirror on
first paint**, both arriving only when a code panel is opened to edit.

### CodeMirror 6 editor (replaces ACE)

`<tosi-code>` is a CodeMirror 6 wrapper. The heavy CM code (`code-editor-cm.ts`) is a **lazy
chunk** loaded on first edit — for ESM/bundler consumers a page with no editor bundles none of
it. (The IIFE build cannot code-split, so the CDN `<script>` path still inlines it.) Modes:
`javascript`, `typescript`, `tjs`, `ajs`, `css`, `html`, `markdown`. New: `undo()`/`redo()`/
`canUndo()`/`canRedo()`, `showDiff(on)` (diffs against a captured baseline via `tosi-diff`), and
automatic dark mode via a `highlight` compartment + a `body.darkmode` observer.

### First-class tjs + inline WebAssembly in live examples

`tjs`/`ajs` example blocks get tjs-lang's CodeMirror language + **runtime-value autocomplete**
(completion resolves the live values of an example's locals). Inline `wasm{}` examples run — the
WASM kernel actually compiles, guarded in CI so a silent fall-back to JS is caught. tjs-lang
bumped **0.9.0 → 0.12.0** across the release (memory-storm fix in 0.10.1; import-resolver in
0.11.0; VM security-review fixes in 0.12.0).

### Self-contained, transpiler-free example pages

Each `tjs` example is transpiled **at build time** and its JS baked into the page as a hidden,
non-executing `<script type="application/tosi-transpiled">`; the example runs from that bake, so
no transpiler loads for a reader. The bakes ship per-doc in `docs.json` too, so client-side
navigation gets them at zero extra first-paint cost. Editing an example drops the bake and loads
the real transpiler + editor on demand; saving keeps the transpiled JS.

### Live examples can import real npm packages (experimental)

With `importResolver` enabled, a live example can `import` any npm package — resolved through a
same-origin service worker (tjs-lang's import-resolver). Three execution modes are flaggable on
the fence: `inline` (default), `iframe` (DOM/CSS isolation), `ide` (recognized; iframe path for
now). Fence grammar is order-free: ` ```ts:ide#demo ` and ` ```ts#demo:ide ` both parse.

### Doc-system & build

Pre-rendered, hydrating doc pages (the chrome renders server-side and hydrates in place — no
opacity gate on first paint). The hydration bundle ESM-splits CodeMirror off the critical path.
Machine-safety guards for the long-lived dev server: an RSS ceiling, an 8-hour idle exit, and a
preflight that refuses to build on an already-dying machine (Bun's `Bun.build()` native leak,
oven-sh/bun#34053, is worked around by shelling out to the `bun build` CLI). A live
`<tosi-css-var-editor>` on component pages. Nested `<tosi-doc-system>` instances no longer share
state (each gets its own observable registry key).

### Peers

`tosijs` peer floor `^1.7.0` — the 1.7 line is a co-released, lockstep stack, and this is the
version tosijs-ui is built, tested, and (in the iife) bundled against; we don't verify against
older tosijs, so the declared floor matches what's actually tested. `tjs-lang` `^0.12.0` — a lazy, optional
peer (a plain component consumer never pulls it in). `@codemirror/*` are the only hard runtime
dependencies (a deliberate divergence from the zero-runtime-dep rule; they must share one
`@codemirror/state` instance).

---

_The beta changelogs below are retained for detail; 1.7.0 consolidates betas 1–5 + rc.1. Built on tosijs 1.7.0._

## 1.7.0-beta.3

**Self-contained examples, and CodeMirror + the tjs transpiler are now edit-time only.** A
reader loading a doc page — directly or via client-side navigation — runs every example with
**neither the tjs transpiler nor CodeMirror on first paint**. Both load only when you open a
code panel to edit.

Still a beta under the `beta` tag (`latest` stays 1.6.x): `npm i tosijs-ui@beta`.

### Examples run without the transpiler

Each `tjs` example is transpiled at build time and its JavaScript is baked into the page as a
hidden, non-executing `<script type="application/tosi-transpiled">`; the example runs from that
bake. Plain `js` examples need no transpiler at all (`loadTransform('js')` is now identity). The
bakes also ship per-doc in `docs.json`, so client-side navigation gets them too — at **zero
added bytes for prose/book sites** (only docs with code examples carry bakes). Editing an
example drops the stale bake and transpiles on demand; a saved local edit keeps its own
transpiled code so it reloads without the transpiler.

### CodeMirror panels build lazily

`<tosi-example>` no longer constructs its `<tosi-code>` panels up front (this delivers the
beta.2 "Remaining" note above): the panel — and the CodeMirror chunk — is built on first
`showCode`. A page with examples now ships zero CodeMirror until a reader opens a panel.

### tjs-lang 0.9.1 → 0.10.1

Bumped the transpiler, **skipping 0.10.0** (it triggered a memory storm rooted in a bun bug;
0.10.1 carries the fix). 0.10.x closed four upstream issues, letting this release **delete ~272
lines** of hand-rolled scope-scanning and a hand-declared autocomplete-config type in favor of
tjs-lang's own exports. The inline-WASM guard was updated for 0.10.x's renamed compiled export.

- `tjs-lang` peer: `^0.9.1` → `^0.10.1` (and the `TJS_VERSION` CDN-fallback pin, in lockstep).

## 1.7.0-beta.2

The code editor moved from **ACE to [CodeMirror 6](https://codemirror.net/)**, `tjs`
became a first-class editing mode with runtime-value autocomplete, the doc-site builder
gained the hooks that unblock the tosijs 2.0 TJS port — and generated doc pages are now
**readable before any JavaScript runs**.

**A beta, published under npm's `beta` tag** — `latest` stays on 1.6.x. A prerelease is not
matched by `^1.6.x` (or by `^1.7.0`), so nobody is auto-upgraded into the editor swap; you get
this only by asking for it:

```
npm i tosijs-ui@beta        # or tosijs-ui@1.7.0-beta.2
```

### Doc pages no longer wait for the bundle

Generated pages used to hide the body (`opacity: 0`, with a 4s safety-net timeout) until
hydration, because hydration injected the whole page chrome and the reflow would have been
ugly. **That gate is gone.** The chrome is pre-rendered, so the page is styled, readable and
navigable — real `<a>` links, real headings — before a byte of JS executes, and hydration is
purely additive: nothing moves.

Measured on the built site, gzipped, CPU-throttled — blank-screen duration:

| device                     | before                           | after      |
| -------------------------- | -------------------------------- | ---------- |
| cheap phone / Pi4, slow 4G | 4532ms                           | **1635ms** |
| cheap phone / Pi4, 3G      | 4837ms — _hit the 4s safety net_ | **1635ms** |

The bundle now gates **editing**, not **reading** — which was the point.

Two regressions against that promise were caught in review and fixed here: the nav was styled
by two hand-copied rule sets that had drifted (so it reflowed ~4px per row on hydration), and
the page `<title>` was derived twice (so the home page flipped from its real title to
`tosijs-ui — tosijs-ui`, [#6](https://github.com/tonioloewald/tosijs-ui/issues/6)). Both are
now single, shared rules, and `tests/hydration.pw.ts` asserts that a no-JS page and a hydrated
page agree — geometry, styling and title.

### Doc pages no longer ship CodeMirror to readers who don't open an editor

`dist/iife.js` can't code-split (bun's IIFE format), so `<tosi-code>`'s lazy `import()` is
flattened in — CodeMirror + lezer + acorn on every page whether or not it has an editor
(121KB → 388KB gzip). The generated **doc pages now load an ESM `--splitting` hydration bundle**
(`<script type="module">`) instead: the always-loaded entry is **~123KB gzip** and CodeMirror
rides a lazy chunk pulled only when an editor mounts. The tjs CM extension stays bundled, and
splitting preserves the shared single `@codemirror/state`. **`dist/iife.js` is unchanged and
still shipped for the CDN `<script>` path.** So a **pure-docs / book site with no code
examples now ships zero CodeMirror** — the case that was hurt worst.

Remaining (tracked in `TODO.md`): a page that DOES have live examples still eager-loads the
editor chunk, because `<tosi-example>` builds its code panels up front even while hidden. The
next step defers that construction until the reader opens a panel; the example still runs (the
preview and inline tests don't need the editors) — only the code view waits. **(Delivered in
1.7.0-beta.3 — see below.)**

### Dev-server safety (also in 1.6.23)

A leaking dev server took a machine down twice. The guards, all in `tosijs-ui/site`:

- **Machine-health preflight** before every build and dev-server launch: refuses to add load to
  a machine that is already dying, and names the offending PIDs, sizes, ages and project dirs.
  `preflight: 'fail' | 'warn' | false` in the site config; `DEV_SKIP_PREFLIGHT=1` to skip. Warns
  rather than refuses in CI.
- **`idleTimeoutHours` (default 8)** — ⚠️ **a behavior change**: your dev server now exits after
  8 idle hours (no request, no rebuild). A forgotten dev server is not inert — it is a days-old
  process still running the code it loaded at launch. Set `idleTimeoutHours: 0` to disable.
- **RSS ceiling** (`memoryLimitMb`, default 4096) sampled every 60s, not just after a rebuild.
- **Rebuild-loop detector** — a build that writes a file it also watches now stops, and names
  the file, instead of spawning a bundler forever.
- The example check, the ePub build, and the bundle gzip all moved into **child processes**;
  `Bun.build()` strands ~30MB of native arena per call ([oven-sh/bun#34053](https://github.com/oven-sh/bun/issues/34053), still open).
- **`killStrayServer` no longer `kill -9`s every process _connected to_ the dev port** — it used
  `lsof -ti:PORT`, which matches clients as well as the listener, so it could kill your browser.
- haltija is spawned as a **pinned range** (`haltija@^1.4.0`, override with `HALTIJA_VERSION`),
  not a floating `@latest`, and its teardown kills only its own process tree. The 1.4.0 floor
  is deliberate: it is the first haltija that routes `hj` by working directory, never overwrites
  a newer machine-wide `hj`, and exits non-zero on a failed command — so a project's dev server
  drives its own browser and can't silently downgrade another project's CLI.

### Breaking

`<tosi-code>` (ACE → CodeMirror 6). Each removed member now **warns once and no-ops**
rather than failing silently, but they are gone:

| removed                           | replacement                                        |
| --------------------------------- | -------------------------------------------------- |
| `theme` attribute                 | style the editor with `--code-bg` / `--text-color` |
| `options` property (ACE-shaped)   | configure via `editor` (a CodeMirror `EditorView`) |
| `ace` getter                      | there is no ACE global; use `editor`               |
| `editor.session.getUndoManager()` | `undo()` / `redo()` / `canUndo()` / `canRedo()`    |

**`editor` changed type in place** — it was an ACE `Editor`, it is now a CodeMirror
[`EditorView`](https://codemirror.net/docs/ref/#view.EditorView). A grep for the removed
names will not catch this, and the warn-once shims above **cannot** catch it either: the
property still exists and still returns an object; it is simply a different object. So
**`editor` now warns once on first access**, naming what moved — one line in the console
beats a `TypeError` from inside a library you have never opened. TypeScript users get a
compile error instead (1.6 typed it `any`; 1.7 types it `EditorView | undefined`).

**`change` now means the _user_ changed it.** The event is new in 1.7, and it fires only
on user edits — a programmatic `el.value = doc` (loading a document) does not fire it, and
neither does writing into a `disabled` editor. Without that, every app that populates an
editor would record a spurious save/dirty-flag on open. Programmatic sets are also not
undoable: loading a document is not an edit to Ctrl+Z back out of.

Unchanged: `value`, `original` / `showDiff()`, `mode`, `disabled`.

**tosijs floor is now `^1.6.9`.** 1.6.9 fixes the `parts` proxy so a pre-hydration access no
longer poisons it, and adds public `hydrated` / `whenHydrated` seams
([tosijs#13](https://github.com/tonioloewald/tosijs/issues/13)). Two internal hand-rolled
hydration guards (`<tosi-code>`, `<tosi-example>`) were deleted in favor of the official
`this.hydrated` — so any component that reaches into `parts` from a getter is safe against the
old "read it once and it's bricked forever" trap.

**Semver stance (deliberate, not an oversight).** This library breaks in minors before 2.0 —
**`2.0` is reserved for the tjs-native rewrite**, not for this. So `^1.6.x` resolves `1.7.0` and
existing consumers pick this up on their next install.

**If you use `<tosi-code>`, pin `~1.6` and upgrade deliberately.** Everything else in the library
is untouched, so a consumer of (say) `<tosi-rating>` can take 1.7 without changes — but note it
now installs 12 `@codemirror/*` runtime dependencies where the library previously had none.

## 1.6.23

**Dev-server safety.** Everything under "Dev-server safety" above, backported — this is the
release every `tosijs-ui/site` consumer wants, and it needs no code changes.

The one to know about: **`killStrayServer` was `kill -9`ing every process _connected to_ the
dev port, not just the listener.** `lsof -i:PORT` matches sockets whose local _or remote_ port
is `PORT`, so `bun start` could SIGKILL the browser reading your page, Playwright's browsers,
or an editor's language server. Now it signals only the listening process, only if it is a JS
runtime, SIGTERM first.

⚠️ **Behavior change:** the dev server now exits after **8 idle hours** (`idleTimeoutHours: 0`
to disable), and refuses to start on a machine that is already out of memory
(`DEV_SKIP_PREFLIGHT=1`, or `preflight: 'warn' | false`).

The trap to know about: **`editor` changed type in place** and no shim can catch it. The removed
`theme` / `options` / `ace` members warn once and no-op, but `el.editor` still exists — it is
simply a CodeMirror `EditorView` now, so `el.editor.session.*` is a runtime `TypeError`. A grep
for the removed names will not find it.

### Added

- `<tosi-code>` gained a `change` event (`event.detail.value`), `undo()` / `redo()` /
  `canUndo()` / `canRedo()`, and `tjs` / `ajs` modes.
- **Runtime-value autocomplete** in `tjs` mode: set `tjsAutocomplete` and completion
  suggests the _real members of live values_ — including tosijs proxy members that no
  static analysis can see. Live examples wire their own executed scope into it, so
  `const { app } = tosi(…)` gives real `app.` / `app.items.` completions.
- Inline **WebAssembly** live examples (tjs `wasm {}` blocks).
- `buildSite`: `libraryBuild` and `generateCssPreload` hooks, for projects whose
  library sources are native `.tjs` (this is what the tosijs 2.0 TJS port needs).
  **These actually shipped in 1.6.21** — they are listed here only because they landed on this
  branch first. Nothing needs 1.7 to use them.

### Changed

- **`dist/iife.js` is ~384KB gzipped, up from ~120KB.** Bun's IIFE format cannot
  code-split, so CodeMirror is inlined there. (Under a bundler/ESM it stays a lazy
  chunk — a page with no `<tosi-code>` doesn't load it.) This is deliberate: the
  in-page editor and its save-to-source flow are the point of the doc-system, so the
  IIFE carries the editor.
- The library now has runtime `dependencies` (12 `@codemirror/*` packages) where it
  previously had none. They can't be optional peers: the tjs CodeMirror extension must
  share this exact `@codemirror/state` instance or it silently no-ops.
- `tjs-lang` peer: `^0.8.7` → `^0.9.1`.

### Fixed

- `showDiff()` rendered nothing. Giving `<tosi-code>` its own `content` displaced the
  default `<slot>` that used to project the light-DOM diff overlay, so the overlay was
  invisible (0×0) while `showingDiff` still reported `true`. It now renders inside the
  shadow root. This is the review step of the doc-system's edit-and-save-to-source
  flow, so a blank diff meant saving changes you never saw.

## 1.6.22

### Fixed

- **The dev server no longer leaks memory on every rebuild — update as a priority if
  you use `tosijs-ui/site`.** `buildSite()` called `Bun.build()` in-process, and Bun's
  bundler never returns its native arena: RSS grows monotonically per call with no
  plateau (40 sequential builds of one entry = **+367MB**, still climbing ~5MB/build at
  the end), while the JS heap stays flat — so it is invisible to `Bun.gc()` and to any
  heap profiler. `devServer()` calls it once per rebuild in a process that runs for
  days, so it compounds: a ~2-day watch session reached **136GB RSS** and took the
  machine down with it. Filed upstream as
  [oven-sh/bun#34053](https://github.com/oven-sh/bun/issues/34053).

  The bundle now builds in a **child process** (`bun build`), whose memory the OS
  reclaims on exit — the same 15 bundles leave the parent **+0.5MB** instead of +192MB.
  `buildEpub()` moved to a child too (happy-dom + `@resvg/resvg-js` are both native and
  retaining, and it runs on every rebuild), with a 120s timeout kill so a hung or failed
  ePub warns instead of wedging the rebuild. Measured on this repo's own dev server:
  **baseline RSS 503MB → 150MB, and per-rebuild growth 26–59MB → ~2.7MB.**

  Bundle output is byte-for-byte identical; this is purely where the work runs.

### Added

- **Dev-server memory watchdog.** `devServer()` now samples RSS after each rebuild and,
  past a ceiling (`memoryLimitMb` in the site config, or `DEV_MEMORY_LIMIT_MB`; default
  4096), prints the growth-per-rebuild and exits rather than let a leak thrash the
  machine. It distinguishes real growth (a leak — report it) from a build whose baseline
  simply exceeds the ceiling (raise the ceiling).

## 1.6.21

### Fixed

- Doc-system nav-toggle in `routing: 'memory'` mode drove the _outer_ doc-browser
  instance instead of its own (now scoped per-instance).

### Added

- `buildSite` `libraryBuild` + `generateCssPreload` hooks (also in 1.7.0 above), so a
  project whose library source is native `.tjs` can build through the doc-site pipeline.

### Changed

- `tjs-lang` peer: `^0.8.7` → `^0.9.0`.

## 1.6.20

### Fixed

- **`import 'tosijs-ui'` no longer resolves to the IIFE under browser bundlers.**
  The `"."` export had a `"browser"` condition pointing at `dist/iife.js` — the
  self-contained CDN/doc-site bundle that inlines tosijs + marked. Browser-targeted
  bundlers (Vite, webpack, esbuild) picked it, so consumers **double-bundled tosijs**
  instead of externalizing the peer, and named imports broke (the IIFE isn't an ESM
  module). Removed the condition: every `import` now resolves to `dist/index.js`
  (ESM, peers externalized). The IIFE stays for CDN `<script>` use and the naive
  doc site — referenced by file path, never via `import 'tosijs-ui'`.

### Changed

- **tosijs peer + dev dependency bumped to `^1.6.6`** — picks up a subtle
  component-lifecycle fix.

## 1.6.19

Doc-system tooling; no component API changes.

### Added

- **Build-time example transpile check.** Every executable live-example block
  (`js` / `tjs` / `ts` / `test`) across the whole corpus is run through the front
  half of the runtime pipeline — `rewriteImports` → transform → `new
AsyncFunction` — at build time, **without executing it**, so a block that can't
  build (a syntax/import error, or illustrative code mistakenly tagged with an
  executable language instead of the display-only `typescript`) **fails the build**
  with the offending doc/block named, on every page — including fences hidden in
  blockquotes and lists. TypeScript is transpiled with bun's own transpiler
  (network-free). Opt out with `checkExamples: false`.
- **"One Source, Every Artifact"** doc page — how one corpus of doc-comments +
  markdown projects into a static SEO site, a self-testing live playground with
  in-browser TypeScript, an ePub/PDF, and an agent-debuggable page. Embeds a live
  `<tosi-doc-system>` (the whole system running inside its own page).

### Fixed

- **A live example's build/exec failure is now a test failure whether or not it
  defines `test` blocks.** So on any page the browser test runner loads, _all_ of
  its examples are checked for explosions — a no-test example that throws is
  reported as a failed test — not just blocks with explicit assertions.

## 1.6.18

Doc-site tooling; no component API changes.

### Added

- **`haltijaDev` — give a coding agent eyes + hands on your running dev page.**
  Set `haltijaDev: true` (or `HALTIJA_DEV=1`) and `bun start` injects a tiny
  localhost-gated loader into served HTML — a runtime `import()` of a local
  [haltija](https://github.com/tonioloewald/haltija) channel's `dev.js` — and
  spins up (or reuses) a server-only channel (no Electron app) in `--both` mode:
  HTTP 8700 for the `hj` CLI, HTTPS 8701 for the injected widget (so an HTTPS page
  has no mixed-content). An agent can then read the live DOM, click/type, run JS,
  and **screen-capture** the rendered page (`hj screenshot`, via `getDisplayMedia`
  — click the 🖥 widget button once to grant the share). Because the loader is
  pulled from the local server at runtime it is **never bundled** (zero build
  bytes) and self-disables off-localhost, and because it's injected at serve time
  it never touches the built output. Certs are mkcert-signed (already required for
  the dev server's HTTPS), so no browser warning. Local dev only; off by default.
  The channel tracks haltija's `@beta` dist-tag (where the WebRTC capture lives).

## 1.6.17

### Fixed

- **`@resvg/resvg-js` is now an optional peer dependency** (it was only a dev
  dependency). It rasterizes the generated ePub cover and belongs to the same
  doc-site pipeline as `happy-dom`, which was already an optional peer — so an
  adopter building ePubs via `tosijs-ui/site` got `happy-dom` surfaced by their
  package manager but not `resvg`, and their book's cover silently failed to
  generate. Both are still lazy-loaded with a graceful warning when absent.

## 1.6.16

Doc-system: prose/book adoption. Component APIs are unchanged; everything here is
doc-site tooling (the `tosijs-ui/site` build system + live examples).

### Added

- **Book manifest — curate/reorder the book without touching site nav.** A new
  `book` field on the site config (`BookManifest`) selects and sequences the ePub
  (and, later, print) as a subset of the corpus while the live site still shows
  everything — one source, two outputs. `include`/`exclude` globs pick docs,
  `order: [...]` names the lead sequence (front/back matter are just docs you
  name), and `sort: 'filename'` gives a folder of chapters natural order with no
  metadata. It adds no new ordering mechanism — it overlays each doc's `order` so
  the existing nav sort sequences the book (pins/parents still apply). Zero-config
  is unchanged: the book is the whole visible corpus. Identity (title/author/
  cover) still comes from `epub`.
- **Prose Markdown (Batch A), activated only by its own syntax** so code docs are
  byte-identical: **YAML frontmatter** (`title`/`order`/`author`/`date`/`draft`,
  frontmatter wins over JSON-comment metadata), **wikilinks** `[[slug]]` /
  `[[slug|label]]` → `/slug/`, and **footnotes** `[^id]` → numbered refs + an
  endnotes section (ePub/web).
- **Book/prose quick wins:** auto-serve `/iife.js` when `bundleEntry` is omitted;
  skip `_`-prefixed scaffolding files; empty metadata `title` falls back to the
  H1; warn when no ePub cover is generated.
- **`epub.coverIcon`** — embed a custom flat SVG glyph into the generated ePub
  cover (in place of the favicon); the source viewBox is preserved so any
  square-ish icon scales correctly. tosijs-ui ships a `tosi-book` cover glyph.
- **`<tosi-3d>` declarative attributes** — assemble a scene purely in HTML (no
  `sceneCreated` callback): `src` (a `.glb` URL, auto-loads like `<img>`),
  `hero-light` (a directional key light over a soft hemispheric fill), `fov` (a
  field-of-view multiplier — `1` unchanged, `<1` a longer lens), and `clear-color`
  (a hex color, or `transparent` to composite the 3D over the page). Aimed at
  declarative narrative pages.

### Fixed

- **Multiple `<tosi-3d>` on one page.** Their scenes are created asynchronously and
  interleave, so objects created without an explicit scene landed on Babylon's
  `Engine.LastCreatedScene` (another instance's scene) — the built-in default
  camera did this, leaving a scene with no camera and a blank canvas. The default
  camera (and the doc examples' lights) now pass their scene explicitly.

### Changed

- **PDF is now the in-browser Print button, not a batch job.** The doc-browser's
  Print action renders the shared book HTML (`book-html.ts`) and the browser
  prints it to PDF. This is the single, supported PDF path going forward; a future
  paginated/footnote-anchored PDF will build on it. (ePub is still generated at
  build time and unaffected.)
- **Live examples pinned to tjs-lang 0.8.7** (upstream subtle-bug fix).

### Removed

- **The headless PDF batch builder** (`buildPdf` / `BuildPdfOptions`, exported
  from `tosijs-ui/site`, and the `book:pdf` / `--pdf` script) — a secondary code
  path superseded by the Print button above. If you generated PDFs in a build,
  print the book page to PDF (via the doc-browser) instead.

## 1.6.15

Live-example fixes from tosijs-3d adoption. All fixes to the doc-system's
editing surface; no API changes.

### Fixed

- **Save to source works when the doc comment is indented.** A `/*# … */` doc
  comment is often indented in the source; the extractor dedents its fenced blocks
  (so examples render with correct ordinals), but the raw scan required the closing
  ` ``` ` right after a newline, so an indented file matched **zero** blocks and
  every save failed with "no matching block". The scan is now indentation-aware,
  and edits compare dedented / write re-indented so a block keeps its place. The
  failure alert is also split into a precise message (page↔source ordinal mismatch
  vs. a genuine no-op).
- **The pop-out editor window ("view/edit code in a new window") now has the full
  menu.** It previously opened as a bare instance, so View changes, Save changes
  (local), and Save to source were hidden; the source↔doc key and the pristine
  snapshot are now passed through, so the pop-out offers — and can execute — the
  same actions as the main window.
- **Opening the editor in a new window closes the inline code view** in the main
  window if it was open (the pop-out owns editing).
- **The doc extractor now only treats a `/*#` block as a doc when it starts a
  line** (whitespace-only before the slash), so a `/*#` inside a `//` comment, a
  string, or mid-line can't be scraped as a spurious doc page.

## 1.6.14

Lighter live-example transpilation. Additive; affects only how the live-example
runner loads its (optional, lazy) transpiler.

### Changed

- **Live examples now use tjs-lang 0.8.5's self-contained browser bundles**
  (`tjs-lang/browser` + `tjs-lang/browser/from-ts`). The transpiler is a single
  self-contained chunk, and the TypeScript compiler is **lazy-loaded from a CDN at
  runtime** only when a `ts` example actually transpiles — so `typescript` (~MB)
  and the transpiler's own deps are never in a consumer's dependency graph. This
  also fixes the `ts` example path, which previously tried to load the TypeScript
  compiler through a CDN transform that timed out on its size.
- **Robust transpiler loading.** The doc-site build now ships the tjs-lang browser
  bundles **same-origin** (copied next to the iife under `/tjs/`, with a global
  pointing the loader at them), so live examples never depend on a third-party
  CDN's propagation timing or uptime. The loader prefers the same-origin copy,
  then falls back through a multi-CDN chain (jsdelivr → unpkg → esm.sh). Installed
  ESM consumers resolve the peer locally as before.
- `tjs-lang` optional peer bumped to `^0.8.6`.

### Fixed

- A garbled character in the first `example` doc snippet that made it throw.
- Live examples could all break for the propagation window after a tjs-lang
  release, when the single pinned CDN 404'd the just-published version (now
  served same-origin + multi-CDN).

## 1.6.13

The documentation system becomes a real publishing pipeline: every doc site can
now emit an **ePub** of the whole corpus, **print to PDF** from the browser, and
**deep-link every example from the book back to the live site**. All changes are
**additive — no breaking changes** — and concern the doc-site tooling
(`tosijs-ui/site`) and doc browser, not the components.

### Added

- **ePub of the whole doc site** (`tosijs-ui/site`). Set `epub: true` (or an
  options object) in the site config and the build emits a valid EPUB 3 of the
  corpus alongside the static pages, regenerated on every build:
  - one chapter per doc in nav-tree order, a readable **Contents page** in the
    reading flow plus the reader's Contents drawer (EPUB3 `nav.xhtml` + EPUB2
    `toc.ncx`), and a customizable stylesheet (`epub.css` / default force-wraps
    code listings)
  - an **auto-generated cover** from the title + favicon (`epub.cover` /
    `epub.coverColor` to override); needs the optional `@resvg/resvg-js`, and is
    omitted gracefully if it's absent
- **Print to PDF** from the doc browser — a "Print as PDF" item in the settings
  menu assembles the whole corpus into a print-styled window and opens the print
  dialog. No server, no headless browser. (A headless `buildPdf` is also available
  for CI via `bun run book:pdf`, not deployed.)
- **"Download ePub"** item in the settings menu (alongside Print), linking the
  built book.
- **Example anchors + book deep links.** Every live example gets a stable anchor
  (`/{slug}/#example-1`, or a custom `id` via a ` ```js#my-id ` fence on any block
  of the group). Arriving at such a URL scrolls the example into view with a brief
  highlight. Each example in the ePub/PDF links back to its anchor on the live
  site — a reader is one tap from the real, interactive, editable version.

### Removed

- The broken **bundlejs** size badge (bundlejs errors computing the bundle).

### Notes

- The ePub needs `happy-dom` (dev dep) + the `zip` CLI; the generated cover needs
  the optional `@resvg/resvg-js`.

## 1.6.12

Packaging improvements for independent, tree-shakeable consumption. All changes
are **additive — no breaking changes**; one minor behavioral edge case is noted
below.

### Added

- **Subpath exports**, so an app can import only what it needs without the barrel
  dragging in dev tools:

  - curated: `tosijs-ui/icons`, `tosijs-ui/code-editor`, `tosijs-ui/live-example`,
    `tosijs-ui/doc-browser`, `tosijs-ui/diff`, `tosijs-ui/theme`
  - per-component wildcard: `import { tosiRating } from 'tosijs-ui/rating'`
    (resolves `dist/rating.js`, registering just that element)

  The full barrel `import 'tosijs-ui'` is unchanged and still registers every
  `<tosi-*>` element.

### Changed

- **`menu`, `tooltip`, and `float` now inject their stylesheet and register their
  global listeners on first use, not at import.** Importing these modules (or the
  barrel) no longer has import-time side effects. This also fixes a latent bug
  where the menu `keydown` handler attached to `document.body` at import time,
  which may not exist yet.

### Possible edge case

If you imported `menu` / `tooltip` / `float` **purely for the side effect** — i.e.
you hand-author markup with the internal classes (`.tosi-menu`, `.tosi-tooltip`,
…) and relied on a bare `import` injecting the stylesheet, **without** ever
calling the API (`popMenu`, `popDropMenu`, `initTooltips`, `showTooltip`) or using
the `<tosi-*>` element — those styles now apply only once the API/element is first
used. Normal usage (the element creators, the `<tosi-*>` elements, and the
`popMenu`/`initTooltips` entry points) is unaffected.
