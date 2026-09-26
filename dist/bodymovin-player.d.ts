import { ElementCreator } from 'tosijs';
export interface LottieConfig {
    container?: HTMLElement | ShadowRoot;
    renderer: 'svg' | 'canvas' | 'html';
    loop: boolean;
    autoplay: boolean;
    animationData?: string;
    path?: string;
    [key: string]: any;
}
declare const BodymovinPlayer_base: import("tosijs").WithAttributes<{
    src: string;
    json: string;
}>;
export declare class BodymovinPlayer extends BodymovinPlayer_base {
    static preferredTagName: string;
    content: null;
    config: LottieConfig;
    static bodymovinAvailable?: Promise<any>;
    animation: any;
    static shadowStyleSpec: {
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
export {};
