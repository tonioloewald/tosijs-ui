import { Component as WebComponent, ElementCreator } from 'tosijs';
import type { JSONSchema } from 'tosijs-schema';
import { type FieldError } from './schema-form/fields.js';
export declare class TosiSchemaForm extends WebComponent {
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
        ':host .schema-item-controls': {
            display: string;
            gap: string;
        };
        ':host .schema-add': {
            justifySelf: string;
        };
        ':host .schema-unsupported': {
            fontSize: string;
            opacity: string;
            fontStyle: string;
        };
    };
    static initAttributes: {
        readOnly: boolean;
    };
    private _schema;
    private _value;
    private _nodes;
    private _fields;
    /** The schema the current DOM was built for — see `render`. */
    private _builtFor;
    private _errors;
    get schema(): JSONSchema;
    set schema(schema: JSONSchema);
    get value(): any;
    /** Setting `value` updates the inputs. It does NOT fire `change` — that is for edits. */
    set value(value: any);
    /** `{ path, message }[]` for the current value, or `[]` with no validator installed. */
    get errors(): FieldError[];
    /** Does the current value conform? `true` when no validator is installed. */
    validate(): boolean;
    private refreshErrors;
    private coerce;
    private onFieldInput;
    private buildNode;
    private buildArray;
    private fillArray;
    private afterArrayEdit;
    private addArrayItem;
    private removeArrayItem;
    private moveArrayItem;
    private allFields;
    private buildField;
    private syncValues;
    private syncErrors;
    content: null;
    connectedCallback(): void;
    render(): void;
}
export declare const tosiSchemaForm: ElementCreator<TosiSchemaForm>;
