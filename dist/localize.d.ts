import { Component } from 'tosijs';
import { XinSelect } from './select';
interface TranslationMap {
    [key: string]: string[];
}
export declare const i18n: {
    locale: import("tosijs").BoxedScalar<string>;
    locales: import("tosijs").BoxedScalar<string>[] & import("tosijs").XinProps<string[]> & import("tosijs").BoxedArrayProps<string>;
    languages: import("tosijs").BoxedScalar<string>[] & import("tosijs").XinProps<string[]> & import("tosijs").BoxedArrayProps<string>;
    emoji: import("tosijs").BoxedScalar<string>[] & import("tosijs").XinProps<string[]> & import("tosijs").BoxedArrayProps<string>;
    stringMap: {
        [x: string]: import("tosijs").BoxedScalar<string>[] & import("tosijs").XinProps<string[]> & import("tosijs").BoxedArrayProps<string>;
    } & import("tosijs").XinProps<TranslationMap>;
    localeOptions: ({
        icon: any;
        caption: import("tosijs").BoxedScalar<string>;
        value: import("tosijs").BoxedScalar<string>;
    } & import("tosijs").XinProps<{
        icon: any;
        caption: string;
        value: string;
    }>)[] & import("tosijs").XinProps<{
        icon: any;
        caption: string;
        value: string;
    }[]> & import("tosijs").BoxedArrayProps<{
        icon: any;
        caption: string;
        value: string;
    }>;
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
    static initAttributes: {
        hideCaption: boolean;
    };
    content: () => XinSelect;
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
    static initAttributes: {
        refString: string;
    };
    contents: () => any;
    connectedCallback(): void;
    disconnectedCallback(): void;
    localeChanged(): void;
    render(): void;
}
export declare const xinLocalized: import("tosijs").ElementCreator<XinLocalized>;
export {};
