import { Component as WebComponent, ElementCreator } from 'tosijs';
import type { JSONSchema } from './schema-form/json-schema.js';
import { type ColumnOptions, type TosiTable } from './data-table.js';
import { type TosiSchemaForm } from './schema-form.js';
export interface CrudQuery {
    search?: string;
    [key: string]: unknown;
}
/**
 * Everything the component needs from your data layer.
 *
 * Three promise-returning methods and no transport: the point is that REST, a DocStore,
 * IndexedDB, an in-memory array and a mock all satisfy this without the component learning
 * anything about any of them.
 */
export interface CrudStore {
    list(query: CrudQuery): Promise<any[]>;
    /** returns the saved record — the server usually knows the id, the timestamp, the rest */
    save?(record: any): Promise<any>;
    delete?(record: any): Promise<void>;
}
interface CrudParts {
    search: HTMLInputElement;
    table: TosiTable;
    form: TosiSchemaForm;
    detail: HTMLElement;
    status: HTMLElement;
    saveButton: HTMLButtonElement;
    deleteButton: HTMLButtonElement;
    newButton: HTMLButtonElement;
}
export declare function columnsFromSchema(schema: JSONSchema): ColumnOptions[];
export declare class TosiCrud extends WebComponent<CrudParts> {
    static preferredTagName: string;
    static lightStyleSpec: {
        ':host': {
            display: string;
            gridTemplateRows: string;
            gap: string;
            minHeight: string;
        };
        ':host .crud-toolbar': {
            display: string;
            gap: string;
            alignItems: string;
        };
        ':host .crud-search': {
            flex: string;
            minWidth: string;
        };
        ':host .crud-body': {
            display: string;
            gridTemplateColumns: string;
            gap: string;
            minHeight: string;
        };
        ':host .crud-detail': {
            display: string;
            gridTemplateRows: string;
            gap: string;
            overflow: string;
        };
        ':host .crud-detail[hidden]': {
            display: string;
        };
        ':host .crud-actions': {
            display: string;
            gap: string;
        };
        ':host .crud-status': {
            fontSize: string;
            opacity: string;
        };
        ':host .crud-status.-error': {
            color: string;
            opacity: string;
        };
        ':host tosi-table': {
            minHeight: string;
        };
    };
    static initAttributes: {
        idPath: string;
        hashNamespace: string;
        hashMode: string;
        /** ms to wait after a keystroke before querying — a remote store is not free */
        searchDelay: number;
    };
    private _store;
    private _schema;
    private _rows;
    private _selected;
    /** True between `createNew()` and the next save/select — see `syncSelectionFromHash`. */
    private _creating;
    private _loaded;
    private _error;
    private _pending;
    private _listSeq;
    private _idle;
    private _hash;
    private _stopHash;
    private _searchTimer;
    /** What the box says, before the debounce commits it to the URL. */
    private _pendingSearch;
    get store(): CrudStore | null;
    set store(store: CrudStore | null);
    get schema(): JSONSchema | null;
    set schema(schema: JSONSchema | null);
    get rows(): any[];
    /** The selected record — the form's live model, so it includes unsaved edits. */
    get value(): any;
    get table(): TosiTable | null;
    get form(): TosiSchemaForm | null;
    get search(): string;
    set search(term: string);
    /**
     * Resolves when no store operation is in flight AND the DOM has caught up.
     *
     * Both halves matter to a caller: rendering is queued for the next frame, so "the store
     * answered" and "the list shows the answer" are different moments.
     */
    whenIdle(): Promise<void>;
    private settle;
    private run;
    refresh(): Promise<void>;
    select(record: any): void;
    /** Start a blank record. Nothing is stored until `save()`. */
    createNew(): void;
    save(): Promise<any>;
    /**
     * Is the selected record something the store could delete?
     *
     * ONE rule, used by both the button and the method. They disagreed: `render()` disabled the
     * button for a record with no id, while `remove()` only checked that *something* was
     * selected — so `createNew()` followed by `remove()` sent `store.delete({})`, which for a
     * REST adapter is `DELETE /records/undefined`. A guard the UI enforces and the API does not
     * is not a guard.
     */
    private get deletable();
    remove(): Promise<void>;
    private handleSearchInput;
    private handleSelectionChanged;
    content: () => HTMLDivElement[];
    connectedCallback(): void;
    disconnectedCallback(): void;
    private _applyingSelection;
    private _tableSelection;
    private syncTableSelection;
    /** Put the selected record into the form. Idempotent, so render can call it too. */
    private showSelected;
    private syncSelectionFromHash;
    render(): void;
}
export declare const tosiCrud: ElementCreator<TosiCrud>;
export {};
