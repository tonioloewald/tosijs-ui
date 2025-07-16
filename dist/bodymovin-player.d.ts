import { Component as WebComponent, ElementCreator } from 'tosijs';
export interface LottieConfig {
    container?: HTMLElement | ShadowRoot;
    renderer: 'svg' | 'canvas' | 'html';
    loop: boolean;
    autoplay: boolean;
    animationData?: string;
    path?: string;
    [key: string]: any;
}
export declare class BodymovinPlayer extends WebComponent {
    content: null;
    src: string;
    json: string;
    config: LottieConfig;
    static bodymovinAvailable?: Promise<any>;
    animation: any;
    static styleSpec: {
        ':host': {
            width: number;
            height: number;
            display: string;
        };
    };
    private _loading;
    get loading(): boolean;
    constructor();
    private readonly doneLoading;
    private readonly load;
    render(): void;
}
export declare const bodymovinPlayer: ElementCreator<BodymovinPlayer>;
