export interface AltTextRequest {
    /** the image reference as written in the markdown */
    src: string;
    /** its markdown title, if it has one (`![](a.png "title")`) */
    title?: string;
    /** the doc it appears in; `path` is the source file, which a relative `src` resolves from */
    doc: {
        filename: string;
        title?: string;
        path?: string;
    };
}
/** Return the alt text, or nothing to leave the image reported. */
export type AltTextHook = (image: AltTextRequest) => string | null | undefined | Promise<string | null | undefined>;
interface CorpusDoc {
    filename: string;
    title?: string;
    path?: string;
    text: string;
}
/**
 * A copy of `docs` with each image the hook answered given its alt text, plus how many images
 * were asked about and how many were answered. Docs the hook changes nothing in are returned
 * as they were.
 */
export declare function applyAltText<T extends CorpusDoc>(docs: T[], hook: AltTextHook): Promise<{
    docs: T[];
    asked: number;
    supplied: number;
}>;
export {};
