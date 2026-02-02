type TrackerCallback = (dx: number, dy: number, event: PointerEvent) => boolean | undefined;
export declare const trackDrag: (event: PointerEvent, callback: TrackerCallback, cursor?: string) => void;
export declare const findHighestZ: (selector?: string) => number;
export declare const bringToFront: (element: HTMLElement, selector?: string) => void;
export {};
