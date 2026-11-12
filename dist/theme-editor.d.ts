import { ElementCreator, XinStyleSheet } from 'tosijs';
import { ThemeData, ThemeGenerator, ThemeMode, ThemeModeSpec, ThemeVariable } from './theme-data.js';
/** The units a length field offers. */
export declare const LENGTH_UNITS: string[];
/** `16px` → `{ amount: 16, unit: 'px' }`; null for anything else (`calc(…)`, a `var()`). */
export declare function splitLength(value: string): {
    amount: number;
    unit: string;
} | null;
declare const TosiThemeEditor_base: import("tosijs").WithAttributes<{
    /** the mode being edited */
    mode: ThemeMode;
    /** the id of the stylesheet the theme applies through; empty to apply nothing */
    applyId: string;
}>;
export declare class TosiThemeEditor extends TosiThemeEditor_base {
    static preferredTagName: string;
    /** show the page in the mode being edited (a property: a boolean attribute cannot default to true) */
    previewModes: boolean;
    private _value;
    private _generator;
    private _variables;
    private _selectors;
    private _modes;
    /** the theme being edited */
    get value(): ThemeData;
    set value(theme: ThemeData);
    /**
     * turns base values into each mode's variables; null when the page's CSS derives them (the
     * default for a pattern), `componentThemeGenerator` by default for a list
     */
    get generator(): ThemeGenerator | null;
    set generator(generator: ThemeGenerator | null);
    /**
     * what to edit: a list of variables, or a pattern (`'sf-*'`, a RegExp) matched against the
     * custom properties the page's stylesheets declare
     */
    get variables(): ThemeVariable[] | string | RegExp;
    set variables(variables: ThemeVariable[] | string | RegExp);
    private discovered;
    private labels;
    private discoveredFor;
    /** Look for the pattern's variables again (after the page's stylesheets change). */
    rediscover: () => void;
    /**
     * the theme's modes, the first being what the rest are made from: `THEME_MODE_SPECS` unless
     * set, narrowed to the modes `selectors` names when it names any
     */
    get modes(): ThemeModeSpec[];
    set modes(modes: ThemeModeSpec[] | null);
    /** Each mode's selector: the one in `selectors`, or the mode's own. */
    private modeSelectors;
    /** The mode being edited, or the first when `mode` names none of the theme's. */
    private currentMode;
    /** The element values resolve in: the first mode's selector's, or the root. */
    private scopeElement;
    /** The variables being edited: the list, or what the pattern found, labelled and grouped. */
    private editable;
    /** per-mode selectors for the applied stylesheet */
    get selectors(): Partial<Record<ThemeMode, string>>;
    set selectors(selectors: Partial<Record<ThemeMode, string>>);
    static shadowStyleSpec: XinStyleSheet;
    /** Change one value, apply the theme, and say so. */
    private set;
    private handleInput;
    private handleClick;
    private setFonts;
    /** Add the font pasted into the font field, or say why it was refused. */
    addFont: () => void;
    private handleFontKey;
    /** Put every mode and every value back to what the base colours generate. */
    resetAll: () => void;
    private handleLiveInput;
    content: () => (HTMLDivElement | HTMLDataListElement)[];
    private field;
    /** Families the page already uses, as suggestions. */
    private fontSuggestions;
    private previewing;
    private savedClasses?;
    /** Every class some mode sets: previewing a mode clears the others' first. */
    private modeClasses;
    private previewMode;
    private restoreMode;
    private builtFor;
    private valueVariables;
    private build;
    /** Show each field's current value, and whether it is tuned. */
    private refresh;
    private showLength;
    private listening;
    private listen;
    /** Apply the theme and show it in the fields. */
    update(): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    render(): void;
}
export declare const tosiThemeEditor: ElementCreator<TosiThemeEditor>;
export {};
