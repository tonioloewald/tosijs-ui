export interface Doc {
    text: string;
    title: string;
    filename: string;
    path: string;
    pin?: 'top' | 'bottom';
    /** sub-order within a pin bucket (lower first); section docs use this */
    order?: number;
    /** parent doc name or slug — groups this doc into a nav section */
    parent?: string;
    hidden?: boolean;
    headTitle?: string;
    description?: string;
    keywords?: string | string[];
    image?: string;
    noindex?: boolean;
}
export interface ExtractDocsOptions {
    paths: string[];
    ignore?: string[];
    output?: string;
}
export declare function extractDocs(options: ExtractDocsOptions): Doc[];
export declare function saveDocsJSON(docs: Doc[], outputPath: string): void;
