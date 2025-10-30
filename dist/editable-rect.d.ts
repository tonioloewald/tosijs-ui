import { Component } from 'tosijs';
interface Locks {
    left: boolean;
    right: boolean;
    top: boolean;
    bottom: boolean;
}
export declare class EditableRect extends Component {
    static angleSize: number;
    static gridSize: number;
    static snapAngle: boolean;
    static snapToGrid: boolean;
    static styleSpec: {
        ':host': {
            '--handle-bg': string;
            '--handle-color': string;
            '--handle-hover-bg': string;
            '--handle-hover-color': string;
            '--handle-size': string;
            '--handle-padding': string;
        };
        ':host ::slotted(*)': {
            position: string;
        };
        ':host > :not(style,slot)': {
            boxSizing: string;
            content: string;
            position: string;
            display: string;
            height: string;
            width: string;
            padding: string;
            '--text-color': string;
            background: string;
        };
        ':host > .drag-size': {
            top: number;
            bottom: number;
            left: number;
            right: number;
            height: string;
            width: string;
            background: string;
            cursor: string;
        };
        ':host > [part="rotate"]': {
            transform: string;
        };
        ':host > [locked] > svg:first-child, :host > :not([locked]) > svg+svg': {
            display: string;
        };
        ':host .icon-unlock': {
            opacity: number;
        };
        ':host svg': {
            pointerEvents: string;
        };
        ':host > *:hover': {
            '--text-color': string;
            background: string;
        };
    };
    static snappedCoords(event: PointerEvent, coords: number[]): number[];
    static snappedAngle(event: PointerEvent, a: number): number;
    get locked(): Locks;
    set locked(locks: Locks);
    get coords(): {
        top: number;
        left: number;
        bottom: number;
        right: number;
    };
    get left(): number;
    get width(): number;
    get right(): number;
    get top(): number;
    get height(): number;
    get bottom(): number;
    triggerChange: () => void;
    adjustPosition: (event: Event) => void;
    resize: (event: Event) => void;
    adjustSize: (event: Event) => void;
    get rect(): DOMRect;
    get center(): {
        x: number;
        y: number;
    };
    get element(): HTMLElement;
    adjustRotation: (event: Event) => void;
    toggleLock: (event: Event) => void;
    content: () => (HTMLDivElement | HTMLSlotElement)[];
    constructor();
    connectedCallback(): void;
    render(): void;
}
export declare const editableRect: import("tosijs").ElementCreator<EditableRect>;
export {};
