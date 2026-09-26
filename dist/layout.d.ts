import { ElementCreator, ElementPart } from 'tosijs';
declare const TosiRow_base: import("tosijs").WithAttributes<{
    gap: string;
    wrap: boolean;
    align: string;
    justify: string;
}>;
export declare class TosiRow extends TosiRow_base {
    static preferredTagName: string;
    content: HTMLSlotElement[];
    static shadowStyleSpec: {
        ':host': {
            display: string;
            flexDirection: string;
            gap: string;
            alignItems: string;
            justifyContent: string;
        };
    };
    render(): void;
}
export declare const tosiRow: ElementCreator<TosiRow>;
declare const TosiColumn_base: import("tosijs").WithAttributes<{
    gap: string;
    wrap: boolean;
    align: string;
    justify: string;
}>;
export declare class TosiColumn extends TosiColumn_base {
    static preferredTagName: string;
    content: HTMLSlotElement[];
    static shadowStyleSpec: {
        ':host': {
            display: string;
            flexDirection: string;
            gap: string;
            alignItems: string;
            justifyContent: string;
        };
    };
    render(): void;
}
export declare const tosiColumn: ElementCreator<TosiColumn>;
declare const TosiGrid_base: import("tosijs").WithAttributes<{
    columns: string;
    rows: string;
    gap: string;
}>;
export declare class TosiGrid extends TosiGrid_base {
    static preferredTagName: string;
    content: HTMLSlotElement[];
    static shadowStyleSpec: {
        ':host': {
            display: string;
            gridTemplateColumns: string;
            gridTemplateRows: string;
            gap: string;
        };
    };
    render(): void;
}
export declare const tosiGrid: ElementCreator<TosiGrid>;
export declare const elastic: (...parts: ElementPart<HTMLSpanElement>[]) => HTMLSpanElement;
export declare const spacer: (...parts: ElementPart<HTMLSpanElement>[]) => HTMLSpanElement;
export {};
