import { ElementCreator } from 'xinjs';
export type IconData = {
    [key: string]: string;
};
export type SVGIconMap = {
    [key: string]: ElementCreator<SVGElement>;
};
