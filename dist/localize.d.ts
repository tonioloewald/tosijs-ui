import { Component } from 'tosijs';
import { XinSelect } from './select';
interface TranslationMap {
    [key: string]: string[];
}
export declare const i18n: {
    locale: String & import("tosijs").XinProps<string>;
    locales: (String & import("tosijs").XinProps<string>)[] & import("tosijs").XinProps<string[]>;
    languages: (String & import("tosijs").XinProps<string>)[] & import("tosijs").XinProps<string[]>;
    emoji: (String & import("tosijs").XinProps<string>)[] & import("tosijs").XinProps<string[]>;
    stringMap: {
        [x: string]: (String & import("tosijs").XinProps<string>)[] & import("tosijs").XinProps<string[]>;
    } & import("tosijs").XinProps<TranslationMap>;
    localeOptions: ({
        icon: any;
        caption: String & import("tosijs").XinProps<string>;
        value: String & import("tosijs").XinProps<string>;
    } & import("tosijs").XinProps<{
        icon: any;
        caption: string;
        value: string;
    }>)[] & import("tosijs").XinProps<{
        icon: any;
        caption: string;
        value: string;
    }[]>;
} & import("tosijs").XinProps<{
    locale: string;
    locales: string[];
    languages: string[];
    emoji: string[];
    stringMap: TranslationMap;
    localeOptions: {
        icon: any;
        caption: string;
        value: string;
    }[];
}>;
export declare const setLocale: (language: string) => void;
export declare const updateLocalized: () => void;
export declare function initLocalization(localizedStrings: string): void;
export declare function localize(ref: string): string;
export declare class LocalePicker extends Component {
    hideCaption: boolean;
    content: () => XinSelect;
    constructor();
    render(): void;
}
export declare const localePicker: import("tosijs").ElementCreator<LocalePicker>;
interface AbstractLocalized {
    localeChanged: () => void;
    connectedCallback: () => void;
    disconnectedCallback: () => void;
}
export declare class XinLocalized extends Component {
    static allInstances: Set<AbstractLocalized>;
    contents: () => any;
    refString: string;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    localeChanged(): void;
    render(): void;
}
export declare const xinLocalized: import("tosijs").ElementCreator<XinLocalized>;
export {};
