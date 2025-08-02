import { Component, PartsMap } from 'tosijs';
import { XinSelect } from './select';
interface MonthParts extends PartsMap {
    month: XinSelect;
    year: XinSelect;
    previous: HTMLButtonElement;
    next: HTMLButtonElement;
}
export declare class TosiMonth extends Component<MonthParts> {
    month: number;
    year: number;
    minDate: string;
    maxDate: string;
    startDay: number;
    selectable: boolean;
    multiple: boolean;
    range: boolean;
    disabled: boolean;
    readonly: boolean;
    value: {
        from: string;
        to: string;
        days: Set<string>;
    };
    get endDay(): number;
    get months(): {
        caption: string;
        value: string;
    }[];
    get years(): string[];
    setMonth: () => void;
    setYear: () => void;
    selectDate: (event: Event) => void;
    nextMonth: () => void;
    previousMonth: () => void;
    checkDay: (dateString: string) => boolean | "";
    content: () => HTMLDivElement[];
    constructor();
    days: Array<{
        date: Date;
        selected: boolean;
        inRange: boolean;
        inMonth: boolean;
        isToday: boolean;
    }>;
    render(): void;
}
export declare const tosiMonth: import("tosijs").ElementCreator<Component<PartsMap>>;
export {};
