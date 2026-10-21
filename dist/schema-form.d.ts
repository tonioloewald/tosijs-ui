import { ElementCreator, elements } from 'tosijs';
import type { JSONSchema } from './schema-form/json-schema.js';
import { type FieldError } from './schema-form/fields.js';
export { setSchemaValidator, schemaValidationAvailable, type SchemaValidator, } from './schema-form/validator.js';
import { type FieldCuration } from './schema-form/curate.js';
export type { FieldCuration, CuratedField, CuratedSection, FieldEditor, } from './schema-form/curate.js';
export { isSection } from './schema-form/curate.js';
/** A value someone proposes for one field, shown beside the current one for review. */
export interface FieldProposal {
    value: unknown;
    /** Why. Shown under the proposed value. */
    reason?: string;
    /** Who or what proposed it. */
    source?: string;
}
/** What a custom `proposalView` is given. `accept` and `reject` do what the buttons do. */
export interface ProposalContext {
    path: string;
    label: string;
    current: unknown;
    proposal: FieldProposal;
    /** The form is read-only: show the proposal, offer no way to act on it. */
    readOnly: boolean;
    /** Do nothing while the form is read-only. */
    accept: () => void;
    reject: () => void;
    elements: typeof elements;
}
export { registerFieldPlugin, type FieldPlugin, type FieldPluginContext, } from './schema-form/plugins.js';
declare const TosiSchemaForm_base: import("tosijs").WithAttributes<{
    readOnly: boolean;
}>;
export declare class TosiSchemaForm extends TosiSchemaForm_base {
    static preferredTagName: string;
    static lightStyleSpec: {
        ':host': {
            display: string;
        };
        ':host .schema-form': {
            display: string;
            gap: string;
        };
        ':host .schema-field': {
            display: string;
            gap: string;
        };
        ':host .schema-field > label': {
            fontSize: string;
            opacity: string;
        };
        ':host .schema-field.-invalid > input, :host .schema-field.-invalid > select': {
            outline: string;
            outlineOffset: string;
        };
        ':host .schema-error': {
            fontSize: string;
            color: string;
        };
        ':host .schema-error[hidden]': {
            display: string;
        };
        ':host .schema-group': {
            border: string;
            borderRadius: string;
            padding: string;
        };
        ':host .schema-group[open]': {
            display: string;
            gap: string;
        };
        ':host .schema-group > summary': {
            cursor: string;
            opacity: string;
        };
        ':host .schema-item': {
            display: string;
            gap: string;
            gridTemplateColumns: string;
            alignItems: string;
            borderTop: string;
            paddingTop: string;
        };
        ':host .schema-item > *': {
            gridColumn: string;
        };
        ':host .schema-item > .schema-item-controls': {
            display: string;
            gap: string;
            gridColumn: string;
            gridRow: string;
        };
        ':host .schema-item-controls[hidden], :host .schema-add[hidden]': {
            display: string;
        };
        ':host .schema-union': {
            display: string;
            gap: string;
        };
        ':host .schema-variant[hidden]': {
            display: string;
        };
        ':host .schema-variant-fields': {
            display: string;
            gap: string;
            paddingTop: string;
        };
        ':host .schema-unvalidated': {
            fontSize: string;
            opacity: string;
            fontStyle: string;
        };
        ':host .schema-help': {
            fontSize: string;
            opacity: string;
        };
        ':host .schema-hidden-errors': {
            fontSize: string;
            color: string;
        };
        ':host .schema-hidden-errors[hidden]': {
            display: string;
        };
        ':host .schema-hidden-errors ul': {
            margin: string;
            paddingLeft: string;
        };
        ':host .schema-group.-invalid > summary': {
            color: string;
            opacity: string;
        };
        ':host .schema-proposal': {
            display: string;
            flexWrap: "wrap";
            alignItems: string;
            gap: string;
            fontSize: string;
            padding: string;
            borderRadius: string;
            background: string;
        };
        ':host .schema-proposal-reason': {
            flex: string;
            opacity: string;
        };
        ':host .schema-proposal-source': {
            opacity: string;
            fontStyle: string;
        };
        ':host .schema-proposal-actions': {
            display: string;
            gap: string;
            marginLeft: string;
        };
        ':host .schema-proposal-actions[hidden], :host .schema-hidden-proposals[hidden]': {
            display: string;
        };
        ':host .schema-hidden-proposals': {
            fontSize: string;
            opacity: string;
        };
        ':host .schema-add': {
            justifySelf: string;
        };
        ':host .schema-empty': {
            fontSize: string;
            opacity: string;
            fontStyle: string;
        };
        ':host .schema-unsupported': {
            fontSize: string;
            opacity: string;
            fontStyle: string;
        };
    };
    private _schema;
    private _value;
    private _nodes;
    private _fields;
    /** The schema the current DOM was built for — see `render`. */
    private _builtFor;
    private _errors;
    private _index;
    private _curation;
    private _entries;
    private _hosts;
    private _arrays;
    /** The array at `path`, or none: a value that is not an array there has no items. */
    private listAt;
    /** Everything under `path` is about to be recreated: what is held for it is stale. */
    private forgetUnder;
    private _curationWarnings;
    private _hiddenErrorSlot;
    private _hiddenErrorSignature;
    /**
     * Show only these properties. Keys are paths into the schema (`thresholds.default`), in
     * display order; each value is `{ caption?, help?, readOnly?, editor?, fields? }`, a
     * caption string, `true`, or a `{ section, fields }` panel. `null` shows everything the
     * schema describes.
     *
     * The form still holds and validates the WHOLE value: a property that is not shown keeps
     * its value, and an error in one is listed above the fields.
     */
    get fields(): FieldCuration | null;
    set fields(fields: FieldCuration | null);
    /** A curated `editor` first, then the `format` plugins. A section is neither. */
    private pluginFor;
    private adopt;
    /** One array element's nodes, curated when the array's entry has `fields`. */
    private itemNodes;
    private branchNodes;
    /**
     * Values proposed for review, by path: `{ value, reason?, source? }`. Each is shown under
     * its field with Accept and Reject. `value` stays the CURRENT value until one is
     * accepted. `null` (the default) shows none.
     */
    get proposals(): Record<string, FieldProposal> | null;
    set proposals(proposals: Record<string, FieldProposal> | null);
    private _proposals;
    /** Render a proposal your own way. Return the element to show under the field. */
    proposalView: ((context: ProposalContext) => HTMLElement) | null;
    private settleProposal;
    private focusAfterProposal;
    private proposalHasFocus;
    /**
     * Write the proposed value at `path` and drop the proposal. Fires `proposalaccept`
     * (`detail: { path, proposal }`), then `change`. Returns false when there is none.
     */
    acceptProposal(path: string): boolean;
    /** Drop the proposal at `path`, leaving the value alone. Fires `proposalreject`. */
    rejectProposal(path: string): boolean;
    private rekeyProposals;
    get schema(): JSONSchema;
    set schema(schema: JSONSchema);
    get value(): any;
    /** Setting `value` updates the inputs. It does NOT fire `change` — that is for edits. */
    set value(value: any);
    /** `{ path, message }[]` for the current value, or `[]` with no validator installed. */
    get errors(): FieldError[];
    /** Does the current value conform? `true` when no validator is installed. */
    validate(): boolean;
    /** Is anything actually checking this form? See `validate()`. */
    get validationAvailable(): boolean;
    private refreshErrors;
    private handleFieldInput;
    private buildNode;
    private buildBare;
    private buildArray;
    private fillArray;
    private buildUnion;
    private fillUnion;
    private handleVariantChange;
    private syncArrays;
    private syncVariants;
    /** The shared tail of every edit that changes WHICH fields exist. */
    private afterStructuralEdit;
    private afterArrayEdit;
    private addArrayItem;
    private removeArrayItem;
    private moveArrayItem;
    private expanded;
    /** Every leaf that carries a value — the union pickers are structure, not data. */
    private allFields;
    /** The plugin-rendered fields, which sync through the plugin rather than the DOM. */
    private pluginFields;
    private applyReadOnly;
    private unvalidatedNote;
    private buildPluginField;
    private buildField;
    private syncValues;
    private syncPlugins;
    private syncErrors;
    private _watchPanels;
    private _hiddenProposalSlot;
    private syncProposals;
    private _proposalsShown;
    private proposalSignature;
    private buildProposal;
    private syncHiddenErrors;
    content: null;
    /** Stops the locale observer. A proxy's `.observe()` returns this, not a `Listener`. */
    private _stopLocale;
    connectedCallback(): void;
    disconnectedCallback(): void;
    /** Throw away the DOM and build it again — a schema change, or a new plugin. */
    rebuild(): void;
    render(): void;
}
export declare const tosiSchemaForm: ElementCreator<TosiSchemaForm>;
