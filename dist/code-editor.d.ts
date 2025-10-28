import { Component as WebComponent, ElementCreator } from 'tosijs';
export declare class CodeEditor extends WebComponent {
    private source;
    static ace: () => Promise<any>;
    get value(): string;
    set value(text: string);
    mode: string;
    disabled: boolean;
    role: string;
    get editor(): any;
    private _editor;
    private _editorPromise;
    options: any;
    theme: string;
    static styleSpec: {
        ':host': {
            display: string;
            position: string;
            width: string;
            height: string;
        };
    };
    constructor();
    onResize(): void;
    connectedCallback(): void;
    render(): void;
}
export declare const codeEditor: ElementCreator<CodeEditor>;
