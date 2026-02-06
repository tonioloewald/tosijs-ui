import { ElementCreator, Component as WebComponent } from 'tosijs';
import { SVGIconMap } from './icon-types';
export declare const defineIcons: (newIcons: {
    [key: string]: string;
}) => void;
export declare const svg2DataUrl: (svg: SVGElement, fill?: string, stroke?: string, strokeWidth?: number) => string;
export declare const icons: SVGIconMap;
export declare class SvgIcon extends WebComponent {
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
