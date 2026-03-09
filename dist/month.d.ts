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
    static preferredTagName: string;
    static lightStyleSpec: {
        ':host': {
            display: string;
        };
        ':host [part=header]': {
            display: string;
            alignItems: string;
            justifyContent: string;
        };
        ':host[disabled]': {
            pointerEvents: string;
            opacity: string;
        };
        ':host [part="month"], :host [part="year"]': {
            _fieldWidth: string;
            flex: string;
        };
        ':host [part=week], :host [part=days]': {
            display: string;
            gridTemplateColumns: string;
            justifyItems: string;
        };
        ':host .today': {
            background: string;
            boxShadow: string;
            backdropFilter: string;
            fontWeight: string;
        };
        ':host .day, :host .date': {
            padding: number;
            display: string;
            justifyContent: string;
            userSelect: string;
        };
        ':host .day': {
            color: string;
            background: string;
            fontWeight: string;
        };
        ':host .date': {
            cursor: string;
        };
        ':host .weekend': {
            background: string;
        };
        ':host .date:not(.in-month)': {
            opacity: number;
        };
        ':host .date.checked': {
            color: string;
            background: string;
        };
        ':host:not([range]) .date.checked': {
            borderRadius: string;
        };
        ':host .range-start': {
            borderTopLeftRadius: string;
            borderBottomLeftRadius: string;
        };
        ':host .range-end': {
            borderTopRightRadius: string;
            borderBottomRightRadius: string;
        };
    };
    static formAssociated: boolean;
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
        required: boolean;
        name: string;
    };
    selectedDays: string[];
    value: string;
    formDisabledCallback(disabled: boolean): void;
    formResetCallback(): void;
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
