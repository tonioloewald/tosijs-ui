import { TestResults } from './live-example/test-harness.js';
import { type ExamplePolicy } from './doc-system/example-policy.js';
export declare const hasTestBlock: (text: string | undefined, policy?: ExamplePolicy) => boolean;
/**
 * The failure recorded for a page the runner counted but got NO results from.
 *
 * "We didn't look" and "we looked and it's fine" must not produce the same output. A page
 * with test blocks that finishes, or times out, without reporting a single test is a page
 * whose tests did not run — under load this was most of the corpus once (7 of 19 pages
 * recorded, lane green). It is now a failure with a name, so the count of results always
 * equals the count of pages and the lane cannot pass over a gap.
 */
export declare const noResultsFailure: (reason: string) => PageTestResults;
export interface PageTestResults {
    passed: boolean;
    tests: TestResults['tests'];
    totalPassed: number;
    totalFailed: number;
}
export interface DocTestResults {
    passed: number;
    failed: number;
    pages: Record<string, PageTestResults>;
    /**
     * How many pages the runner INTENDED to run, and how many reported back.
     *
     * `passed + failed > 0` only proves the runner started. It cannot tell a full corpus from
     * a corpus that silently lost half its pages — and a page-selection defect that ran 16 of
     * 17 pages is exactly the false green fixed in 1.14.0, so this is a live failure mode
     * rather than a hypothetical one. A consumer gate should assert
     * `pagesTested === pagesWithTests && pagesWithTests > 0`.
     *
     * Framed by tosijs-platform in #142: "we didn't look" and "we looked and it's fine" must
     * not produce the same output. Reporting a total is how a skipped run stays comfortable.
     */
    pagesWithTests: number;
    pagesTested: number;
}
declare global {
    interface Window {
        __docTestResults?: Promise<DocTestResults>;
    }
}
export interface Doc {
    text: string;
    title: string;
    filename: string;
    path: string;
    pin?: string;
    hidden?: boolean;
    /** `'full-width'` drops the reading measure; `'full-screen'` also puts the nav away. */
    layout?: 'full-width' | 'full-screen';
    testStatus?: 'passed' | 'failed' | 'pending';
    bakes?: Array<[string, {
        dialect: string;
        js: string;
    }]>;
}
export interface ProjectLinks {
    github?: string;
    npm?: string;
    discord?: string;
    blog?: string;
    tosijs?: string;
    bundle?: string;
    cdn?: string;
    [key: string]: string | undefined;
}
/** A configurable link for the header bar or the overflow menu. */
export interface LinkItem {
    href: string;
    label: string;
    /** optional icon name (from `icons`); falls back to the text label if unknown */
    icon?: string;
}
/**
 * How the doc browser maps docs to URLs.
 * - 'query' (default, legacy): single-page app, links are `?filename`.
 * - 'path': clean per-page URLs (`/slug/`), for the static pre-rendered site
 *   driven by <tosi-doc-system>. Requires a real page to exist at each path.
 * - 'memory': self-contained — navigation never touches window.history/location
 *   and the instance ignores the page URL. For an embedded/nested browser (a
 *   live demo, a floating help panel). Drive it via `initialRoute` +
 *   `onRouteChange`, and the returned element's `.navigate(slug)` method.
 */
export type DocRoutingMode = 'query' | 'path' | 'memory';
export interface DocBrowserOptions {
    docs: Doc[];
    context?: Record<string, any>;
    projectName?: string;
    projectLinks?: ProjectLinks;
    /**
     * The brand mark shown left of the site title in the header. One of:
     * - the name of a known icon (from `icons`), e.g. `'tosiUi'`
     * - an image URL / path / data: URI (rendered as an `<img>`)
     * - a raw inline `<svg …>…</svg>` string
     * Omit to fall back to the tosijs-ui logo when `projectLinks.tosijs` is set,
     * or to no mark at all otherwise. Size and spacing are CSS-tunable via
     * `--tosi-logo-mark-size` (default 32px) and `--tosi-logo-mark-gap` (default
     * 10px) on the `.logo-mark` element.
     */
    logo?: string;
    navSize?: number;
    minSize?: number;
    routing?: DocRoutingMode;
    /**
     * Memory routing only: the slug to show first (instead of the page URL / first
     * doc). Lets a host mount the browser already pointed at a specific doc.
     */
    initialRoute?: string;
    /**
     * Memory routing only: called with the current doc's slug whenever in-app
     * navigation happens, so a host can reflect it (e.g. to an attribute).
     */
    onRouteChange?: (slug: string) => void;
    /**
     * Header-bar links. When provided, these replace the legacy `projectLinks` icon
     * set in the header (each renders as an icon if `icon` names a known icon, else
     * as its text label). `projectLinks` is still used for the logo and view-source.
     */
    navbarLinks?: LinkItem[];
    /**
     * Pre-rendered content for the landing doc to ADOPT in place (true hydration).
     * When provided, the current page's already-rendered markdown is left untouched
     * — only live examples are wired up — instead of being re-rendered from text.
     * Used by <tosi-doc-system>. Subsequent navigation renders from doc text.
     */
    contentElement?: HTMLElement;
}
export declare function createDocBrowser(options: DocBrowserOptions): HTMLElement;
