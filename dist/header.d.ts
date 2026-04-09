import { Component, ElementCreator, PartsMap } from 'tosijs';
export interface HeaderProjectLinks {
    github?: string;
    npm?: string;
    discord?: string;
    blog?: string;
    tosijs?: string;
    [key: string]: string | undefined;
}
interface ThemePrefs {
    theme: {
        value: string;
    };
    highContrast: {
        value: boolean;
    };
    locale?: {
        value: string;
    };
}
interface HeaderParts extends PartsMap {
    title: HTMLAnchorElement;
    settings: HTMLButtonElement;
}
export declare class TosiHeader extends Component<HeaderParts> {
    static preferredTagName: string;
    static initAttributes: {
        projectName: string;
        showLocale: boolean;
        showTheme: boolean;
    };
    projectLinks: HeaderProjectLinks;
    themePrefs: ThemePrefs | null;
    menuItems: any[];
    static shadowStyleSpec: {
        ':host': {
            display: string;
            alignItems: string;
            padding: string;
            background: string;
            color: string;
            lineHeight: string;
            gap: string;
        };
        ':host .elastic': {
            flex: string;
        };
        ':host a, :host button.iconic': {
            color: string;
            textDecoration: string;
            background: string;
            border: string;
            cursor: string;
            display: string;
            alignItems: string;
            padding: string;
            opacity: string;
        };
        ':host a:hover, :host button.iconic:hover': {
            opacity: string;
        };
        ':host h2': {
            margin: string;
            fontSize: string;
            fontWeight: string;
        };
        ':host .title-link': {
            display: string;
            alignItems: string;
            gap: string;
            borderBottom: string;
        };
    };
    content: () => HTMLElement[];
    showSettingsMenu(event: Event): void;
}
export declare const tosiHeader: ElementCreator<TosiHeader>;
export {};
