import { Component, ElementCreator } from 'tosijs';
export declare class XinRating extends Component {
    static initAttributes: {
        max: number;
        min: 0 | 1;
        icon: string;
        step: number;
        ratingStroke: string;
        ratingFill: string;
        emptyStroke: string;
        emptyFill: string;
        readonly: boolean;
        iconSize: number;
        hollow: boolean;
    };
    value: number | null;
    static styleSpec: {
        ':host': {
            display: string;
            position: string;
            width: string;
        };
        ':host::part(container)': {
            position: string;
            display: string;
        };
        ':host::part(empty), :host::part(filled)': {
            height: string;
            whiteSpace: string;
            overflow: string;
        };
        ':host::part(empty)': {
            pointerEvents: string;
            _tosiIconFill: string;
            _tosiIconStroke: string;
        };
        ':host::part(filled)': {
            position: string;
            left: number;
            _tosiIconFill: string;
            _tosiIconStroke: string;
        };
        ':host svg': {
            transform: string;
            pointerEvents: string;
            transition: string;
        };
        ':host svg:hover': {
            transform: string;
        };
        ':host svg:active': {
            transform: string;
        };
    };
    content: () => HTMLSpanElement;
    displayValue(value: number | null): void;
    update: (event: Event) => void;
    handleKey: (event: KeyboardEvent) => void;
    connectedCallback(): void;
    private _renderedIcon;
    render(): void;
}
export declare const xinRating: ElementCreator<XinRating>;
