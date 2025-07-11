import { Component as WebComponent, ElementCreator } from 'xinjs';
export declare class MapBox extends WebComponent {
    coords: string;
    content: any;
    get map(): any;
    mapStyle: string;
    token: string;
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
