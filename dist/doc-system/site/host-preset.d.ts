export interface HostConfigMismatch {
    /** every `hosting.public` we found, in file order */
    declared: string[];
    /** the directory this build actually wrote */
    built: string;
}
/**
 * `null` when there is nothing to complain about — which includes "cannot tell".
 *
 * Returns a mismatch only when EVERY declared `public` disagrees with `outputDir`. A
 * multi-site config that serves the built directory from any of its targets is fine.
 */
export declare function firebasePublicMismatch(firebaseJson: string, outputDir: string): HostConfigMismatch | null;
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
export declare function basePathDoubling(config: {
    baseUrl?: string;
    basePath?: string;
}): string | undefined;
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
export declare function bundleRegistrations(bundleSource: string): {
    docSystem: boolean;
    liveExample: boolean;
};
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
export declare function writesOutsideOutputDir(paths: {
    docsJson: string;
    llmsTxt: string | null;
}, outputDir: string, exists: (p: string) => boolean, resolve: (p: string) => string): string[];
