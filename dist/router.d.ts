import { Component, ElementCreator } from 'tosijs';
export interface RouteParams {
    [key: string]: string;
}
export interface RouteTarget {
    view?: string;
    component: (params: RouteParams) => HTMLElement;
}
export interface RouteDefinition {
    pattern: string;
    targets: RouteTarget[];
    fallback?: boolean;
}
export interface RouterOptions {
    hashRouting?: boolean;
}
export declare const router: {
    path: import("tosijs").BoxedScalar<string>;
    hash: import("tosijs").BoxedScalar<string>;
    pattern: import("tosijs").BoxedScalar<string>;
} & import("tosijs").XinProps<{
    path: string;
    hash: string;
    pattern: string;
}>;
export declare function getRouterParams(): RouteParams;
export declare function defineRoutes(routes: RouteDefinition[], options?: RouterOptions): void;
export declare function navigate(path: string): void;
export declare class TosiRouteView extends Component {
    static preferredTagName: string;
    static initAttributes: {
        name: string;
    };
    content: null;
    connectedCallback(): void;
    disconnectedCallback(): void;
}
export declare const tosiRouteView: ElementCreator<TosiRouteView>;
