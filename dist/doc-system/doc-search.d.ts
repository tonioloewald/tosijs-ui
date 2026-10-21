export interface SearchableDoc {
    filename: string;
    title: string;
    text: string;
    description?: string;
    keywords?: string | string[];
    parent?: string;
    hidden?: boolean;
}
export interface DocHeading {
    text: string;
    id: string;
    depth: number;
}
interface Entry {
    doc: SearchableDoc;
    order: number;
    title: string;
    titleWords: string[];
    headings: (DocHeading & {
        lower: string;
        words: string[];
    })[];
    keywords: string[];
    description: string;
    body: string;
}
export interface DocSearchHit {
    doc: SearchableDoc;
    score: number;
    /** The heading that matched best, when one did: a deep link into the page. */
    heading?: DocHeading;
    /** A line of the page around the first match, for the result's description. */
    snippet: string;
}
/** The headings of a markdown text, with the ids the rendered page gives them. */
export declare function docHeadings(text: string): DocHeading[];
/** Prepare a corpus for searching. Hidden pages are left out. */
export declare function buildDocIndex(docs: SearchableDoc[]): Entry[];
/** Score every page against `query`; best first, at most `limit`. */
export declare function searchDocs(index: Entry[], query: string, limit?: number): DocSearchHit[];
export {};
