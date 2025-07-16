import { Component, ElementCreator } from 'tosijs';
import { MarkedOptions } from 'marked';
export declare class MarkdownViewer extends Component {
    src: string;
    value: string;
    content: null;
    elements: boolean;
    context: {
        [key: string]: any;
    };
    options: MarkedOptions;
    constructor();
    connectedCallback(): void;
    didRender: (() => void) | (() => Promise<void>);
    render(): void;
}
export declare const markdownViewer: ElementCreator<MarkdownViewer>;
