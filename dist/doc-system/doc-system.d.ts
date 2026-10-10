import { ElementCreator } from 'tosijs';
import * as tosijsModule from 'tosijs';
import { Doc } from '../doc-browser.js';
import './css-var-editor.js';
export interface Ebook {
    title: string;
    url: string;
}
/**
 * The settings menu's "Download ePub" entry, or `null` for none.
 *
 * The item used to be unconditional and its URL derived from the project name, so a site
 * that built no ePub (the default) shipped a menu item that 404s, and a multi-volume site
 * or one with `basePath` or `epub.title` linked to a file nothing wrote (#218). The site
 * build now bakes the list of volumes it makes into the page config:
 *
 *   - a list   → one item (or, for several volumes, a submenu), at the build's own URLs
 *   - `[]`     → the site makes no ePub: no item
 *   - no key   → a hand-written `config` that predates this: the old derived link, unchanged
 */
export declare function epubMenuItem(ebooks: Ebook[] | undefined, legacyUrl: string): Record<string, unknown> | null;
export declare const CORPUS_ATTEMPTS = 3;
export declare function fetchCorpus(url: string): Promise<Doc[]>;
declare const TosiDocSystem_base: tosijsModule.WithAttributes<{
    docs: string;
    config: string;
    localized: string;
    routing: string;
    route: string;
    accent: string;
    background: string;
    text: string;
}>;
export declare class TosiDocSystem extends TosiDocSystem_base {
    static preferredTagName: string;
    context?: Record<string, any>;
    content: null;
    private corpus?;
    private browser?;
    private appliedRoute;
    private suppressed;
    private nestingDepth;
    private prefs;
    private stylesApplied;
    private applyStyles;
    private applyThemePrefs;
    private persistPrefs;
    private initPrefs;
    private initLocale;
    private settingsButton;
    private parseLinks;
    connectedCallback(): void;
    render(): void;
}
export declare const tosiDocSystem: ElementCreator<TosiDocSystem>;
export {};
