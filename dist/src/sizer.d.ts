import { Component as XinComponent, ElementCreator } from 'xinjs';
export declare class XinSizer extends XinComponent {
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
            stroke: any;
        };
    };
    content: any;
    get minSize(): {
        width: number;
        height: number;
    };
    resizeTarget: (event: Event) => void;
    connectedCallback(): void;
}
export declare const xinSizer: ElementCreator<XinSizer>;
