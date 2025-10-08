import { Component } from 'xinjs';
import { XinSelect } from './select';
interface TranslationMap {
    [key: string]: string[];
}
interface I18nConfig {
    locale: string;
    locales: string[];
    languages: string[];
    emoji: string[];
    stringMap: TranslationMap;
    localeOptions: Array<{
        icon: HTMLElement;
        caption: string;
        value: string;
    }>;
}
export declare const i18n: I18nConfig;
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
export declare const localePicker: import("xinjs").ElementCreator<Component<import("xinjs").PartsMap>>;
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
export declare const xinLocalized: import("xinjs").ElementCreator<Component<import("xinjs").PartsMap>>;
export {};
