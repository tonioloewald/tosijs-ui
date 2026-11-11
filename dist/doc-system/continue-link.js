/*
The "Continue" link at the foot of a page in a section meant to be read in order (#255).

A section opts in with `{"continue": true}` in its metadata (or `continue: true` in YAML
frontmatter). The section page and every page under it, in nav order, then end with a link to
the next of them; the last page gets none, and pages outside such a section get nothing, so a
reference page never grows a link into an unrelated section.

Imported by BOTH the build-time generator and the doc-browser, like nav-tree.ts: the static
page and a page rendered on client-side navigation must end the same way.
*/
/** The nav path from a top-level page down to `filename`, inclusive; [] when it is not in the nav. */
function trailTo(roots, filename) {
    for (const node of roots) {
        if (node.doc.filename === filename)
            return [node];
        const below = trailTo(node.children, filename);
        if (below.length)
            return [node, ...below];
    }
    return [];
}
const readingOrder = (node) => [
    node,
    ...node.children.flatMap(readingOrder),
];
/**
 * The page a reader continues to from `filename`, or undefined.
 *
 * The OUTERMOST section that opts in decides the sequence, so a book whose chapters are
 * themselves sections reads straight through: the last page of one chapter continues to the
 * next chapter, rather than stopping because the chapter declared a sequence of its own.
 */
export function continueTarget(roots, filename) {
    const section = trailTo(roots, filename).find((node) => node.doc.continue);
    if (!section)
        return undefined;
    const order = readingOrder(section);
    const at = order.findIndex((node) => node.doc.filename === filename);
    return order[at + 1];
}
const escapeHtml = (s) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
/**
 * The link itself. "Continue" is localized like the doc system's other captions; the page
 * title is the author's own text.
 */
export function continueLinkHtml(href, title) {
    return (`<p class="doc-continue"><a href="${escapeHtml(href)}" rel="next">` +
        `<tosi-localized>Continue</tosi-localized>: ${escapeHtml(title)}` +
        ` <span aria-hidden="true">→</span></a></p>`);
}
