import { Component as WebComponent, ElementCreator } from 'tosijs';
export declare class MapBox extends WebComponent {
    static formAssociated: boolean;
    static initAttributes: {
        coords: string;
        token: string;
        mapStyle: string;
        name: string;
    };
    value: string;
    formDisabledCallback(disabled: boolean): void;
    formResetCallback(): void;
    content: HTMLDivElement;
    get map(): any;
    static mapboxCSSAvailable: Promise<void>;
    static mapboxAvailable?: Promise<any>;
    private _map;
    static styleSpec: {
        ':host': {
            display: string;
            position: string;
            width: string;
            height: string;
            textAlign: string;
        };
    };
    constructor();
    connectedCallback(): void;
    private _lastCoords;
    private _lastStyle;
    render(): void;
}
export declare const mapBox: ElementCreator<MapBox>;
