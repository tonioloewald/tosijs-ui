import type { SiteConfig } from './site-config';
export interface BuildPdfOptions {
    /** corpus path; default config.docsJson ?? 'demo/docs.json' */
    docsJson?: string;
    /** output .pdf path; default `${outputDir}/${slug(name)}.pdf` */
    output?: string;
    /** book title; default config.name */
    title?: string;
    /** override the whole stylesheet */
    css?: string;
    /** extra CSS appended to the default (ignored if `css` is set) */
    extraCss?: string;
    /** page format, default 'A4' */
    format?: 'A4' | 'Letter';
}
/** Build a PDF of the doc site from the extracted corpus. Returns the path. */
export declare function buildPdf(config: SiteConfig, opts?: BuildPdfOptions): Promise<string>;
