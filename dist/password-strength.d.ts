import { Component } from 'tosijs';
export declare const digest: (s: string, method?: string) => Promise<string>;
export declare const isBreached: (password: string) => Promise<boolean>;
export declare class XinPasswordStrength extends Component {
    minLength: number;
    goodLength: number;
    indicatorColors: string;
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
    constructor();
    strength(password: string): number;
    isBreached(): Promise<boolean>;
    updateIndicator: (password: string) => void;
    update: (event: Event) => void;
    content: () => any[];
    render(): void;
}
export declare const xinPasswordStrength: import("tosijs").ElementCreator<Component<import("tosijs").PartsMap>>;
