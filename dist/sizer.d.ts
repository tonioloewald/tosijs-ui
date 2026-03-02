import { Component as XinComponent, ElementCreator } from 'tosijs';
export declare class TosiSizer extends XinComponent {
    target?: HTMLElement | null;
    static styleSpec: {
        ':host': {
            _resizeIconFill: string;
            display: string;
            position: string;
            bottom: number;
            right: number;
            padding: number;
            width: number;
            height: number;
            opacity: number;
            transition: string;
        };
        ':host(:hover)': {
            opacity: number;
        };
        ':host svg': {
            width: number;
            height: number;
            stroke: string;
        };
    };
    content: SVGElement;
    get minSize(): {
        width: number;
        height: number;
    };
    resizeTarget: (event: Event) => void;
    connectedCallback(): void;
}
/** @deprecated Use TosiSizer instead */
export declare const XinSizer: typeof TosiSizer;
export declare const tosiSizer: ElementCreator<TosiSizer>;
/** @deprecated Use tosiSizer instead */
export declare const xinSizer: ElementCreator<TosiSizer>;
