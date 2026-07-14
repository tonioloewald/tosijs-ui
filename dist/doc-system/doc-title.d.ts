/** The fields of a Doc that bear on its title. Structural, so both callers fit. */
export interface TitledDoc {
    title: string;
    /** verbatim <title>, no project suffix — a per-doc override */
    headTitle?: string;
}
/**
 * `headTitle` wins verbatim. Otherwise suffix the project name — unless the doc's own
 * title already contains it, which is what produced "tosijs-ui — tosijs-ui".
 */
export declare function pageTitle(doc: TitledDoc, projectName?: string): string;
