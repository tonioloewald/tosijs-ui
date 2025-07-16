import { Component as WebComponent, ElementCreator } from 'tosijs';
export declare class XinCarousel extends WebComponent {
    arrows: boolean;
    dots: boolean;
    loop: boolean;
    maxVisibleItems: number;
    snapDelay: number;
    snapDuration: number;
    auto: number;
    private lastAutoAdvance;
    private interval?;
    private autoAdvance;
    private _page;
    get page(): number;
    set page(p: number);
    get visibleItems(): HTMLElement[];
    get lastPage(): number;
    static styleSpec: {
        ':host': {
            display: string;
            flexDirection: string;
            position: string;
        };
        ':host svg': {
            height: string;
        };
        ':host button': {
            outline: string;
            border: string;
            boxShadow: string;
            background: string;
            color: string;
            padding: number;
        };
        ':host::part(back), :host::part(forward)': {
            position: string;
            top: number;
            bottom: number;
            width: string;
            zIndex: number;
        };
        ':host::part(back)': {
            left: number;
        };
        ':host::part(forward)': {
            right: number;
        };
        ':host button:disabled': {
            opacity: number;
            pointerEvents: string;
        };
        ':host button:hover': {
            color: string;
        };
        ':host button:active': {
            color: string;
        };
        ':host::part(pager)': {
            position: string;
        };
        ':host::part(scroller)': {
            overflow: string;
            position: string;
        };
        ':host::part(grid)': {
            display: string;
            justifyItems: string;
        };
        ':host *::-webkit-scrollbar, *::-webkit-scrollbar-thumb': {
            display: string;
        };
        ':host .dot': {
            background: string;
            borderRadius: string;
            height: string;
            width: string;
            transition: string;
        };
        ':host .dot:not(.current):hover': {
            background: string;
            height: string;
            width: string;
            margin: string;
        };
        ':host .dot:not(.current):active': {
            background: string;
        };
        ':host .dot.current': {
            background: string;
        };
        ':host::part(progress)': {
            display: string;
            gap: string;
            justifyContent: string;
            padding: string;
        };
    };
    easing: (t: number) => number;
    indicateCurrent: () => void;
    snapPosition: () => void;
    back: () => void;
    forward: () => void;
    handleDotClick: (event: Event) => void;
    private snapTimer;
    private animationFrame;
    animateScroll(position: number, startingPosition?: number, timestamp?: number): void;
    content: () => HTMLDivElement[];
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    render(): void;
}
export declare const xinCarousel: ElementCreator<XinCarousel>;
