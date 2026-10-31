/** The fields of a corpus doc the metadata depends on. */
export interface MetadataDoc {
    filename: string;
    path?: string;
    title: string;
    headTitle?: string;
    description?: string;
    text?: string;
    hidden?: boolean;
    noindex?: boolean;
}
export interface PageDescription {
    text: string;
    /** `metadata`: the page's own; `derived`: its first paragraph; `site`: the site default */
    source: 'metadata' | 'derived' | 'site' | 'none';
    /** a derived description that had to be cut mid-sentence */
    cut: boolean;
}
/** The page's description: its own, else its first paragraph, else the site's. */
export declare function pageDescription(doc: MetadataDoc, siteDescription?: string): PageDescription;
export declare const DESCRIPTION_MIN = 70;
export declare const TITLE_MIN = 20;
export declare const TITLE_MAX = 60;
export interface MetadataFinding {
    /** what is wrong, worded for a group heading */
    problem: string;
    /** the page's source file (or filename), so the author knows where to look */
    page: string;
}
/** Lint every indexable page's title and description. Pure; the caller reports. */
export declare function lintMetadata(docs: MetadataDoc[], site?: {
    projectName?: string;
    description?: string;
}): MetadataFinding[];
/** The findings grouped by problem, one line of pages each; '' when there are none. */
export declare function metadataReport(findings: MetadataFinding[], pageCount: number): string;
