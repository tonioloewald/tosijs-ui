# Adopting the doc system

<!--{ "pin": "top", "order": 20, "description": "A first hour with tosijs-ui/site: the minimum that works, how to tell it is actually working, and the four things that fail silently while the site still serves 200s." }-->

This is the page to read **before** your first build. [Doc-Site System](/doc-site-system/) is
the reference — every option, every hook. This is the narrow path through it, plus the things
that will cost you an afternoon if nobody tells you.

The one thing worth knowing up front, because it shapes everything below:

> **This system's failure mode is a site that serves perfectly and shows nothing.** Not a
> crash, not a 404 — pages return 200, your markup is in the HTML, your own elements register,
> and the page is inert. Every problem in the "silent failures" section below looks like that,
> so "it built and it's serving" is not evidence that it worked.

## The minimum that works

Three files. This is complete — not a sketch.

**`site.config.ts`** at your repo root:

```typescript
import { defineSiteConfig } from 'tosijs-ui/site'

export default defineSiteConfig({
  name: 'my-lib',
  description: 'What my library does.',
  // ORIGIN ONLY — no path. See "baseUrl and basePath" below.
  baseUrl: 'https://my-lib.example.com',
  docPaths: ['src', 'README.md'],
  bundleEntry: 'demo/site.ts',
})
```

**`demo/site.ts`** — the bundle. **This file is where first adoptions go wrong**, so it is
worth understanding rather than copying:

```typescript
// REQUIRED. bundleEntry REPLACES tosijs-ui's bundle; it does not extend it.
// Without this line, `<tosi-doc-system>` is never defined and every page is inert.
import 'tosijs-ui/doc-browser'

// Required if any doc has an executable fence (```js / ```ts / ```tjs / ```test).
import 'tosijs-ui/live-example'

// Your own components, so they register for your examples.
import './src/index'
```

**`bin/site.ts`** — the only build file you write:

```typescript
import { buildSite, devServer } from 'tosijs-ui/site'
import config from '../site.config'

process.argv.includes('--build') ? buildSite(config) : devServer(config)
```

Then `bun bin/site.ts` to develop and `bun bin/site.ts --build` to build. The dev server wants
a local TLS cert the first time — it will tell you to run `bunx tosijs-dev-certs`.

Build-time peers, installed when the build says it needs them:
`bun add -d happy-dom tjs-lang marked`.

## How to tell it actually worked

Do this once on your first build. It takes a minute and it is the difference between finding a
problem now and finding it after you have deployed.

1. **Is the doc system alive?** In the browser console:

   ```typescript
   customElements.get('tosi-doc-system') // must be truthy
   ```

   If your *own* element is defined and this one is not, you have the `bundleEntry` problem
   below. That combination is exactly what makes it confusing — the bundle looks healthy.

2. **Is the chrome there?** You should see a header and a nav. If you see your prose with no
   furniture around it, the page is inert.

3. **Read one emitted `<head>`.** Open `docs/<some-slug>/index.html` and look at the
   `<link rel="canonical">`. If the path appears twice, see `baseUrl` below. Nothing will ever
   fail at build time to tell you this.

4. **Do the examples run?** A live example renders a preview and an editor. A code block that
   is only highlighted did not execute — check the fence language.

## The four things that fail silently

### `bundleEntry` replaces, it does not extend

Setting `bundleEntry` means pages load **your** bundle *instead of* tosijs-ui's — which is
where the doc system itself lives. Omit `import 'tosijs-ui/doc-browser'` and every page renders
its prerendered markup with no header, no nav, no menu and no live examples.

There is no console error, no build warning and no 404. `docs.json`, your bundle and the HTML
all serve 200. `<tosi-doc-system>` is right there in the markup, inert, because nothing defined
it. Meanwhile your own elements register fine.

The build now warns when it can see this, but treat the warning as a safety net rather than the
contract — write the imports.

> Importing the package root (`import 'tosijs-ui'`) does **not** cover this. The root barrel
> deliberately excludes the doc-system cluster ([#133](https://github.com/tonioloewald/tosijs-ui/issues/133)
> — it was 77% of the barrel's weight, and it was landing on every app that imported a button),
> so the root import registers your buttons and leaves `<tosi-doc-system>` undefined. Write the
> subpaths.

### `baseUrl` is the origin. `basePath` is the mount path.

They are different fields and putting the path in both doubles it in every canonical URL,
`og:url` and sitemap entry.

| your site | `baseUrl` | `basePath` |
| --- | --- | --- |
| custom domain at the root | `https://my-lib.dev` | *(unset)* |
| GitHub project page | `https://me.github.io` | `/my-repo/` |

Getting this wrong does not break the site — `basePath` affects **metadata only**, so nav and
assets resolve relative and everything works. You find it by reading the emitted `<head>`, or
from Search Console weeks later. The build now warns on the combination that is always wrong.

### Six fence languages EXECUTE

`js`, `ts`, `tjs`, `html`, `css`, `test`. Everything else is display-only.

The two that surprise people are **`html`** and **`css`**, because they do not look like code
you are asking to be run:

- A ` ```css ` block showing *"here is how you'd style this in your app"* is injected as a
  page-wide `<style>`. A rule like `my-widget { background: white }` then fights the doc
  system's theme and is a white slab in dark mode.
- A lone ` ```html ` block showing *"the markup this compiles to"* renders as a live example —
  usually unstyled, because the rules live in a shadow root and there is no component around
  it. It reads as a broken demo.

Neither fails the build. For illustration rather than execution use `typescript`, `xml` for
markup, and `scss`/`less` for styles.

This page is its own worked example: the verification snippet above was written as ` ```js `
and ran — turning a one-line console check into a live example with an editor. Caught by
looking at the built output, which is the habit worth forming.

If you want CSS that is both real and scoped, write it against the theme variables
(`--tosi-bg`, `--tosi-text`) and scope the selector to your example's own markup.

### Adjacent fences are ONE example

Consecutive code blocks merge into a single `<tosi-example>` with tabs. **Prose between them
starts a new one.**

So moving a ` ```test ` block under its own heading silently detaches it from the demo it was
written against and gives it a second, empty editor. The tests still run; they just no longer
run against that example's DOM.

One executable script block per example — `js`, `ts` and `tjs` are the same slot, so
consecutive ones discard all but the last.

## Writing the docs themselves

- **`.md` files** are included whole.
- **`/*# … */` block comments** in `.ts`/`.js`/`.css` are extracted as markdown. The first
  heading becomes the page title. The block must start at the beginning of a line.
- Files whose name starts with `_` are skipped — use that for drafts.
- Nav placement comes from a metadata block: `<!--{ "pin": "top", "order": 10 }-->` in
  markdown, `/*{ … }*/` in code. `parent` puts a page in a section.

## When you get stuck

The dev server holds the config it imported at **startup** — editing `site.config.ts` while it
runs has no effect, and a rebuild will use the stale one while printing what looks like
success. Restart it.

Everything else lives in [Doc-Site System](/doc-site-system/): hosting presets, ePub output,
`llms.txt`, the audit gate, custom icons, and the seams for projects whose build does more than
`buildSite`.
