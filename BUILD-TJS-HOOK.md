# Proposal: a pluggable library-build step in `buildSite` (for native `.tjs` sources)

**Status:** ✅ **SHIPPED in tosijs-ui `1.6.21`** (on npm; `latest` is ≥ 1.6.22) — Option A + the
preload half. **Nothing is waiting on 1.7** — the seams, and their `.d.ts` types, are in the
published tarball. (This line previously said "1.7 branch", which parked the tosijs 2.0 TJS
port on an unreleased branch for no reason. If you are reading this to decide whether you can
start: you can.)
Raised from the tosijs 2.0 port (migrating tosijs modules from `.ts` to native TJS
`.tjs`). Full context: `tosijs/TJS-PORT-DX.md`.

## What shipped (how to consume it)

`SiteConfig` (tosijs-ui/site) now has two seams:

```ts
// 1. Replace the fixed `tsc` library build. You own emitting dist/*.js + *.d.ts
//    for ALL sources — run tsc for the .ts graph AND tjs convert / generateDTS for
//    .tjs, into the same `dist`. Takes precedence over libraryTsconfig/emitLibrary.
libraryBuild?: (ctx: { dist: string; root: string; tsconfig?: string }) => void | Promise<void>

// 2. Fix the CSS-extraction eval context. generate-css runs as a subprocess that
//    imports your library to burn the theme; if that graph reaches `.tjs`, point
//    this at a module that registers your Bun loader plugin (Bun.plugin({...}) at
//    import time). buildSite spawns generate-css with `bun --preload <this>`.
generateCssPreload?: string
```

That covers both halves the proposal called out: the tsc-owned emit (Option A —
`libraryBuild`) and the module-eval context (`generateCssPreload`, i.e. eval-context
option 1 "register the consumer's loader"). Both modes work: incremental (run tsc +
tjs inside `libraryBuild` over a mixed graph) and bulk (skip tsc, run the tjs build
wholesale). `LibraryBuildContext` is exported from `tosijs-ui/site` for typing.

Example (mixed .ts + .tjs, using tjs-lang 0.9.0's exports):

```ts
export default defineSiteConfig({
  // …
  libraryTsconfig: 'tsconfig.build.json',
  libraryBuild: async ({ dist, tsconfig }) => {
    await $`bun tsc -p ${tsconfig}` // .ts → dist
    await $`bun x tjs convert --emit-js src --out ${dist}` // .tjs → dist/*.js
    // + generateDTS(...) for the .tjs → dist/*.d.ts
  },
  generateCssPreload: './build/tjs-preload.ts', // Bun.plugin({ name, setup })
})
```

---

## Original proposal (below)

## The problem

`buildSite` (doc-system/site) currently builds the library with a **fixed,
monolithic tsc command**:

- `src/doc-system/site/orchestrator.ts:127` → `bun tsc -p ${config.libraryTsconfig}`
  (or `:133` → `bun tsc --declaration --incremental --outDir dist`).

`tsc` only understands `.ts`/`.tsx`/`.d.ts`. When a consumer has a **native `.tjs`
source** (e.g. `src/by-path.tjs`), tsc:

1. emits per-file `dist/*.js` for the `.ts` files, whose imports still read
   `import './by-path.tjs'`, but
2. emits **nothing** for `by-path.tjs` itself (unknown suffix), so there is no
   `dist/by-path.*` to resolve.

Downstream, the CSS-extraction step **evaluates** the emitted per-file `dist/*.js`
(the `generate-css` path — `bin/site.ts` in a consumer even comments that the
per-file `.js` are kept "so generate-css could resolve `tosijs`"). That evaluation
then fails:

```
error: Cannot find module './by-path.tjs' from '.../dist/xin-proxy.js'
```

The consumer _can_ transpile `.tjs` for the shipped bundles (a `Bun.build` plugin
handles that fine), and _can_ express-control the `.d.ts` — but it has **no way to
participate in the tsc step** that buildSite owns, nor in the module-eval context
CSS extraction uses. So a native-`.tjs` module can be validated in parallel but
cannot become the shipped source. This blocks the whole incremental migration for
any module reachable by CSS extraction (i.e. most core modules).

## Two migration modes — both should work

A consumer adopting TJS will pick one of two paths, and **buildSite should not
utterly block either**:

1. **Incremental / conservative (mixed `.ts` + `.tjs`).** Migrate one module at a
   time, keep the rest TypeScript. This is the _sensible default_ for a large
   existing codebase — small, reviewable steps, easy rollback. It is **the one
   blocked today**: the tsc step can't see `.tjs`, and the CSS-eval step can't load
   it. A consumer who prefers this shouldn't have to go all-in to get unblocked.
2. **Bulk / wholesale (all `.tjs`).** Convert everything at once
   (`tjs convert --emit-tjs src/`) and retire tsc. This _sidesteps_ the mixed-graph
   resolution issues and has been proven to build + smoke-test in tosijs. It still
   needs buildSite to run a tjs build instead of `tsc -p`.

The friction of mode (1) is real and worth removing regardless of where it's
addressed (Bun runtime `onResolve`, tjs tooling, or here). The hook below should
support **both** — augmenting tsc for a mixed graph _and_ replacing it wholesale.

## What would fix it: make the library-build step pluggable

The consumer already knows how to turn a `.tjs` into the right artifacts
(`tjs convert` → `.js`, `generateDTS` → `.d.ts`, both now exported from
`tjs-lang@0.9.0`). It just needs a place to plug that in so the artifacts land
where tsc would have put them, **and** so the CSS-eval step can load them.

### Option A (preferred) — a `libraryBuild` override callback

Let `SiteConfig` accept a callback that replaces the fixed tsc command:

```ts
interface SiteConfig {
  // …existing…
  /**
   * Override the library build (the `tsc -p libraryTsconfig` step). Receives the
   * resolved config; responsible for emitting `dist/*.js` + `*.d.ts` for ALL
   * sources. Default runs the current tsc command. A TJS consumer runs tsc for
   * `.ts` and `tjs convert` + `generateDTS` for `.tjs`, into the same `dist`.
   */
  libraryBuild?: (ctx: {
    dist: string
    srcRoot: string
    tsconfig: string
  }) => Promise<void>
}
```

Simplest and most flexible — one seam, consumer owns the whole emit.

### Option B — per-suffix emitters

Let buildSite run tsc for `.ts` as today, then call consumer-provided handlers for
other suffixes, emitting alongside:

```ts
emitters?: Record<string /* '.tjs' */, (file: string, dist: string) => Promise<void>>
```

More structured, but buildSite has to interleave with tsc's output.

### The eval-context half (don't miss this)

Even with the artifacts present, CSS extraction must be able to **load** them. Two
clean ways:

1. **Register the consumer's loader** in the process that evaluates modules for CSS
   (accept a `preload`/`plugins` hook that generate-css applies to its eval), **or**
2. **Evaluate the bundled output** (`dist/module.js`, which already has `.tjs`
   inlined by the consumer's `Bun.build` plugin) instead of the per-file `dist/*.js`.
   (2) also removes the need to keep the per-file `.js` at all.

## Minimal interim

If a full hook is heavy, even an `afterLibraryEmit?(dist)` hook — called after tsc,
before CSS extraction — would let a consumer inject transpiled `.tjs` artifacts and
their `.d.ts` into `dist`. Combined with generate-css evaluating the _bundled_
module (eval-context fix #2), that unblocks native-`.tjs` modules.

## Why this matters

It turns "native TJS modules can be validated but never shipped" into "any module
can be migrated incrementally." The consumer-side pieces already work (runtime via
`onLoad`, types via `allowArbitraryExtensions` + `.d.tjs.ts`, bundles via the
`Bun.build` plugin); the only missing seam is buildSite's tsc-owned library build
and its CSS-eval context.
