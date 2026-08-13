import { Component as WebComponent, ElementCreator } from 'tosijs';
import { SortCallback } from './make-sorter.js';
import { RowGroupIdFn, GroupCount } from './row-grouping.js';
import { ValueRendererType } from './value-renderer.js';
export interface ColumnOptions {
    name?: string;
    prop: string;
    width: number;
    visible?: boolean;
    align?: string;
    type?: ValueRendererType;
    pinned?: 'left' | 'right';
    sort?: false | 'ascending' | 'descending';
    /**
     * What this column SORTS by, when that differs from what it stores.
     *
     * Defaults to `row[prop]`. A column with a custom `dataCell` renders whatever it likes
     * while the sort keys on `prop` — so when those differ, clicking "Sort Ascending"
     * reorders rows by a value the reader cannot see, which reads as "sorting is broken"
     * rather than "sorting a different field" (tosijs-ui#62).
     *
     *     { name: 'Invoice #', prop: 'Customer invoice ID', dataCell: invoiceCell,
     *       sortValue: (row) => row['Invoice number'] || row['Customer invoice ID'] }
     *
     * Every other escape hatch costs more: `table.sort` is table-wide (one derived column
     * means reimplementing sorting for all of them), replacing `headerCell` means
     * reimplementing the header menu, and changing `prop` breaks CSV export and anything
     * else keyed on it.
     */
    sortValue?: (row: any) => unknown;
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
export declare class TosiTable extends WebComponent {
    static preferredTagName: string;
    static lightStyleSpec: {
        ':host': {
            '--tosi-table-row-height': string;
            '--tosi-table-touch-size': string;
            '--tosi-table-dragged-header-bg': string;
            '--tosi-table-dragged-header-color': string;
            '--tosi-table-drop-header-bg': string;
            display: string;
            overflow: string;
            background: string;
        };
        ':host .scroll-area': {
            width: string;
            height: string;
            overflow: string;
            overscrollBehavior: string;
        };
        ':host .thead, :host .tbody': {
            display: string;
        };
        ':host .tr': {
            display: string;
            gridTemplateColumns: string;
            width: string;
            height: string;
            background: string;
        };
        ':host .thead .tr': {
            position: string;
            top: string;
            zIndex: string;
            background: string;
        };
        ':host .tbody-pinned-top .tr, :host .tbody-pinned-bottom .tr': {
            position: string;
            zIndex: string;
        };
        ':host .th, :host .td': {
            overflow: string;
            whiteSpace: string;
            textOverflow: string;
            display: string;
            alignItems: string;
            height: string;
            lineHeight: string;
        };
        ':host .col-pinned': {
            position: string;
            zIndex: string;
            background: string;
        };
        ':host .th.col-pinned': {
            zIndex: string;
            background: string;
        };
        ':host .tr:not(.table-cluster-first) .cluster-repeat': {
            visibility: string;
        };
        ':host .tr.table-cluster-odd': {
            _tosiTableBg: string;
        };
        ':host .tr[aria-selected] .td': {
            background: string;
        };
        ':host .td:focus, :host .th:focus': {
            outline: string;
            outlineOffset: string;
            zIndex: string;
        };
        ':host .col-pinned:focus': {
            zIndex: string;
        };
        ':host .col-edge-right': {
            boxShadow: string;
        };
        ':host .col-edge-left': {
            boxShadow: string;
        };
        ':host .row-edge-bottom': {
            boxShadow: string;
        };
        ':host .row-edge-top': {
            boxShadow: string;
        };
        ':host .th .menu-trigger': {
            color: string;
            background: string;
            padding: number;
            lineHeight: string;
            height: string;
            width: string;
        };
        ':host [draggable="true"]': {
            cursor: string;
        };
        ':host [draggable="true"]:active': {
            background: string;
            color: string;
        };
        ':host .drag-over': {
            background: string;
        };
    };
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
    rowRendered: ((item: any, cells: HTMLElement[]) => void) | null;
    private selectedKey;
    private selectBinding;
    maxVisibleRows: number;
    private _head;
    private _scrollArea;
    private _tbodyTop;
    private _tbodyBottom;
    private _pinnedRowEdgeObserver;
    private _rowCellsCache;
    private itemFor;
    private cellsFor;
    get value(): TableData;
    set value(data: TableData);
    private rowData;
    private _array;
    private _columns;
    private _filter;
    private _sort?;
    private _rowGroupId;
    private _visibleGroupedRowIds;
    private _nonRepeatingGroupedRowCells;
    private _pinnedTopRows?;
    private _pinnedBottomRows?;
    get pinnedTopRows(): any[] | undefined;
    set pinnedTopRows(rows: any[] | undefined);
    get pinnedBottomRows(): any[] | undefined;
    set pinnedBottomRows(rows: any[] | undefined);
    get effectivePinnedTopData(): any[];
    get effectivePinnedBottomData(): any[];
    private get effectiveBaseData();
    constructor();
    get array(): any[];
    set array(newArray: any[]);
    get filter(): ArrayFilter;
    set filter(filterFunc: ArrayFilter);
    get rowGroupId(): RowGroupIdFn | null;
    set rowGroupId(fn: RowGroupIdFn | null);
    get visibleGroupedRowIds(): string[] | null;
    set visibleGroupedRowIds(ids: string[] | null);
    get nonRepeatingGroupedRowCells(): string[] | null;
    set nonRepeatingGroupedRowCells(props: string[] | null);
    /** The grouping function in force, or null when the table is ungrouped. */
    private get groupIdFn();
    /**
     * This row's group id, or null when the table is ungrouped.
     *
     * Public because the grouping may be INFERRED from `nonRepeatingGroupedRowCells`, in which
     * case the consumer never wrote the function and cannot reproduce its ids — which would
     * leave `rowGroupCounts` keyed by strings they have no way to construct.
     */
    groupIdFor(row: any): string | null;
    /**
     * Per-group `{ visible, total }` counts — rendered rows against rows before filtering.
     *
     * For cells that report or control their own group: "showing 2 of 7", or a toggle that
     * adds the group to `visibleGroupedRowIds`. The table is the only thing that sees both
     * sides of the filter, so this is the piece a custom cell renderer cannot derive itself.
     *
     * Recomputed each render, and always a Map — empty when ungrouped — so callers can `.get()`
     * without a null check. Groups filtered away entirely are present with `visible: 0`;
     * pinned rows sit outside grouping and are not counted.
     */
    get rowGroupCounts(): Map<string, GroupCount>;
    private _grouping;
    private _rowGroupCounts;
    get sort(): SortCallback | undefined;
    set sort(sortFunc: SortCallback | undefined);
    get columns(): ColumnOptions[];
    set columns(newColumns: ColumnOptions[]);
    get visibleColumns(): ColumnOptions[];
    /** @deprecated Set pinned: 'left' on individual columns instead */
    get pinnedLeft(): number;
    /** @deprecated Set pinned: 'left' on individual columns instead */
    set pinnedLeft(n: number);
    /** @deprecated Set pinned: 'right' on individual columns instead */
    get pinnedRight(): number;
    /** @deprecated Set pinned: 'right' on individual columns instead */
    set pinnedRight(n: number);
    content: null;
    private computeStickyInfo;
    private cellClasses;
    private rowClasses;
    private tagPinnedRows;
    private tagPinnedTbody;
    private cellStyle;
    private applyGridCellAttrs;
    private buildCell;
    private tagClusterParity;
    /**
     * Is this row the first of its group? Always true when the table is ungrouped.
     *
     * Exposed for custom `dataCell` columns, which render themselves and so have to decide
     * for themselves whether to show a value the rest of the group repeats.
     */
    isFirstInGroup(row: any): boolean;
    private isRepeatedGroupRow;
    private buildRow;
    private buildHeaderCell;
    private buildHeader;
    private buildPinnedBody;
    getColumn(event: any): ColumnOptions | undefined;
    private setCursor;
    private resizeColumn;
    selectRow(row: any, select?: boolean): void;
    selectRows(rows?: any[], select?: boolean): void;
    deSelect(rows?: any[]): void;
    private updateSelectionVisuals;
    private rangeStart?;
    private updateSelection;
    private findCell;
    private _pendingFocus;
    private handleScrollEnd;
    private focusCell;
    private handleKeyNav;
    connectedCallback(): void;
    setColumnWidths(): void;
    sortByColumn: (columnOptions: ColumnOptions, direction?: "ascending" | "descending" | "auto") => void;
    popColumnMenu: (target: HTMLElement, options: ColumnOptions) => void;
    get captionSpan(): ElementCreator;
    get visibleRows(): any[];
    get visibleSelectedRows(): any[];
    get selectedRows(): any[];
    getCells(itemOrCell: any): HTMLElement[] | undefined;
    getItem(cell: Element): any;
    private draggedColumn?;
    private dropColumn;
    render(): void;
    private observePinnedRowMutations;
}
/** @deprecated Use TosiTable instead */
export type DataTable = TosiTable;
/** @deprecated Use TosiTable instead */
export declare const DataTable: typeof TosiTable;
export declare const tosiTable: ElementCreator<TosiTable>;
/** @deprecated Use tosiTable instead */
export declare const dataTable: ElementCreator<TosiTable>;
/** @deprecated Use tosiTable instead */
export declare const xinTable: ElementCreator<TosiTable>;
