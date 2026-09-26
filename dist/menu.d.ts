import { ElementProps, PartsMap } from 'tosijs';
import { FloatPosition } from './pop-float.js';
import { SvgIcon } from './icons.js';
export type ActionCallback = () => void | Promise<void>;
export interface MenuAction {
    caption: string;
    shortcut?: string;
    checked?: () => boolean;
    enabled?: () => boolean;
    /**
     * What clicking does. **Optional**, because a drop-only item is a supported shape:
     * `acceptsDrop` + `dropAction` with no `action` is a target you can drag onto but not
     * click, and `filterForClick` branches on `action || menuItems` precisely so it drops
     * out of click menus. Required here until 1.14.0 — which made the documented shape
     * inexpressible, so four literals in `menu.test.ts` were cast through
     * `as unknown as MenuItem` rather than the type being corrected.
     *
     * An item with neither `action` nor `dropAction` does nothing; that is inert, not
     * unsafe, and no narrower type expresses "one of these two" without splitting the
     * union in a way every consumer would feel.
     */
    action?: ActionCallback | string;
    icon?: string | Element;
    tooltip?: string;
    properties?: ElementProps;
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
    tooltip?: string;
    properties?: ElementProps;
    acceptsDrop?: string[];
    dropAction?: (dataTransfer: DataTransfer) => void;
}
export type MenuSeparator = null;
export type MenuElement = () => HTMLElement;
export type MenuItem = MenuAction | SubMenu | MenuSeparator | MenuElement;
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
    /**
     * Extra class(es) for the popup element, so ONE component's menus can be themed without
     * restyling every menu on the page.
     *
     * The popup is created per-invocation and mounted in a body-level `<tosi-float>`, so it is
     * not a descendant of whatever opened it. Custom properties inherit down the DOM, which
     * means setting `--menu-item-height` on your component reaches nothing, and `:root` — the
     * only thing that does work — restyles every `tosi-menu` on the page, including the doc
     * system's own when your component is documented on a `tosijs-ui/site` site (#148).
     *
     * ```js
     * popMenu({ target, menuItems, menuClass: 'my-editor-menu' })
     * ```
     * ```css
     * .my-editor-menu { --menu-item-height: 30px; --menu-item-padding: 0 16px }
     * ```
     *
     * **Propagates to submenus**, which are separate popups — without that the theming would
     * apply at depth 0 and silently stop one level down.
     */
    menuClass?: string;
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
declare const TosiMenu_base: import("tosijs").WithAttributes<{
    menuWidth: string;
    localized: boolean;
    icon: string;
    acceptsDrop: string;
    disclosureDelay: number;
    hideDisabled: boolean;
    menuClass: string;
}>;
export declare class TosiMenu extends TosiMenu_base<TosiMenuParts> {
    static preferredTagName: string;
    static lightStyleSpec: {
        ':host': {
            display: string;
            minWidth: string;
            minHeight: string;
        };
        ':host button': {
            margin: number;
            padding: number;
            alignSelf: string;
            flex: string;
            textAlign: string;
        };
        ':host button > tosi-slot': {
            display: string;
            alignItems: string;
            gap: string;
        };
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
export type XinMenu = TosiMenu;
/** @deprecated Use TosiMenu instead */
export declare const XinMenu: typeof TosiMenu;
export {};
