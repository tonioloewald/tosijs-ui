import { Component } from 'tosijs';
interface NotificationSpec {
    message: string;
    type?: 'success' | 'info' | 'log' | 'warn' | 'error' | 'progress';
    icon?: SVGElement | string;
    duration?: number;
    progress?: () => number;
    close?: () => void;
    color?: string;
}
type callback = () => void;
export declare class TosiNotification extends Component {
    static preferredTagName: string;
    private static singleton?;
    static shadowStyleSpec: {
        ':host': {
            _notificationSpacing: number;
            _notificationWidth: number;
            _notificationPadding: string;
            _notificationBg: string;
            _notificationAccentColor: string;
            _notificationTextColor: string;
            _notificationIconSize: string;
            _notificationButtonSize: number;
            _notificationMaxLines: string;
            _notificationBorderWidth: string;
            _notificationBorderRadius: string;
            position: string;
            left: number;
            right: number;
            bottom: number;
            paddingBottom: string;
            width: string;
            display: string;
            flexDirection: string;
            margin: string;
            gap: string;
            boxShadow: string;
            color: string;
        };
        ':host .note': {
            display: string;
            background: string;
            padding: string;
            gridTemplateColumns: string;
            gap: string;
            alignItems: string;
            borderRadius: string;
            boxShadow: string;
            borderColor: string;
            borderWidth: string;
            borderStyle: string;
            animation: string;
            zIndex: number;
        };
        ':host .note.stacked': {
            position: string;
            left: number;
            right: number;
            pointerEvents: string;
        };
        ':host .note.buried': {
            visibility: string;
        };
        ':host .dismiss-all': {
            alignSelf: string;
            position: string;
            zIndex: number;
            font: string;
            fontSize: string;
            color: string;
            background: string;
            border: string;
            borderRadius: number;
            padding: string;
            boxShadow: string;
            cursor: string;
        };
        ':host .dismiss-all[hidden]': {
            display: string;
        };
        ':host .note button': {
            display: string;
            lineHeight: string;
            padding: number;
            margin: number;
            height: string;
            width: string;
            background: string;
            alignItems: string;
            justifyContent: string;
            boxShadow: string;
            border: string;
            position: string;
        };
        ':host .note button:hover svg': {
            stroke: string;
        };
        ':host .note button:active svg': {
            borderRadius: number;
            stroke: string;
            background: string;
            padding: string;
        };
        ':host .note svg': {
            height: string;
            width: string;
            pointerEvents: string;
            color: string;
        };
        ':host .message': {
            display: string;
            flexDirection: string;
            alignItems: string;
            gap: string;
            minWidth: number;
        };
        ':host .text': {
            display: string;
            WebkitBoxOrient: string;
            WebkitLineClamp: string;
            overflow: string;
            overflowWrap: string;
            maxWidth: string;
        };
        ':host .note.closing': {
            opacity: number;
            zIndex: number;
            pointerEvents: string;
            transition: string;
        };
        '@keyframes tosi-note-in': {
            from: {
                opacity: string;
            };
            to: {
                opacity: string;
            };
        };
    };
    /** How many notes are shown in full; older ones stack behind them. */
    static maxVisible: number;
    /**
     * How far (px) each stacked note peeks out below the one in front of it. Notes beyond the last
     * offset are hidden.
     */
    static stackOffsets: number[];
    private static closers;
    private static leaving;
    static removeNote(note: HTMLElement): void;
    /**
     * Apply `change`, lay out, and animate every note (and the Dismiss all button) from where it
     * was to where it now is. A note coming out of hiding fades in.
     */
    moveTo(change: () => void): void;
    /** Close every open notification, as if the user had closed each one. */
    static dismissAll(): void;
    /**
     * Lay out the open notes. They are in the DOM oldest first, which `column-reverse` puts at
     * the bottom. Up to `maxVisible` sit in a column. Past that, the newest `maxVisible - 1` stay
     * in the column, the oldest stays at the bottom as the front of a stack, and everything in
     * between recedes behind it.
     */
    layout(): void;
    static post(spec: NotificationSpec | string): callback;
    content: null;
}
/** @deprecated Use TosiNotification instead */
export type XinNotification = TosiNotification;
/** @deprecated Use TosiNotification instead */
export declare const XinNotification: typeof TosiNotification;
export declare const tosiNotification: import("tosijs").ElementCreator<TosiNotification>;
/** @deprecated Use tosiNotification instead */
export declare const xinNotification: import("tosijs").ElementCreator<TosiNotification>;
export declare function postNotification(spec: NotificationSpec | string): callback;
export {};
