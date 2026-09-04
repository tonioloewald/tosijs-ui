import { Component as WebComponent, ElementCreator } from 'tosijs';
type B3dCallback = ((element: B3d, BABYLON: any) => void) | ((element: B3d, BABYLON: any) => Promise<void>);
interface B3dUIOptions {
    snippetId?: string;
    jsonUrl?: string;
    data?: any;
    size?: number;
}
type MeshProcessCallback = (meshes: any[]) => void;
/**
 * @deprecated Use [`tosijs-3d`](https://www.npmjs.com/package/tosijs-3d) instead.
 *
 * It is a much better library, and maintaining both is duplicated effort spent against
 * the weaker one. This is a thin Babylon wrapper that grew inside a general-purpose UI
 * library; `tosijs-3d` is a project actually about 3D and XR, and `tosijs-3d` grew out of
 * this component, so migration is mostly a rename.
 *
 * Still exported and still works. It will be removed in a future major.
 */
export declare class B3d extends WebComponent {
    static preferredTagName: string;
    static initAttributes: {
        src: string;
        clearColor: string;
        fov: number;
        heroLight: boolean;
    };
    babylonReady: Promise<any>;
    BABYLON?: any;
    static shadowStyleSpec: {
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
    handleResize(): void;
    loadScene: (path: string, file: string, processCallback?: MeshProcessCallback) => Promise<void>;
    loadUI: (options: B3dUIOptions) => Promise<any>;
    connectedCallback(): void;
}
/**
 * @deprecated Use [`tosijs-3d`](https://www.npmjs.com/package/tosijs-3d) instead.
 * See {@link B3d} for why.
 */
export declare const b3d: ElementCreator<B3d>;
export {};
