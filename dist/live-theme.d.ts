import { Component, ElementCreator, PartsMap } from 'tosijs';
export declare const liveTheme: {
    accent: import("tosijs").BoxedScalar<string>;
    background: import("tosijs").BoxedScalar<string>;
    text: import("tosijs").BoxedScalar<string>;
    dark: import("tosijs").BoxedScalar<boolean>;
} & import("tosijs").XinProps<{
    accent: string;
    background: string;
    text: string;
    dark: boolean;
}>;
/**
 * Start applying the live theme to the document.
 * Called automatically when a TosiThemeEditor is connected.
 */
export declare function enableLiveTheme(): void;
/**
 * Stop applying the live theme.
 */
export declare function disableLiveTheme(): void;
interface ThemeEditorParts extends PartsMap {
    accent: HTMLInputElement;
    background: HTMLInputElement;
    text: HTMLInputElement;
    dark: HTMLInputElement;
    preview: HTMLDivElement;
    reset: HTMLButtonElement;
}
export declare class TosiThemeEditor extends Component<ThemeEditorParts> {
    static preferredTagName: string;
    static shadowStyleSpec: {
        ':host': {
            display: string;
            fontFamily: string;
            fontSize: string;
            lineHeight: string;
            background: string;
            color: string;
            padding: string;
            borderRadius: string;
            boxShadow: string;
            maxWidth: string;
        };
        ':host .field': {
            display: string;
            alignItems: string;
            gap: string;
            marginBottom: string;
        };
        ':host label': {
            flex: string;
            fontWeight: string;
        };
        ':host input[type="color"]': {
            width: string;
            height: string;
            border: string;
            borderRadius: string;
            cursor: string;
            padding: string;
        };
        ':host input[type="checkbox"]': {
            width: string;
            height: string;
            cursor: string;
        };
        ':host .preview': {
            marginTop: string;
            padding: string;
            borderRadius: string;
            transition: string;
        };
        ':host .preview-button': {
            border: string;
            padding: string;
            borderRadius: string;
            cursor: string;
            fontFamily: string;
            fontSize: string;
        };
        ':host .actions': {
            marginTop: string;
            display: string;
            gap: string;
        };
        ':host .actions button': {
            flex: string;
            padding: string;
            border: string;
            borderRadius: string;
            background: string;
            color: string;
            cursor: string;
            fontFamily: string;
            fontSize: string;
        };
        ':host .actions button:hover': {
            background: string;
        };
    };
    content: () => HTMLDivElement[];
    connectedCallback(): void;
}
export declare const tosiThemeEditor: ElementCreator<TosiThemeEditor>;
export {};
