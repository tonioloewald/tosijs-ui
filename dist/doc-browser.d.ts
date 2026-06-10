import { TestResults } from './live-example/test-harness';
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
    testStatus?: 'passed' | 'failed' | 'pending';
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
 */
export type DocRoutingMode = 'query' | 'path';
export interface DocBrowserOptions {
    docs: Doc[];
    context?: Record<string, any>;
    projectName?: string;
    projectLinks?: ProjectLinks;
    navSize?: number;
    minSize?: number;
    routing?: DocRoutingMode;
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
