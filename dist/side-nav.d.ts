import { Component, ElementCreator } from 'xinjs';
type NavState = 'normal' | 'compact/nav' | 'compact/content';
export declare class SideNav extends Component {
    minSize: number;
    navSize: number;
    compact: boolean;
    contentVisible: boolean;
    value: NavState;
    content: HTMLSlotElement[];
    static styleSpec: {
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
    constructor();
    render(): void;
}
export declare const sideNav: ElementCreator<SideNav>;
export {};
