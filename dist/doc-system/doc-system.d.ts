import { Component, ElementCreator } from 'tosijs';
import './css-var-editor';
export declare class TosiDocSystem extends Component {
    static preferredTagName: string;
    static initAttributes: {
        docs: string;
        config: string;
        localized: string;
        routing: string;
        route: string;
        accent: string;
        background: string;
        text: string;
    };
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
