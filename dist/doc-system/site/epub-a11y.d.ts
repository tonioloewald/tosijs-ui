/** The `dcterms:conformsTo` value EPUB Accessibility 1.1 defines for WCAG 2.2 AA. */
export declare const EPUB_A11Y_CONFORMANCE = "EPUB Accessibility 1.1 - WCAG 2.2 Level AA";
export interface EpubAccessibilityOptions {
    /** `schema:accessibilitySummary`; one is generated when omitted */
    summary?: string;
    /** `schema:accessibilityHazard` values; default `['none']` */
    hazards?: string[];
    /** `a11y:certifiedBy`: who certified the book, when someone did */
    certifiedBy?: string;
}
export interface EpubAccessibilityFacts {
    /** the book shows images */
    hasImages: boolean;
    /** every image has alt text or a caption */
    imagesDescribed: boolean;
    /** a checker verified the book; only then is conformance claimed */
    verified: boolean;
}
/** The `<meta>` lines for the package document's `<metadata>`, indented to sit in it. */
export declare function accessibilityMetadata(facts: EpubAccessibilityFacts, opts?: EpubAccessibilityOptions): string;
export type AceResult = {
    ran: true;
    passed: boolean;
    failures: string[];
} | {
    ran: false;
    reason: string;
};
/**
 * Check a built `.epub` with DAISY Ace (`@daisy/ace`), resolved from the project's own
 * `node_modules/.bin`. It is the adopter's: never a dependency of tosijs-ui.
 */
export declare function runAce(epubFile: string, projectDir?: string): Promise<AceResult>;
/** Pass or fail, and the failing checks' titles, from an Ace `report.json`. */
export declare function aceVerdict(report: any): {
    passed: boolean;
    failures: string[];
};
