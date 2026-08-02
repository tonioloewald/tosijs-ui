export interface EpubVolume {
    /** the `book` value, or '' for the default volume */
    book: string;
    /** human title — "<project>" or "<project> — <volume>", or an explicit override */
    title: string;
    /** output filename, e.g. `my-project-appendices.epub` */
    filename: string;
    /** served URL, honouring basePath */
    url: string;
}
export interface VolumeNamingConfig {
    name?: string;
    basePath?: string;
    epub?: boolean | {
        title?: string;
        volumeTitles?: Record<string, string>;
    };
}
/**
 * The identity of one volume. `bookTarget` undefined means the default volume.
 *
 * Kept deliberately pure and dependency-free so the ePub builder, the site build and an
 * adopter's own script all agree by construction rather than by comment.
 */
export declare function epubVolumeIdentity(config: VolumeNamingConfig, bookTarget?: string): EpubVolume;
/**
 * Every volume this corpus will produce, default first.
 *
 * Empty when the corpus has no publishable docs at all — which is a real state (everything
 * hidden, or everything `book: "none"`) and must not be reported as one nameless volume.
 */
export declare function listEpubVolumes(corpus: Array<{
    filename: string;
    title?: string;
    parent?: string;
    book?: string | string[];
    hidden?: boolean;
}>, config: VolumeNamingConfig): EpubVolume[];
/** The marker a consumer drops into a page to get the download list. */
export declare const EPUB_DOWNLOADS_MARKER: RegExp;
/**
 * Replace `<!-- epub-downloads -->` with a markdown list of the built volumes.
 *
 * Substituted at BUILD time, into the doc text, so the statically-rendered page and the
 * hydrated SPA show the same thing and the client needs no new data source. A marker in a
 * corpus that builds no ePub renders as nothing rather than an empty list or a stray
 * comment.
 */
export declare function renderEpubDownloads(text: string, volumes: EpubVolume[]): string;
