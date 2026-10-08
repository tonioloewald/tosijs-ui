/** Where the volume manifest is served. */
export declare const VOLUME_MANIFEST = "epub-volumes.json";
export interface EpubVolume {
    /** the `book` value, or '' for the default volume */
    book: string;
    /** human title — "<project>" or "<project> — <volume>", or an explicit override */
    title: string;
    /** output filename, e.g. `my-project-appendices.epub` */
    filename: string;
    /** served URL, honouring basePath */
    url: string;
    /**
     * The cover image the build wrote beside the ePub, e.g. `my-project-cover.png`. Present
     * only in the manifest, and only when that file exists: it is read back from the output
     * dir after the ePubs are built (`attachCovers`), never predicted.
     */
    coverFilename?: string;
    /** served URL of that cover, honouring basePath — Print uses it as its first page */
    coverUrl?: string;
}
/**
 * The image types a cover may be, by extension. One table: the ePub build labels its cover
 * from it and `attachCovers` recognises a cover file by it.
 */
export declare const COVER_MEDIA_TYPES: Record<string, string>;
/** The name `buildEpub` gives a cover written beside `<stem>.epub`, minus its extension. */
export declare const coverStem: (epubFilename: string) => string;
/**
 * Add `coverFilename`/`coverUrl` to each volume whose cover is among `files` (a listing of
 * the output dir, taken AFTER the ePubs were built).
 *
 * Read back and not derived, because only the ePub build knows what it wrote: an explicit
 * cover keeps its own type, a missing one falls back to a generated PNG, and a build without
 * `@resvg/resvg-js` writes none. A predicted name was wrong in each of those cases.
 */
export declare function attachCovers(volumes: EpubVolume[], files: string[], basePath?: string): EpubVolume[];
export interface VolumeNamingConfig {
    name?: string;
    basePath?: string;
    epub?: boolean | {
        title?: string;
        volumeTitles?: Record<string, string>;
        printCover?: boolean;
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
/**
 * The manifest URL a page should hand to Print so it can open with the cover, or
 * `undefined` when it should not: no ePub is built, or `epub.printCover` is `false`.
 */
export declare function printCoverManifestUrl(config: VolumeNamingConfig): string | undefined;
