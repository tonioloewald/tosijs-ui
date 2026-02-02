import { Component as WebComponent, ElementCreator, PartsMap } from 'tosijs';
import { XinSelect } from './select';
export declare function blockStyle(options?: {
    caption: string;
    tagType: string;
}[]): XinSelect;
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
    static initAttributes: {
        widgets: "none" | "minimal" | "default";
    };
    private isInitialized;
    get value(): string;
    set value(docHtml: string);
    blockElement(elt: Node): Element | undefined;
    get selectedBlocks(): any[];
    get selectedText(): string;
    selectionChange: (event: Event, editor: RichText) => void;
    handleSelectChange: (event: Event) => void;
    handleButtonClick: (event: Event) => void;
    content: any[];
    doCommand(command?: string): void;
    updateBlockStyle(): void;
    connectedCallback(): void;
    render(): void;
}
export declare const richText: ElementCreator<RichText>;
export {};
