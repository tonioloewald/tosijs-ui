import { ElementCreator } from 'tosijs';
declare const SizeBreak_base: import("tosijs").WithAttributes<{
    minWidth: number;
    minHeight: number;
}>;
export declare class SizeBreak extends SizeBreak_base {
    static preferredTagName: string;
    value: 'normal' | 'small';
    content: HTMLSlotElement[];
    static shadowStyleSpec: {
        ':host': {
            display: string;
            position: string;
        };
    };
    handleResize: () => void;
    connectedCallback(): void;
    disconnectedCallback(): void;
}
export declare const sizeBreak: ElementCreator<SizeBreak>;
export {};
