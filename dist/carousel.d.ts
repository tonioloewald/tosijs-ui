import { Component as WebComponent, ElementCreator } from 'tosijs';
export declare class TosiCarousel extends WebComponent {
    static preferredTagName: string;
    static initAttributes: {
        dots: boolean;
        arrows: boolean;
        maxVisibleItems: number;
        snapDuration: number;
        snapDelay: number;
        loop: boolean;
        auto: number;
    };
    private lastAutoAdvance;
    private interval?;
    private autoAdvance;
    private _page;
    get page(): number;
    set page(p: number);
    get visibleItems(): HTMLElement[];
    get lastPage(): number;
    static shadowStyleSpec: {
        ':host': {
            _carouselIconSize: number;
            _carouselButtonColor: string;
            _carouselButtonHoverColor: string;
            _carouselButtonActiveColor: string;
            _carouseButtonWidth: number;
            _carouselDotCurrentColor: string;
            _carouselDotSize: number;
            _carouselDotSpacing: string;
            _carouselProgressPadding: number;
            _carouselDotTransition: string;
            display: string;
            flexDirection: string;
            position: string;
        };
        ':host:focus': {
            outline: string;
            boxShadow: string;
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
    connectedCallback(): void;
    disconnectedCallback(): void;
    render(): void;
}
/** @deprecated Use TosiCarousel instead */
export type XinCarousel = TosiCarousel;
/** @deprecated Use TosiCarousel instead */
export declare const XinCarousel: typeof TosiCarousel;
export declare const tosiCarousel: ElementCreator<TosiCarousel>;
/** @deprecated Use tosiCarousel instead */
export declare const xinCarousel: ElementCreator<TosiCarousel>;
