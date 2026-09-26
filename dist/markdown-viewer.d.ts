import { ElementCreator } from 'tosijs';
import { MarkedOptions } from 'marked';
declare const TosiMd_base: import("tosijs").WithAttributes<{
    src: string;
    elements: boolean;
    sanitize: string;
}>;
export declare class TosiMd extends TosiMd_base {
    #private;
    static preferredTagName: string;
    /**
    Whether the unsanitized-render warning has been shown on this page. It is shown once per page,
    not per element — fifty `<tosi-md>` would otherwise log fifty identical lines.
    */
    static warnedUnsanitized: boolean;
    context: {
        [key: string]: any;
    };
    value: string;
    content: null;
    options: MarkedOptions;
    connectedCallback(): void;
    didRender: (() => void) | (() => Promise<void>);
    render(): void;
}
/** @deprecated Use TosiMd instead */
export type MarkdownViewer = TosiMd;
/** @deprecated Use TosiMd instead */
export declare const MarkdownViewer: typeof TosiMd;
export declare const tosiMd: ElementCreator<TosiMd>;
/** @deprecated Use tosiMd instead */
export declare const markdownViewer: ElementCreator<TosiMd>;
/** @deprecated Use tosiMd instead */
export declare const xinMd: ElementCreator<TosiMd>;
export {};
