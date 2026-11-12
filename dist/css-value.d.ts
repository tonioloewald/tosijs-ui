import { ElementCreator, XinStyleSheet } from 'tosijs';
import { type CssValueForm, type CssValueKind } from './css-value-forms.js';
export interface CssValueVariable {
    /** without the dashes: `brand-color` */
    name: string;
    label?: string;
    /** the variable's kind; forms refer only to variables of a compatible kind */
    kind: string;
}
declare const TosiCssValue_base: import("tosijs").WithAttributes<{
    /** what the value is: `color`, `length`, `number` or `text` */
    kind: CssValueKind;
    /** no Auto: a value must be given */
    noAuto: boolean;
}>;
export declare class TosiCssValue extends TosiCssValue_base {
    static preferredTagName: string;
    static shadowStyleSpec: XinStyleSheet;
    private _value;
    private _variables;
    /** the value, as CSS; `''` is Auto */
    get value(): string;
    set value(value: string);
    /** what Auto comes to, shown while the value is not set */
    private _computed;
    get computed(): string;
    set computed(computed: string);
    /** what a form may refer to */
    get variables(): CssValueVariable[];
    set variables(variables: CssValueVariable[]);
    /**
     * where values resolve, for the swatch and what a length comes to: a theme scoped to an
     * element (`.glass-demo`) means nothing outside it. The element itself by default.
     */
    scope: Element | null;
    /** the form the value has, read from the value */
    get form(): CssValueForm;
    content: () => HTMLSpanElement[];
    /** The forms this element offers. */
    private forms;
    /** The variables a form of this kind may refer to: same kind (lengths and numbers mix). */
    private operands;
    private operandSelect;
    /** A number with a short caption before it (`L+`) and its full name as the label. */
    private numberInput;
    /** The controls for a form, built when the form (not its numbers) changes. */
    private controlsFor;
    /** The form the controls describe. */
    private readControls;
    /** What a newly picked form starts from. */
    private seed;
    private commit;
    private handleChange;
    private handleInput;
    private syncFrom;
    private probe;
    /** What a colour comes to here, as `#rrggbb` or `#rrggbbaa`. */
    private resolveColor;
    private resolveLength;
    private builtFor;
    private listening;
    render(): void;
    /** Put the form's numbers and choices in its controls, leaving the focused one alone. */
    private showValues;
}
export declare const tosiCssValue: ElementCreator<TosiCssValue>;
export {};
