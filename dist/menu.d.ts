import { Component, PartsMap } from 'tosijs';
import { FloatPosition } from './pop-float';
import { SvgIcon } from './icons';
export type ActionCallback = () => void | Promise<void>;
export interface MenuAction {
    caption: string;
    shortcut?: string;
    checked?: () => boolean;
    enabled?: () => boolean;
    action: ActionCallback | string;
    icon?: string | Element;
}
export interface SubMenu {
    caption: string;
    checked?: () => boolean;
    enabled?: () => boolean;
    menuItems: MenuItem[];
    icon?: string | Element;
}
export type MenuSeparator = null;
export type MenuItem = MenuAction | SubMenu | MenuSeparator;
export declare const createMenuAction: (item: MenuAction, options: PopMenuOptions) => HTMLElement;
export declare const createSubMenu: (item: SubMenu, options: PopMenuOptions) => HTMLElement;
export declare const createMenuItem: (item: MenuItem, options: PopMenuOptions) => HTMLElement;
export declare const menu: (options: PopMenuOptions) => HTMLDivElement;
interface PoppedMenu {
    target: HTMLElement;
    menu: HTMLElement;
}
export declare const removeLastMenu: (depth?: number) => PoppedMenu | undefined;
export interface PopMenuOptions {
    target: HTMLElement;
    menuItems: MenuItem[];
    width?: string | number;
    position?: FloatPosition;
    submenuDepth?: number;
    submenuOffset?: {
        x: number;
        y: number;
    };
    localized?: boolean;
    showChecked?: boolean;
}
export declare const popMenu: (options: PopMenuOptions) => void;
interface XinMenuParts extends PartsMap {
    trigger: HTMLButtonElement;
    icon: SvgIcon;
}
export declare class XinMenu extends Component<XinMenuParts> {
    menuItems: MenuItem[];
    menuWidth: string;
    localized: boolean;
    showMenu: (event: Event) => void;
    content: () => HTMLButtonElement;
    handleShortcut: (event: KeyboardEvent) => Promise<void>;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
}
export declare const xinMenu: import("tosijs").ElementCreator<XinMenu>;
export {};
