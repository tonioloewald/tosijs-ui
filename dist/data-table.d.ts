import { Component as WebComponent, ElementCreator } from 'tosijs';
import { SortCallback } from './make-sorter.js';
import { RowGroupIdFn, GroupCount } from './row-grouping.js';
import { ValueRendererType } from './value-renderer.js';
import type { JSONSchema } from './schema-form/json-schema.js';
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
    /**
     * Whether this column's cells are editable. Defaults to the table's `editable`.
     *
     * Set `false` on a computed or identifying column of an otherwise-editable table, or
     * `true` to make one column editable in a read-only one. A column with its own
     * `dataCell` is never made editable — a custom cell builds and binds itself, and the
     * table has no business reaching into it.
     */
    editable?: boolean;
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
            color: string;
            userSelect: string;
        };
        ':host .tr:not(.table-cluster-first) .cluster-repeat > *': {
            display: string;
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
        nopreservescroll: boolean;
        editable: boolean;
    };
    /**
     * Optional JSON Schema for the row shape. Drives editable cells and validates edits.
     *
     * The SAME model `<tosi-schema-form>` uses (`src/schema-form/fields.ts`), so a cell and a
     * field agree about what a property is — one description of the data, two surfaces. That
     * was the point of building the model DOM-free: #44 asked for an editable table, and the
     * alternative was a second, drifting answer to "what control does this property want".
     */
    private _schema;
    get schema(): JSONSchema | null;
    set schema(schema: JSONSchema | null);
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
    private _groupIdMemo;
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
    /**
     * Keep the reader in place across a re-render (default `true`).
     *
     * Set `false` when a render means "here is a different dataset" rather than "here is the
     * same data, re-viewed" — then starting at the top is the correct answer.
     *
     * Backed by the `nopreservescroll` ATTRIBUTE so it is settable from markup like every
     * other boolean here (`nosort`, `nohide`, `noreorder`). The inverted name is not
     * gratuitous: this defaults to `true`, and a presence-only attribute can only ever turn
     * something ON — so a `preservescroll` attribute could never express "off", which is the
     * only thing anyone needs to say. Getting this wrong is unfixable after release without a
     * rename, so it is settled here rather than later.
     */
    get preserveScroll(): boolean;
    set preserveScroll(value: boolean);
    /** Horizontal scroll offset to put back after a re-render. */
    private _scrollLeft;
    /** In-flight scroll restore, so a newer one supersedes it and gestures can cancel it. */
    private _scrollRestore;
    private _scrollAnchor;
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
    /** Is this column editable? Table-level default, per-column override, `dataCell` wins. */
    private columnEditable;
    private _editStart;
    private onCellFocus;
    private onCellChange;
    /** The model's answer for one column, cached per render pass. */
    private fieldFor;
    /**
     * Validate one edited cell against the schema. `undefined` when it conforms — or when
     * there is no schema, because a table with no description of its data cannot be wrong
     * about it.
     */
    private validateCell;
    private buildEditableCell;
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
    private captureScrollAnchor;
    private restoreScrollAnchor;
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
