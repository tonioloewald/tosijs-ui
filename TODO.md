# TODO

Live, actionable work only: one or two lines per item, with an issue or a pointer to the detail.
Measurements, evidence, design reasoning, decisions and finished work live in
[`reviews/TODO-archive-2026-09-26.md`](reviews/TODO-archive-2026-09-26.md) ("archive" below);
look there before re-deriving anything. Work that has an open GitHub issue is tracked THERE, not
repeated here (#179 1.16 sanitize default, #177 sign-in UI, #162 schema-form, #142 WebGL
concurrency, #40 icon modules, and the rest of the open issues). Pruned 2026-09-26 ahead of
moving tasks onto the virta board.

## Scheduled

- [ ] **Adopt tosijs 1.10 — UNBLOCKED.** The `tosijs-1.10-adoption` branch migrated every
      component (418 type errors → 0) but could not emit declarations (tosijs#38). #38 closed
      2026-09-06; tosijs is at 1.10.3 and we are still on 1.9.1. Rebase the branch, confirm
      `tsc --declaration`, raise the peer floor with the reason recorded, all four lanes. A
      breaking minor (element creators become attribute-typed): pairs with the 1.16 items.
- [ ] **tjs-lang 0.14.0 final:** move the devDependency and `TJS_VERSION` from 0.13.13 (the
      peer already admits 0.14; the rc passed every lane, #182).
- [ ] **TypeScript 7 / Dependabot #167:** the new tsc removed `downlevelIteration`, which
      `tsconfig.json` still sets, so dev-dependency updates are stuck. Its own change, all lanes.
- [ ] **#169, second half:** `buildSite` resolves `PROJECT_ROOT` from cwd, so run from another
      directory a library build can clean the wrong `dist/`. Resolve it from the config file.
- [ ] **`bin/docs.ts` shim:** its documented `'tosijs-ui/bin/docs'` specifier has never
      resolved (the `./*` export maps it to `dist/`). Retire it at the next minor, or add an
      explicit export (to a `.ts` file; weigh that first).

## Components

- [ ] **`<tosi-table>` drops focus to `<body>` on re-render**: a keyboard user mid-navigation
      is thrown out of the table. Migrate focus to the same or nearest surviving cell. Best done
      with the one-frame virtual-mode flicker and "don't rebuild when only data changed"
      (archive: `<tosi-table>` loses FOCUS / scroll preservation).
- [ ] **`<tosi-crud>`: one keystroke rebuilds the whole table** (1.11.0 review M8); identity-guard
      the `table.array` / `form.schema` assignments.
- [ ] **`<tosi-side-nav>` needs a collapsed state** so `layout: 'full-screen'` can exist (it is
      rejected today rather than half-honoured).
- [ ] **A `tosijs-ui/prism` export** so a consumer can reach our Prism instance, as
      `tosijs-ui/codemirror` does for CodeMirror.
- [ ] **schema-form / crud CSS through `vars` / `varDefault`**: 18 hand-rolled `var()` strings;
      one typo already hid behind a fallback.
- [ ] **Icons:** cache the parsed template per spec in `makeIcon` (1.13.0 review F6), and make the
      live-example pocket-handle glyph themable or say it is deliberate (F9).
- [ ] **Localization:** `<tosi-example>` (18 strings; pass `localized` to its `popMenu` first,
      which is free), `<tosi-diff>` labels, and `<tosi-table>`'s concatenated "Sort ascending"
      menu keys (moves keys, so a minor). Plus password-strength, tag-list, filter. Generate the
      required-strings list from source rather than hand-writing it.

## Doc system and site build

- [ ] **`devServer` keeps the config it started with** (#144): editing the site config does
      nothing, and a delegated build reports success with the stale one.
- [ ] **`/__build` answers only at the end** (1.13.0 review M1), so long builds hit the 120s idle
      timeout. Stream progress or `202` + poll. And add the missing wire test (M3).
- [ ] **1.13.0 review leftovers:** type the `sourceMenuItems` seam and give the app menu a stable
      `part` (F2); move the `8798` default into `resolveDevPort` (F4); assert the staging dir
      before `epub.ts`'s recursive `touch` (F8); a delegation opt-out for CI builds (F10).
- [ ] **The ePub is not reproducible** (varying zip bytes), so it can never be part of a
      rebuild-is-clean check. Fixed mtimes and ordering.
- [ ] **A sub-frame flash of full-width prose** between `:defined` and hydration; make the
      pre-hydration `.doc-content` rule not depend on `:not(:defined)`.
- [ ] **Let consumers customize the doc system's settings menu** (Print, ePub, Language, Theme …).
- [ ] **`generateIconData()` exported from `tosijs-ui/site`**, so a doc site can build its icons
      in `prebuild` without shelling out to `tosijs-make-icons`.
- [ ] **`checkExamples` heuristics for css/html fences** (#146): only the narrow, safe version,
      and only once there is a corpus to test it against.
- [ ] **Book / prose adoption:** opt-in smart typography; a `kind: 'book'` preset; folder
      structure implying nav sections; natural filename order; optional epubcheck; word count and
      reading time (archive: Book / prose adoption).

## Testing and lanes

- [ ] **A standalone `doc-tests.pw.ts` run once passed a broken example** that the full suite
      caught. Undiagnosed; until it is, only the full suite is evidence.
- [ ] **Firefox intermittently refuses to compile wasm under load** (~1 run in 6), failing the
      inline-WASM example. Filed as tjs-lang#36; no local fix.
- [ ] **No lane runs a shipped bin's `--help`**: safe in all four bins now, and it is the check
      that would have caught 1.13.0's `--help` bug.
- [ ] **Untested paths with real consequences:** the tunnel handler receiving `viaTunnel = true`
      (export a `createRequestHandler`); `stashLastGood` / `restoreLastGood`; the client's
      403 → no-download save path; `buildStatus` on the initial build.
- [ ] **Touch is untested**: add a Playwright spec with a touch device context for menus,
      tooltips, drag handles and the sidenav. (It cannot be faked from inside a page.)
- [ ] **CI e2e is Chromium-only.** Firefox is load-bearing locally; add it to CI, or make the
      release checklist fail when the all-engine run was skipped.

## Tooling and infrastructure

- [ ] **`tosijs-tunnel` can hand one project's hostname to another**: the remote port is a hash
      with no occupancy check, and the route is registered before `ssh -R` succeeds. Ask the
      host for the port; register after the forward. Soften the "can't collide" claim until then.
- [ ] **`make-icon-data.js`**: one bare `catch {}` turns a prettier parse error into
      "Successfully generated". Also escape `\r`/`\t` in `quote()`.
- [ ] **Decide the parked `dev-cache-revalidate` branch** (`56dcb03a`): time it three times on a
      quiet machine against `main`, then merge or drop (archive has why the first measurement
      meant nothing).
- [ ] **Preview index builds the edit URL** (a project picker plus a token box), and the
      `dev.tosijs.net/<code>` redirect (#132). Both cut what a headset owner has to type.
- [ ] **haltija adoption:** expose `globalThis.tosiAgent`; replace the hand-rolled wait loop
      with `hj doctor`; drive live examples with `hj map` rather than `hj tree`.
- [ ] Fold the six `server.stop(); process.exit(…)` sites into one `shutdown()`.

## Decisions to make (not tasks yet)

- **WebKit for interaction specs**: keep, or quarantine where it produces flakes rather than
  findings. A coverage question, not a reaction to a flake.
- **#61 fail-loudly as a standing review lens**, here or in the shared practices.
- **Site release branch** (tosijs-coding-practices#10): discussion only.
- **Dependency majors:** prettier 2 → 3 (alone, right after a release), chokidar 4 → 5,
  `@types/*`. marked 18 is done; TypeScript is scheduled above.
- **Prism in the iife** (+32kb gzip): superseded by the blueprint direction; cap the grammar map
  only if blueprints are far off.
- **#58 CodeMirror's 12 hard dependencies**: accepted cost; revisit only if an advisory fails an
  adopter's build.

## Ideas (no commitment)

Vector search in the doc browser · focus-visible styling · a fully isolated example mode (a
service worker sandboxing imports) · example captures for ePub and pre-hydration placeholders ·
an icon picker that emits `icon-data.ts` · `<tosi-filter>` built on select/tag-list/popFloat ·
`<tosi-editable>` snapping · `<tosi-lottie>` / `<tosi-map>` dependencies as optional peers rather
than CDN script tags · a language-plugin registry for live examples (#12).
