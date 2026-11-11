import { ElementCreator, XinStyleSheet } from 'tosijs';
import { ThemeData, ThemeGenerator, ThemeMode, ThemeVariable } from './theme-data.js';
export declare const THEME_MODE_LABELS: Record<ThemeMode, string>;
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
    /** the theme being edited */
    get value(): ThemeData;
    set value(theme: ThemeData);
    /** turns the base values into each mode's variables */
    get generator(): ThemeGenerator;
    set generator(generator: ThemeGenerator);
    /** the variables offered beyond the base colours */
    get variables(): ThemeVariable[];
    set variables(variables: ThemeVariable[]);
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
    private previewMode;
    private restoreMode;
    private builtFor;
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
