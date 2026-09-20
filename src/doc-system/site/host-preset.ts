/*
Does an EXISTING host config actually serve what we just built? (tosijs-ui#134)

`host: 'firebase'` scaffolds a `firebase.json` for a fresh project and — correctly — keeps its
hands off an existing one. The gap was that it then checked nothing: if `hosting.public` names
a different directory than `outputDir`, `buildSite` writes one place and `firebase deploy`
publishes another. Both commands succeed. The site goes live serving whatever was in that
directory last.

Reported by tjs-lang, whose `firebase.json` says `"public": ".demo"` against a default
`outputDir` of `docs`. They had already been bitten by the sibling of this — Cloud Functions
running an eight-releases-old `tjs-lang` for months, because publishing to npm and deploying to
Firebase are separate acts and nothing compared them.

Pure, because the shape has more edge cases than it looks:

  - `hosting` may be an OBJECT or an ARRAY (multi-site projects).
  - `public` may be ABSENT — framework-aware hosting uses `source` instead, and comparing
    against a directory we did not build would be a false positive.
  - paths may be spelled `./docs`, `docs`, or `docs/`.

A false alarm here is worse than the silence it replaces: it would fire on every build of a
correctly-configured multi-site project, and the first thing anyone does with a warning that is
usually wrong is stop reading warnings.
*/

/** Normalise a config path for comparison: `./docs/` and `docs` are the same directory. */
const normalizeDir = (p: string): string =>
  p.replace(/^\.\//, '').replace(/\/+$/, '')

export interface HostConfigMismatch {
  /** every `hosting.public` we found, in file order */
  declared: string[]
  /** the directory this build actually wrote */
  built: string
}

/**
 * `null` when there is nothing to complain about — which includes "cannot tell".
 *
 * Returns a mismatch only when EVERY declared `public` disagrees with `outputDir`. A
 * multi-site config that serves the built directory from any of its targets is fine.
 */
export function firebasePublicMismatch(
  firebaseJson: string,
  outputDir: string
): HostConfigMismatch | null {
  let parsed: any
  try {
    parsed = JSON.parse(firebaseJson)
  } catch {
    return null // not ours to diagnose; `firebase` itself will complain
  }
  const hosting = parsed?.hosting
  if (!hosting) return null
  const entries = Array.isArray(hosting) ? hosting : [hosting]
  const declared = entries
    .map((h: any) => h?.public)
    .filter((p: unknown): p is string => typeof p === 'string')
  // No `public` anywhere — framework-aware hosting, or a config we do not understand.
  if (declared.length === 0) return null
  const built = normalizeDir(outputDir)
  if (declared.some((p) => normalizeDir(p) === built)) return null
  return { declared, built }
}

/**
 * `baseUrl` is the ORIGIN; `basePath` is the mount path. Supplying the path in BOTH is
 * always wrong and always silent: `generate-site` emits `baseUrl + withBase(basePath, …)`,
 * so every canonical URL, `og:url` and sitemap entry carries the prefix twice.
 *
 * Nothing fails — `basePath` affects metadata only (#25), so the site builds, serves and
 * navigates correctly with assets resolving relative. You find it by reading the emitted
 * `<head>`, or from Search Console. The reporter's shipped to GitHub Pages first (#144).
 *
 * Warns rather than throws: the emitted site is usable, and refusing to build over a
 * metadata defect would be disproportionate. But it names the exact fix, because "these two
 * fields overlap" is not something a reader can act on.
 */
export function basePathDoubling(config: {
  baseUrl?: string
  basePath?: string
}): string | undefined {
  const { baseUrl, basePath } = config
  if (!baseUrl || !basePath || basePath === '/') return undefined
  let pathname: string
  try {
    pathname = new URL(baseUrl).pathname
  } catch {
    return undefined // not our business — a malformed baseUrl fails louder elsewhere
  }
  const urlPath = pathname.replace(/\/$/, '')
  if (!urlPath) return undefined
  return (
    `baseUrl and basePath both carry a path, so every canonical URL, og:url and sitemap ` +
    `entry will repeat it:\n` +
    `    baseUrl:  ${baseUrl}\n` +
    `    basePath: ${basePath}\n` +
    `    result:   ${baseUrl.replace(/\/$/, '')}${
      basePath.startsWith('/') ? basePath : '/' + basePath
    }…\n` +
    `  baseUrl must be the ORIGIN ONLY — drop "${urlPath}" from it and keep basePath, ` +
    `or drop basePath. The site will still work either way; only its metadata is wrong.`
  )
}

function registersTag(bundleSource: string, tag: string): boolean {
  // `preferredTagName="tag"` (tosijs elementCreator) or `define("tag"` (direct), in any
  // quote style, with optional whitespace a minifier might or might not have removed.
  const q = `["'\`]${tag}["'\`]`
  return (
    new RegExp(`preferredTagName\\s*[=:]\\s*${q}`).test(bundleSource) ||
    new RegExp(`define\\s*\\(\\s*${q}`).test(bundleSource)
  )
}

/**
 * Does a custom `bundleEntry` bundle actually contain the doc system?
 *
 * `bundleEntry` REPLACES tosijs-ui's bundle rather than extending it, so an entry that
 * imports only the adopter's own library produces a site where every page renders its
 * prerendered markup and nothing else: no header, no nav, no menu, no live examples. Nothing
 * fails — `docs.json`, `hydrate.js` and the HTML all serve 200, `<tosi-doc-system>` is
 * present in the markup, and the adopter's own `customElements.get('their-element')` returns
 * true, so the bundle looks healthy. It is inert because nothing defined `tosi-doc-system`
 * (tosijs-ui#145; cost the reporter more than any other onboarding problem).
 *
 * HOW it is checked, and why the obvious version was wrong.
 *
 * This used to test `bundleSource.includes('tosi-doc-system')`, described as "the one case
 * where grepping a bundle is sound". It is not: the tag string being present is **necessary
 * and not sufficient**, and our own API invites the counter-example. A bundle whose only
 * mention is the context-map loop we document —
 * `document.querySelectorAll('tosi-doc-system')` — reported healthy while registering nothing
 * (tosijs-ui#159, with a reproduction: one `customElements.define` in the bundle, none of it
 * the doc system). The caller then fell through to warn about a *different* component,
 * pointing the maintainer away from the defect.
 *
 * The obvious repair is wrong in the other direction. Matching `define(` next to the quoted
 * tag false-negatives on **our own bundle**: `elementCreator()` registers with a variable, so
 * the minified output reads `customElements.define(i,this,r)` and the literal lives in a
 * `closest()` call and some CSS selectors, nowhere near a `define`.
 *
 * So look for evidence of a REGISTRATION rather than a mention, by either route:
 *
 *   - `preferredTagName="tosi-doc-system"` — the tosijs `elementCreator` path. Verified to
 *     survive minification in both `dist/iife.js` and a built `hydrate.js`.
 *   - `define("tosi-doc-system"` — a direct `customElements.define` with a literal.
 *
 * Neither matches a `querySelectorAll`, an attribute selector or prose. This is still a
 * static heuristic over a bundle and it cannot be sound — the honest claim is that it now
 * fails closed on the shape that was reported, which the substring check did not.
 *
 * `liveExample` is reported separately: a corpus with no executable fences legitimately does
 * not need it, so the caller decides whether its absence is worth mentioning.
 */
export function bundleRegistrations(bundleSource: string): {
  docSystem: boolean
  liveExample: boolean
} {
  return {
    docSystem: registersTag(bundleSource, 'tosi-doc-system'),
    liveExample: registersTag(bundleSource, 'tosi-example'),
  }
}

/**
 * Paths this build writes OUTSIDE `outputDir`, that already exist.
 *
 * `outputDir` reads as a box the build stays inside, and it is not one: `docsJson` defaults
 * to `demo/docs.json` and `llms.txt` is written at the project root. An adopter who set
 * `outputDir: '.scratch'` **specifically to evaluate the doc system without touching their
 * repo** had both overwritten — a 344-line agent index and a 1,252-line doc corpus, the
 * latter being the exact file their playground reads at runtime (tosijs-ui#154).
 *
 * They were committed, so `git checkout` restored them. Someone without that guard loses the
 * originals silently.
 *
 * Returns what to say, not whether to stop: these writes are correct for the projects that
 * configured them, and refusing would break every existing site. What was missing is that
 * nobody was told.
 */
export function writesOutsideOutputDir(
  paths: { docsJson: string; llmsTxt: string | null },
  outputDir: string,
  exists: (p: string) => boolean,
  resolve: (p: string) => string
): string[] {
  const out = resolve(outputDir)
  const inside = (p: string) => {
    const r = resolve(p)
    return r === out || r.startsWith(out.endsWith('/') ? out : out + '/')
  }
  return [paths.docsJson, paths.llmsTxt]
    .filter((p): p is string => Boolean(p))
    .filter((p) => !inside(p))
    .filter((p) => exists(p))
}
