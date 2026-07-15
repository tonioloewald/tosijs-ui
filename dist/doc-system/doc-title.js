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
/**
 * `headTitle` wins verbatim. Otherwise suffix the project name — but only when the two
 * are genuinely distinct.
 *
 * "Distinct" means **neither string contains the other, compared case-insensitively.**
 * A one-way, case-sensitive `title.includes(projectName)` check missed real cases: a
 * project titled `Tosijs-UI` against a doc titled `tosijs-ui` (case), and a doc whose
 * title is a *substring* of the project name (the containment runs the other way). Any
 * of those, suffixed, reads as redundant — "tosijs-ui — tosijs-ui" being the one that
 * shipped (issue #6). When one already contains the other, the doc's own title is the
 * more specific label, so use it alone.
 */
export function pageTitle(doc, projectName) {
    // A whitespace-only `headTitle` is not an override, it's a blank <title> — trim it
    // and fall through. Trimming also cleans up an accidentally-padded one ("verbatim"
    // means "no project suffix", not "keep your stray whitespace").
    const headTitle = doc.headTitle?.trim();
    if (headTitle)
        return headTitle;
    // Trim first: a whitespace-only name ('' or '   ') is "no project name", not a real
    // one. Untrimmed, ' ' is truthy and slips through — and worse, `title.includes(' ')`
    // is true for any multi-word title, so it would silently suppress a suffix that
    // should appear. Trimming also strips a padded 'tosijs-ui ' down to the real name.
    const project = projectName?.trim() ?? '';
    if (!project)
        return doc.title;
    const t = doc.title.toLowerCase();
    const p = project.toLowerCase();
    if (t.includes(p) || p.includes(t))
        return doc.title;
    return `${doc.title} — ${project}`;
}
