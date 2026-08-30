import { Component, ElementCreator } from 'tosijs';
type NavState = 'normal' | 'compact/nav' | 'compact/content';
export declare class TosiSidenav extends Component {
    static preferredTagName: string;
    static initAttributes: {
        minSize: number;
        navSize: number;
        compact: boolean;
        contentVisible: boolean;
        alwaysCompact: boolean;
    };
    value: NavState;
    /**
     * Is the navigation on screen — and set it to put it there, or take it away.
     *
     * The one control a "show me the navigation" button needs: read it, flip it, done. No caller
     * should have to know that hiding the nav on a wide screen means forcing compact mode while
     * on a narrow one it only means showing the content, which is exactly the kind of knowledge
     * that ends up copy-pasted into every consumer and then drifts.
     */
    get navVisible(): boolean;
    set navVisible(visible: boolean);
    content: HTMLSlotElement[];
    static shadowStyleSpec: {
        ':host': {
            display: string;
            gridTemplateColumns: string;
            gridTemplateRows: string;
            position: string;
            margin: string;
            transition: string;
        };
        ':host slot': {
            position: string;
        };
        ':host slot:not([name])': {
            display: string;
        };
        ':host slot[name="nav"]': {
            display: string;
        };
    };
    handleResize: () => void;
    private observer;
    connectedCallback(): void;
    /**
     * Let transitions run again, once the layout has been settled at least once.
     *
     * Deferred a frame so the correcting values are painted BEFORE the transition property comes
     * back — releasing in the same task would let that first correction animate, which is the
     * thing being prevented.
     */
    private releaseTransition;
    private transitionSuppressed;
    disconnectedCallback(): void;
    render(): void;
}
/** @deprecated Use TosiSidenav instead */
export type SideNav = TosiSidenav;
/** @deprecated Use TosiSidenav instead */
export declare const SideNav: typeof TosiSidenav;
export declare const tosiSidenav: ElementCreator<TosiSidenav>;
/** @deprecated Use tosiSidenav instead */
export declare const sideNav: ElementCreator<TosiSidenav>;
/** @deprecated Use tosiSidenav instead */
export declare const xinSidenav: ElementCreator<TosiSidenav>;
export {};
