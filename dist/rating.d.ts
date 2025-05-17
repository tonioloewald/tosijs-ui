import { Component, ElementCreator } from 'xinjs';
export declare class XinRating extends Component {
    iconSize: number;
    min: 0 | 1;
    max: number;
    step: number;
    value: number | null;
    icon: string;
    color: string;
    emptyColor: string;
    emptyStrokeWidth: number;
    readonly: boolean;
    hollow: boolean;
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
            _textColor: string;
        };
        ':host [part="empty"]:not(.hollow)': {
            fill: any;
        };
        ':host .hollow': {
            fill: string;
            stroke: any;
            strokeWidth: any;
        };
        ':host::part(filled)': {
            position: string;
            left: number;
            fill: any;
            stroke: any;
            strokeWidth: any;
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
    constructor();
    content: () => any;
    displayValue(value: number | null): void;
    update: (event: Event) => void;
    handleKey: (event: KeyboardEvent) => void;
    connectedCallback(): void;
    private _renderedIcon;
    render(): void;
}
export declare const xinRating: ElementCreator<XinRating>;
