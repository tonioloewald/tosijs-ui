export interface TosiButton {
    index: number;
    pressed: boolean;
    value: number;
}
/** @deprecated Use TosiButton instead */
export type XinButton = TosiButton;
export interface TosiGamepad {
    id: string;
    axes: number[];
    buttons: {
        [key: number]: number;
    };
}
/** @deprecated Use TosiGamepad instead */
export type XinGamepad = TosiGamepad;
export declare function gamepadState(): {
    id: string;
    axes: readonly number[];
    buttons: {
        [key: number]: number;
    };
}[];
export declare function gamepadText(): string;
export interface TosiXRControllerComponentState {
    pressed: boolean;
    touched: boolean;
    value: number;
    axes: {
        x: number;
        y: number;
    };
}
/** @deprecated Use TosiXRControllerComponentState instead */
export type XinXRControllerComponentState = TosiXRControllerComponentState;
export interface TosiXRControllerState {
    [key: string]: TosiXRControllerComponentState;
}
/** @deprecated Use TosiXRControllerState instead */
export type XinXRControllerState = TosiXRControllerState;
export interface TosiXRControllerMap {
    [key: string]: TosiXRControllerState;
}
/** @deprecated Use TosiXRControllerMap instead */
export type XinXRControllerMap = TosiXRControllerMap;
export declare function xrControllers(xrHelper: any): {
    [key: string]: TosiXRControllerState;
};
export declare function xrControllersText(controllers?: TosiXRControllerMap): string;
