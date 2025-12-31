export interface Doc {
    text: string;
    title: string;
    filename: string;
    path: string;
    pin?: string;
    hidden?: boolean;
}
export interface ProjectLinks {
    github?: string;
    npm?: string;
    discord?: string;
    blog?: string;
    tosijs?: string;
    bundle?: string;
    cdn?: string;
    [key: string]: string | undefined;
}
export interface DocBrowserOptions {
    docs: Doc[];
    context?: Record<string, any>;
    projectName?: string;
    projectLinks?: ProjectLinks;
    navSize?: number;
    minSize?: number;
}
export declare function createDocBrowser(options: DocBrowserOptions): HTMLElement;
