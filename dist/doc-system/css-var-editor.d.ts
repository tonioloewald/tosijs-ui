import { Component as WebComponent, ElementCreator } from 'tosijs';
import { TosiForm } from '../form';
declare class TosiCssVarEditor extends WebComponent {
    static preferredTagName: string;
    static initAttributes: {
        elementSelector: string;
        targetSelector: string;
    };
    content: () => (HTMLHeadingElement | TosiForm)[];
    private retryTimer?;
    private retries;
    loadVars: () => void;
    update: () => void;
    connectedCallback(): void;
    disconnectedCallback(): void;
}
export declare const tosiCssVarEditor: ElementCreator<TosiCssVarEditor>;
export {};
