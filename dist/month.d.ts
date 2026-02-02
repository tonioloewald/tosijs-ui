import { Component, PartsMap } from 'tosijs';
import { TosiSelect } from './select';
import { MenuItem } from './menu';
interface MonthParts extends PartsMap {
    jump: HTMLButtonElement;
    month: TosiSelect;
    year: TosiSelect;
    previous: HTMLButtonElement;
    next: HTMLButtonElement;
}
export declare class TosiMonth extends Component<MonthParts> {
    #private;
    static initAttributes: {
        month: number;
        year: number;
        weekStart: number;
        minDate: string;
        maxDate: string;
        selectable: boolean;
        multiple: boolean;
        range: boolean;
        disabled: boolean;
        readonly: boolean;
    };
    selectedDays: string[];
    value: string;
    get endDay(): number;
    get months(): {
        caption: string;
        value: string;
    }[];
    get years(): string[];
    monthChanged: (_year: number, _month: number) => void;
    gotoMonth(year: number, month: number): void;
    setMonth: () => void;
    get to(): string;
    set to(dateString: string);
    get from(): string;
    set from(dateString: string);
    clickDate: (event: Event) => void;
    keyDate: (event: KeyboardEvent) => void;
    selectDate: (dateString: string) => void;
    nextMonth: () => void;
    previousMonth: () => void;
    checkDay: (dateString: string) => boolean | "";
    dateMenuItem: (dateString: string, caption?: string) => MenuItem;
    jumpMenu: () => void;
    content: () => HTMLDivElement[];
    gotoDate(dateString: string): void;
    connectedCallback(): void;
    days: Array<{
        date: Date;
        selected: boolean;
        inRange: boolean;
        inMonth: boolean;
        isWeekend: boolean;
        isToday: boolean;
    }>;
    render(): void;
}
export declare const tosiMonth: import("tosijs").ElementCreator<TosiMonth>;
export {};
