import { Component } from 'tosijs';
import { TosiSelect } from './select.js';
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
/**
 * Apply localization to every attribute listed in the element's
 * data-tosi-localized JSON map. Exported so components that build shadow-DOM
 * subtrees with localized children can apply at construction time, since the
 * MutationObserver below does not descend into shadow roots.
 */
export declare function applyLocalized(el: Element): void;
export declare function initLocalization(localizedStrings: string): void;
export declare function localize(ref: string, values?: Record<string, unknown>): string;
/**
 * A whole-sentence key, falling back to joined fragments when nobody has translated it yet.
 *
 * The key is the sentence, which is the only form a translator can actually work with: word
 * order is not universal, so `localize('Sort') + ' ' + localize('Ascending')` can only ever
 * be right in languages that agree with English about which comes first. Measured against
 * this project's own shipped table, all five languages checked were wrong — German and
 * Korean reverse the pair, Japanese needs a particle and no space, Chinese needs no space,
 * French needs an article.
 *
 * The fallback is what makes adopting this **safe**: `localize` returns its input when there
 * is no row, so a table whose translations predate the sentence key keeps exactly the
 * behaviour it has today, and adding one row upgrades it. No translation is orphaned, so this
 * does not have to wait for a major.
 *
 *     localizePhrase('Sort Ascending', ['Sort#order', 'Ascending#sort-order'])
 */
export declare function localizePhrase(key: string, fragments: string[]): string;
export declare class TosiLocalePicker extends Component {
    static preferredTagName: string;
    static initAttributes: {
        hideCaption: boolean;
    };
    content: () => TosiSelect;
    render(): void;
}
/** @deprecated Use TosiLocalePicker instead */
export type LocalePicker = TosiLocalePicker;
/** @deprecated Use TosiLocalePicker instead */
export declare const LocalePicker: typeof TosiLocalePicker;
export declare const tosiLocalePicker: import("tosijs").ElementCreator<TosiLocalePicker>;
/** @deprecated Use tosiLocalePicker instead */
export declare const localePicker: import("tosijs").ElementCreator<TosiLocalePicker>;
interface AbstractLocalized {
    localeChanged: () => void;
    connectedCallback: () => void;
    disconnectedCallback: () => void;
}
export declare class TosiLocalized extends Component {
    static preferredTagName: string;
    static lightStyleSpec: {
        ':host': {
            pointerEvents: string;
        };
    };
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
/** @deprecated Use TosiLocalized instead */
export type XinLocalized = TosiLocalized;
/** @deprecated Use TosiLocalized instead */
export declare const XinLocalized: typeof TosiLocalized;
export declare const tosiLocalized: import("tosijs").ElementCreator<TosiLocalized>;
/** @deprecated Use tosiLocalized instead */
export declare const xinLocalized: import("tosijs").ElementCreator<TosiLocalized>;
export {};
