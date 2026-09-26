import { ElementCreator } from 'tosijs';
declare const MapBox_base: import("tosijs").WithAttributes<{
    coords: string;
    token: string;
    mapStyle: string;
    name: string;
}>;
export declare class MapBox extends MapBox_base {
    static preferredTagName: string;
    static formAssociated: boolean;
    value: string;
    formDisabledCallback(disabled: boolean): void;
    formResetCallback(): void;
    content: HTMLDivElement;
    get map(): any;
    static mapboxCSSAvailable: Promise<void>;
    static mapboxAvailable?: Promise<any>;
    private _map;
    private _mapPending;
    static shadowStyleSpec: {
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
export {};
