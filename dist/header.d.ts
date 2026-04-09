import { Component, ElementCreator, elements } from 'tosijs';
export declare class TosiHeader extends Component {
    static preferredTagName: string;
    static shadowStyleSpec: {
        ':host': {
            display: string;
            alignItems: string;
            padding: string;
            background: string;
            lineHeight: string;
            gap: string;
        };
        '::slotted(*)': {
            display: string;
            alignItems: string;
        };
    };
    content: ({ slot }: typeof elements) => HTMLSlotElement[];
}
export declare const tosiHeader: ElementCreator<TosiHeader>;
export interface HeaderLinks {
    github?: string;
    npm?: string;
    discord?: string;
    blog?: string;
    tosijs?: string;
    [key: string]: string | undefined;
}
export declare class TosiHeaderLinks extends Component {
    static preferredTagName: string;
    static lightStyleSpec: {
        ':host': {
            display: string;
            alignItems: string;
            gap: string;
        };
        ':host a': {
            color: string;
            textDecoration: string;
            display: string;
            alignItems: string;
            padding: string;
            opacity: string;
            cursor: string;
        };
        ':host a:hover': {
            opacity: string;
        };
    };
    links: HeaderLinks;
    content: null;
    render(): void;
}
export declare const tosiHeaderLinks: ElementCreator<TosiHeaderLinks>;
