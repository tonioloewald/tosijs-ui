import { ElementCreator, ElementPart, Component as WebComponent } from 'tosijs';
import { SVGIconMap } from './icon-types';
export declare const defineIcons: (newIcons: {
    [key: string]: string;
}) => void;
export declare const svg2DataUrl: (icon: Element, fill?: string, stroke?: string, strokeWidth?: number) => string;
export interface IconRule {
    prefix: string | RegExp;
    apply: (baseName: string, match: RegExpMatchArray | string, parts: ElementPart[]) => Element | string | null;
}
export declare const iconRules: IconRule[];
export declare const icons: SVGIconMap;
export declare class SvgIcon extends WebComponent {
    static preferredTagName: string;
    static lightStyleSpec: {
        ':host': {
            '--tosi-icon-size': string;
            '--tosi-icon-stroke-width': string;
            '--tosi-icon-stroke-linejoin': string;
            '--tosi-icon-stroke-linecap': string;
            '--tosi-icon-fill': string;
            display: string;
            stroke: string;
            strokeWidth: string;
            strokeLinejoin: string;
            strokeLinecap: string;
            fill: string;
            height: string;
        };
        ':host svg, :host .tosi-icon-composite': {
            height: string;
        };
    };
    static initAttributes: {
        icon: string;
        size: number;
        fill: string;
        stroke: string;
        strokeWidth: number;
    };
    render(): void;
}
export declare const svgIcon: ElementCreator<SvgIcon>;
