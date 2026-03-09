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
            maxHeight: string;
            overflow: string;
            boxShadow: string;
        };
        ':host *': {
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
            transition: string;
            transitionProperty: string;
            zIndex: number;
        };
        ':host .note .icon': {
            stroke: string;
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
        };
        ':host .message': {
            display: string;
            flexDirection: string;
            alignItems: string;
            gap: string;
        };
        ':host .note.closing': {
            opacity: number;
            zIndex: number;
        };
    };
    static removeNote(note: HTMLElement): void;
    static post(spec: NotificationSpec | string): callback;
    content: null;
}
/** @deprecated Use TosiNotification instead */
export declare const XinNotification: typeof TosiNotification;
export declare const tosiNotification: import("tosijs").ElementCreator<TosiNotification>;
/** @deprecated Use tosiNotification instead */
export declare const xinNotification: import("tosijs").ElementCreator<TosiNotification>;
export declare function postNotification(spec: NotificationSpec | string): callback;
export {};
