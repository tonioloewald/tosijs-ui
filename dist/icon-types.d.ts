import { ElementCreator } from 'tosijs';
export type IconData = {
    [key: string]: string;
};
export type SVGIconMap = {
    [key: string]: ElementCreator<SVGElement>;
};
