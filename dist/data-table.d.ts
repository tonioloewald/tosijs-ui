import { Component as WebComponent, ElementCreator } from 'tosijs';
import { SortCallback } from './make-sorter';
export interface ColumnOptions {
    name?: string;
    prop: string;
    width: number;
    visible?: boolean;
    align?: string;
    sort?: false | 'ascending' | 'descending';
    headerCell?: (options: ColumnOptions) => HTMLElement;
    dataCell?: (options: ColumnOptions) => HTMLElement;
}
export interface TableData {
    columns?: ColumnOptions[] | null;
    array: any[];
    filter?: ArrayFilter | null;
}
export type ArrayFilter = (array: any[]) => any[];
export type SelectCallback = (selected: any[]) => void;
export declare class DataTable extends WebComponent {
    static initAttributes: {
        rowHeight: number;
        charWidth: number;
        minColumnWidth: number;
        select: boolean;
        multiple: boolean;
        pinnedTop: number;
        pinnedBottom: number;
        nosort: boolean;
        nohide: boolean;
        noreorder: boolean;
        localized: boolean;
    };
    selectionChanged: SelectCallback;
    private selectedKey;
    private selectBinding;
    maxVisibleRows: number;
    get value(): TableData;
    set value(data: TableData);
    private rowData;
    private _array;
    private _columns;
    private _filter;
    get virtual(): {
        height: number;
    } | undefined;
    constructor();
    get array(): any[];
    set array(newArray: any[]);
    get filter(): ArrayFilter;
    set filter(filterFunc: ArrayFilter);
    get sort(): SortCallback | undefined;
    set sort(sortFunc: ArrayFilter);
    get columns(): ColumnOptions[];
    set columns(newColumns: ColumnOptions[]);
    get visibleColumns(): ColumnOptions[];
    content: null;
    getColumn(event: any): ColumnOptions | undefined;
    private setCursor;
    private resizeColumn;
    selectRow(row: any, select?: boolean): void;
    selectRows(rows?: any[], select?: boolean): void;
    deSelect(rows?: any[]): void;
    private rangeStart?;
    private updateSelection;
    connectedCallback(): void;
    setColumnWidths(): void;
    sortByColumn: (columnOptions: ColumnOptions, direction?: "ascending" | "descending" | "auto") => void;
    popColumnMenu: (target: HTMLElement, options: ColumnOptions) => void;
    get captionSpan(): ElementCreator;
    headerCell: (options: ColumnOptions) => HTMLElement;
    dataCell: (options: ColumnOptions) => HTMLElement;
    get visibleRows(): any[];
    get visibleSelectedRows(): any[];
    get selectedRows(): any[];
    rowTemplate(columns: ColumnOptions[]): HTMLTemplateElement;
    private draggedColumn?;
    private dropColumn;
    render(): void;
}
export declare const dataTable: ElementCreator<DataTable>;
export declare const xinTable: ElementCreator<DataTable>;
