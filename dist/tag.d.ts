import { ElementCreator } from 'tosijs';
declare const TosiTag_base: import("tosijs").WithAttributes<{
    caption: string;
    removeable: boolean;
}>;
export declare class TosiTag extends TosiTag_base {
    static preferredTagName: string;
    static lightStyleSpec: {
        ':host': {
            '--tag-close-button-color': string;
            '--tag-close-button-bg': string;
            '--tag-button-opacity': string;
            '--tag-button-hover-opacity': string;
            '--tag-bg': string;
            '--tag-text-color': string;
            display: string;
            borderRadius: string;
            color: string;
            background: string;
            padding: string;
            height: string;
            lineHeight: string;
        };
        ':host > [part="caption"]': {
            position: string;
            whiteSpace: string;
            overflow: string;
            flex: string;
            fontSize: string;
            color: string;
            textOverflow: string;
        };
        ':host [part="remove"]': {
            boxShadow: string;
            margin: string;
            padding: number;
            display: string;
            alignItems: string;
            alignSelf: string;
            justifyContent: string;
            height: string;
            width: string;
            color: string;
            background: string;
            borderRadius: string;
            opacity: string;
        };
        ':host [part="remove"]:hover': {
            background: string;
            opacity: string;
        };
    };
    removeCallback: (event: Event) => void;
    content: () => HTMLSpanElement[];
}
/** @deprecated Use TosiTag instead */
export type XinTag = TosiTag;
/** @deprecated Use TosiTag instead */
export declare const XinTag: typeof TosiTag;
export declare const tosiTag: ElementCreator<TosiTag>;
/** @deprecated Use tosiTag instead */
export declare const xinTag: ElementCreator<TosiTag>;
export {};
