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
    context: {
        [key: string]: any;
    };
    /**
     * Custom elements (tag names with a hyphen) that sanitized markdown may create, e.g.
     * `['tosi-icon']`. Empty by default: every other custom element is unwrapped, because a
     * component can run code or render raw HTML of its own. Irrelevant with `sanitize="off"`.
     */
    allowedElements: string[];
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
