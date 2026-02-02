import { Component as WebComponent, ElementCreator } from 'tosijs';
export declare class MapBox extends WebComponent {
    static initAttributes: {
        coords: string;
        token: string;
        mapStyle: string;
    };
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
    render(): void;
}
export declare const mapBox: ElementCreator<MapBox>;
