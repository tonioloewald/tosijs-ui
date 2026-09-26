import { ElementCreator } from 'tosijs';
import { Doc } from '../doc-browser.js';
import './css-var-editor.js';
export declare const CORPUS_ATTEMPTS = 3;
export declare function fetchCorpus(url: string): Promise<Doc[]>;
declare const TosiDocSystem_base: import("tosijs").WithAttributes<{
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
