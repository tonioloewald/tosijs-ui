import { Component } from 'tosijs';
export declare const digest: (s: string, method?: string) => Promise<string>;
export declare const isBreached: (password: string) => Promise<boolean>;
export declare class TosiPasswordStrength extends Component {
    static preferredTagName: string;
    static lightStyleSpec: {
        ':host': {
            display: string;
            flexDirection: string;
            gap: string;
            position: string;
        };
        ':host xin-slot': {
            display: string;
        };
        ':host [part="meter"]': {
            display: string;
            position: string;
            height: string;
            background: string;
            borderRadius: string;
            boxShadow: string;
        };
        ':host [part="level"]': {
            height: string;
            content: string;
            display: string;
            width: number;
            transition: string;
            background: string;
            margin: string;
            borderRadius: string;
        };
        ':host [part="description"]': {
            position: string;
            inset: string;
            color: string;
            height: string;
            lineHeight: string;
            textAlign: string;
        };
    };
    static initAttributes: {
        minLength: number;
        goodLength: number;
        indicatorColors: string;
    };
    descriptionColors: string;
    issues: {
        tooShort: boolean;
        short: boolean;
        noUpper: boolean;
        noLower: boolean;
        noNumber: boolean;
        noSpecial: boolean;
    };
    issueDescriptions: {
        tooShort: string;
        short: string;
        noUpper: string;
        noLower: string;
        noNumber: string;
        noSpecial: string;
    };
    value: number;
    strengthDescriptions: string[];
    strength(password: string): number;
    isBreached(): Promise<boolean>;
    updateIndicator: (password: string) => void;
    update: (event: Event) => void;
    content: () => any[];
    render(): void;
}
/** @deprecated Use TosiPasswordStrength instead */
export type XinPasswordStrength = TosiPasswordStrength;
/** @deprecated Use TosiPasswordStrength instead */
export declare const XinPasswordStrength: typeof TosiPasswordStrength;
export declare const tosiPasswordStrength: import("tosijs").ElementCreator<TosiPasswordStrength>;
/** @deprecated Use tosiPasswordStrength instead */
export declare const xinPasswordStrength: import("tosijs").ElementCreator<TosiPasswordStrength>;
