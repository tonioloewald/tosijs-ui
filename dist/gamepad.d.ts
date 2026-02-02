export interface XinButton {
    index: number;
    pressed: boolean;
    value: number;
}
export interface XinGamepad {
    id: string;
    axes: number[];
    buttons: {
        [key: number]: number;
    };
}
export declare function gamepadState(): {
    id: string;
    axes: readonly number[];
    buttons: {
        [key: number]: number;
    };
}[];
export declare function gamepadText(): string;
export interface XinXRControllerComponentState {
    pressed: boolean;
    axes?: number[];
}
export interface XinXRControllerState {
    [key: string]: XinXRControllerComponentState;
}
export interface XinXRControllerMap {
    [key: string]: XinXRControllerState;
}
export declare function xrControllers(xrHelper: any): {
    [key: string]: XinXRControllerState;
};
export declare function xrControllersText(controllers?: XinXRControllerMap): string;
