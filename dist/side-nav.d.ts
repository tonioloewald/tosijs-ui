import { Component, ElementCreator } from 'tosijs';
type NavState = 'normal' | 'compact/nav' | 'compact/content';
export declare class TosiSidenav extends Component {
    static preferredTagName: string;
    static initAttributes: {
        minSize: number;
        navSize: number;
        compact: boolean;
        contentVisible: boolean;
    };
    value: NavState;
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
    onResize: () => void;
    private observer;
    connectedCallback(): void;
    disconnectedCallback(): void;
    render(): void;
}
/** @deprecated Use TosiSidenav instead */
export declare const SideNav: typeof TosiSidenav;
export declare const tosiSidenav: ElementCreator<TosiSidenav>;
/** @deprecated Use tosiSidenav instead */
export declare const sideNav: ElementCreator<TosiSidenav>;
/** @deprecated Use tosiSidenav instead */
export declare const xinSidenav: ElementCreator<TosiSidenav>;
export {};
