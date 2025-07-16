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
    select: boolean;
    multiple: boolean;
    nosort: boolean;
    nohide: boolean;
    noreorder: boolean;
    selectionChanged: SelectCallback;
    localized: boolean;
    private selectedKey;
    private selectBinding;
    pinnedTop: number;
    pinnedBottom: number;
    maxVisibleRows: number;
    get value(): TableData;
    set value(data: TableData);
    private rowData;
    private _array;
    private _columns;
    private _filter;
    charWidth: number;
    rowHeight: number;
    minColumnWidth: number;
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
