import { Component } from 'tosijs';
export declare class AbTest extends Component {
    static set conditions(context: {
        [key: string]: any;
    });
    static initAttributes: {
        condition: string;
        not: boolean;
    };
    static instances: Set<AbTest>;
    connectedCallback(): void;
    disconnectedCallback(): void;
    render(): void;
}
export declare const abTest: import("tosijs").ElementCreator<AbTest>;
