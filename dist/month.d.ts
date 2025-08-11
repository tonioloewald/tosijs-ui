import { Component, PartsMap } from 'tosijs';
import { XinSelect } from './select';
import { MenuItem } from './menu';
interface MonthParts extends PartsMap {
    jump: HTMLButtonElement;
    month: XinSelect;
    year: XinSelect;
    previous: HTMLButtonElement;
    next: HTMLButtonElement;
}
export declare class TosiMonth extends Component<MonthParts> {
    #private;
    month: number;
    year: number;
    minDate: string;
    maxDate: string;
    weekStart: number;
    selectable: boolean;
    multiple: boolean;
    range: boolean;
    disabled: boolean;
    readonly: boolean;
    selectedDays: string[];
    value: string;
    get endDay(): number;
    get months(): {
        caption: string;
        value: string;
    }[];
    get years(): string[];
    monthChanged: (year: number, month: number) => void;
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
    constructor();
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
export declare const tosiMonth: import("tosijs").ElementCreator<Component<PartsMap>>;
export {};
