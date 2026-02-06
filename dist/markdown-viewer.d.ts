import { Component, ElementCreator } from 'tosijs';
import { MarkedOptions } from 'marked';
export declare class MarkdownViewer extends Component {
    static initAttributes: {
        src: string;
        elements: boolean;
    };
    context: {
        [key: string]: any;
    };
    value: string;
    content: null;
    options: MarkedOptions;
    connectedCallback(): void;
    didRender: (() => void) | (() => Promise<void>);
    render(): void;
}
export declare const markdownViewer: ElementCreator<MarkdownViewer>;
/** @deprecated Use markdownViewer with tag 'tosi-md' instead */
export declare const xinMd: ElementCreator<MarkdownViewer>;
