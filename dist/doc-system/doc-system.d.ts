import { Component, ElementCreator } from 'tosijs';
export declare class TosiDocSystem extends Component {
    static preferredTagName: string;
    static initAttributes: {
        docs: string;
        config: string;
        accent: string;
        background: string;
        text: string;
    };
    context?: Record<string, any>;
    content: null;
    private corpus?;
    private browser?;
    private stylesApplied;
    private applyStyles;
    connectedCallback(): void;
    render(): void;
}
export declare const tosiDocSystem: ElementCreator<TosiDocSystem>;
