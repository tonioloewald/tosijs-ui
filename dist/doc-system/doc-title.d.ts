/** The fields of a Doc that bear on its title. Structural, so both callers fit. */
export interface TitledDoc {
    title: string;
    /** verbatim <title>, no project suffix — a per-doc override */
    headTitle?: string;
}
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
export declare function pageTitle(doc: TitledDoc, projectName?: string): string;
