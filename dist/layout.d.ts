import { Component, ElementCreator, ElementPart } from 'tosijs';
export declare class TosiRow extends Component {
    static preferredTagName: string;
    static initAttributes: {
        gap: string;
        wrap: boolean;
        align: string;
        justify: string;
    };
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
export declare class TosiColumn extends Component {
    static preferredTagName: string;
    static initAttributes: {
        gap: string;
        wrap: boolean;
        align: string;
        justify: string;
    };
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
export declare class TosiGrid extends Component {
    static preferredTagName: string;
    static initAttributes: {
        columns: string;
        rows: string;
        gap: string;
    };
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
