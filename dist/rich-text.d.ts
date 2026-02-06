import { Component as WebComponent, ElementCreator, PartsMap } from 'tosijs';
import { TosiSelect } from './select';
export declare function blockStyle(options?: {
    caption: string;
    tagType: string;
}[]): TosiSelect;
export declare function spacer(width?: string): HTMLSpanElement;
export declare function elastic(width?: string): HTMLSpanElement;
export declare function commandButton(title: string, dataCommand: string, icon: SVGElement): HTMLButtonElement;
export declare const richTextWidgets: () => HTMLSpanElement[];
interface EditorParts extends PartsMap {
    toolbar: HTMLElement;
    doc: HTMLElement;
    content: HTMLElement;
}
export declare class RichText extends WebComponent<EditorParts> {
    static formAssociated: boolean;
    static initAttributes: {
        widgets: "none" | "minimal" | "default";
        name: string;
        required: boolean;
    };
    private isInitialized;
    private savedValue;
    formDisabledCallback(disabled: boolean): void;
    formResetCallback(): void;
    private _value;
    get value(): string;
    set value(docHtml: string);
    blockElement(elt: Node): Element | undefined;
    get selectedBlocks(): any[];
    get selectedText(): string;
    selectionChange: (event: Event, editor: RichText) => void;
    private _updatingBlockStyle;
    handleSelectChange: (event: Event) => void;
    handleButtonClick: (event: Event) => void;
    content: any[];
    doCommand(command?: string): void;
    updateBlockStyle(): void;
    private hasContent;
    handleInput: () => void;
    private updateValidity;
    connectedCallback(): void;
    render(): void;
}
/** @deprecated Use RichText instead */
export declare const XinWord: typeof RichText;
export declare const tosiRichText: ElementCreator<RichText>;
/** @deprecated Use tosiRichText instead (tag is now <tosi-rich-text>) */
export declare const richText: ElementCreator<RichText>;
export {};
