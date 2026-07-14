/*
The ONE rule for a doc page's <title>.

It has to be one rule, because it is applied twice — once by the static generator into
the pre-rendered `<head>`, and once by the doc-browser when it hydrates. Two
independently-written copies drifted, and the title became the one thing on the page
that visibly MOVED on hydration:

    JS off        →  "tosijs-ui — robust, dependency-free web components"   (headTitle)
    hydrated      →  "tosijs-ui — tosijs-ui"                                (!)

...because the runtime copy ignored `headTitle` and re-suffixed a title that already
ended in the project name. That is GitHub issue #6, and it was live on our own home
page while this release's whole thesis was "hydration is purely additive, nothing
moves".

Shared by `site/generate-site.ts` (build) and `doc-browser.ts` (runtime). Pure — no DOM,
no Bun — so both can import it.
*/

/** The fields of a Doc that bear on its title. Structural, so both callers fit. */
export interface TitledDoc {
  title: string
  /** verbatim <title>, no project suffix — a per-doc override */
  headTitle?: string
}

/**
 * `headTitle` wins verbatim. Otherwise suffix the project name — unless the doc's own
 * title already contains it, which is what produced "tosijs-ui — tosijs-ui".
 */
export function pageTitle(doc: TitledDoc, projectName?: string): string {
  if (doc.headTitle) return doc.headTitle
  if (!projectName || doc.title.includes(projectName)) return doc.title
  return `${doc.title} — ${projectName}`
}
