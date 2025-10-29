import { Component as WebComponent, ElementCreator } from 'tosijs';
export declare class CodeEditor extends WebComponent {
    private source;
    get value(): string;
    set value(text: string);
    mode: string;
    disabled: boolean;
    role: string;
    private _ace;
    private _editor;
    private _editorPromise;
    options: any;
    theme: string;
    get ace(): any;
    get editor(): any;
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
