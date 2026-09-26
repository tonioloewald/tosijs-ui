import { ElementCreator } from 'tosijs';
import { TosiForm } from '../form.js';
declare const TosiCssVarEditor_base: import("tosijs").WithAttributes<{
    elementSelector: string;
    targetSelector: string;
}>;
declare class TosiCssVarEditor extends TosiCssVarEditor_base {
    static preferredTagName: string;
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
