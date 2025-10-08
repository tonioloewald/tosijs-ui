import { Component as WebComponent, ElementCreator } from 'xinjs';
type B3dCallback = ((element: B3d, BABYLON: any) => void) | ((element: B3d, BABYLON: any) => Promise<void>);
interface B3dUIOptions {
    snippetId?: string;
    jsonUrl?: string;
    data?: any;
    size?: number;
}
type MeshProcessCallback = (meshes: any[]) => void;
export declare class B3d extends WebComponent {
    babylonReady: Promise<any>;
    BABYLON?: any;
    static styleSpec: {
        ':host': {
            display: string;
            position: string;
        };
        ':host canvas': {
            width: string;
            height: string;
        };
        ':host .babylonVRicon': {
            height: number;
            width: number;
            backgroundColor: string;
            filter: string;
            backgroundImage: string;
            backgroundPosition: string;
            backgroundRepeat: string;
            border: string;
            borderRadius: number;
            borderStyle: string;
            outline: string;
            transition: string;
        };
        ':host .babylonVRicon:hover': {
            transform: string;
        };
    };
    content: HTMLCanvasElement;
    constructor();
    scene: any;
    engine: any;
    sceneCreated: B3dCallback;
    update: B3dCallback;
    private _update;
    onResize(): void;
    loadScene: (path: string, file: string, processCallback?: MeshProcessCallback) => Promise<void>;
    loadUI: (options: B3dUIOptions) => Promise<any>;
    connectedCallback(): void;
}
export declare const b3d: ElementCreator<B3d>;
export {};
