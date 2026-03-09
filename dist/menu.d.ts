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
    acceptsDrop?: string[];
    dropAction?: (dataTransfer: DataTransfer) => void;
}
export type MenuItemsProvider = MenuItem[] | (() => MenuItem[]);
export interface SubMenu {
    caption: string;
    checked?: () => boolean;
    enabled?: () => boolean;
    menuItems: MenuItemsProvider;
    icon?: string | Element;
    acceptsDrop?: string[];
    dropAction?: (dataTransfer: DataTransfer) => void;
}
export type MenuSeparator = null;
export type MenuItem = MenuAction | SubMenu | MenuSeparator;
export declare const resolveMenuItems: (provider: MenuItemsProvider) => MenuItem[];
export declare const filterForDrop: (items: MenuItem[], dataTypes: readonly string[], hideDisabled?: boolean) => MenuItem[];
export declare const filterForClick: (items: MenuItem[], hideDisabled?: boolean) => MenuItem[];
export declare const createMenuAction: (item: MenuAction, options: PopMenuOptions) => HTMLElement;
export declare const createDropMenuItem: (item: MenuAction, options: PopMenuOptions) => HTMLElement;
export declare const createSubMenu: (item: SubMenu, options: PopMenuOptions) => HTMLElement;
export declare const createMenuItem: (item: MenuItem, options: PopMenuOptions) => HTMLElement;
export declare const menu: (options: PopMenuOptions) => HTMLDivElement;
interface PoppedMenu {
    target: HTMLElement;
    menu: HTMLElement;
    onClose?: () => void;
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
    hideDisabled?: boolean;
    onClose?: () => void;
    role?: 'menu' | 'listbox';
    _dropMode?: boolean;
    _dataTypes?: readonly string[];
    disclosureDelay?: number;
}
export interface PopDropMenuOptions extends Omit<PopMenuOptions, '_dropMode' | '_dataTypes'> {
    dataTypes: readonly string[];
}
export declare const popMenu: (options: PopMenuOptions) => void;
export declare const popDropMenu: (options: PopDropMenuOptions) => void;
interface ShortcutMatch {
    action: MenuAction;
    path: SubMenu[];
}
export declare function findShortcutAction(items: MenuItem[], event: KeyboardEvent, path?: SubMenu[]): ShortcutMatch | undefined;
interface TosiMenuParts extends PartsMap {
    trigger: HTMLButtonElement;
    icon: SvgIcon;
}
export declare class TosiMenu extends Component<TosiMenuParts> {
    static preferredTagName: string;
    static lightStyleSpec: {
        ':host': {
            display: string;
        };
        ':host button > xin-slot': {
            display: string;
            alignItems: string;
            gap: string;
        };
    };
    static initAttributes: {
        menuWidth: string;
        localized: boolean;
        icon: string;
        acceptsDrop: string;
        disclosureDelay: number;
        hideDisabled: boolean;
    };
    menuItems: MenuItem[];
    dropAction: ((dataTransfer: DataTransfer) => void) | null;
    private _dragMatches;
    private _matchesDrag;
    showMenu: (event: Event) => void;
    handleDragEnter: (event: DragEvent) => void;
    handleDragOver: (event: DragEvent) => void;
    handleDragLeave: (event: DragEvent) => void;
    handleDrop: (event: DragEvent) => void;
    content: () => HTMLButtonElement;
    handleShortcut: (event: KeyboardEvent) => Promise<void>;
    private findMenuItemByCaption;
    private animateShortcut;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
}
export declare const tosiMenu: import("tosijs").ElementCreator<TosiMenu>;
/** @deprecated Use tosiMenu instead */
export declare const xinMenu: import("tosijs").ElementCreator<TosiMenu>;
/** @deprecated Use TosiMenu instead */
export declare const XinMenu: typeof TosiMenu;
export {};
