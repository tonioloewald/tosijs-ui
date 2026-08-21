import type { JSONSchema } from 'tosijs-schema';
/** What kind of control a field wants. The component maps this to elements. */
export type FieldKind = 'string' | 'number' | 'integer' | 'boolean' | 'enum' | 'const' | 'unsupported';
/** A nested object: its own label, and the fields inside it. */
export interface FieldGroup {
    kind: 'group';
    path: string;
    label: string;
    required: boolean;
    children: Node[];
}
/** An array property: its item schema, and the fields for each current element. */
export interface FieldArray {
    kind: 'array';
    path: string;
    label: string;
    required: boolean;
    itemSchema: JSONSchema;
}
export type Node = Field | FieldGroup | FieldArray;
export interface Field {
    /** dotted path into the value object, e.g. `email` or `address.city` */
    path: string;
    /** the label a human sees — `title`, else the last path segment, humanised */
    label: string;
    kind: FieldKind;
    schema: JSONSchema;
    required: boolean;
    /** `<input type>` for a string field, from `format`; undefined for other kinds */
    inputType?: string;
    /** enum choices, already coerced to strings for the DOM */
    options?: Array<{
        value: unknown;
        label: string;
    }>;
    /** why this field cannot be rendered — set only when `kind` is 'unsupported' */
    reason?: string;
}
/** `firstName` / `first_name` / `first-name` → `first name`. */
export declare function humanise(key: string): string;
/**
 * The fields a schema describes, in declaration order.
 *
 * Slice 1 handles a flat object of scalars. Anything else — nested objects, arrays, unions —
 * comes back as `kind: 'unsupported'` **with a reason**, rather than being skipped. A field
 * that silently vanishes is indistinguishable from a schema that never mentioned it, and
 * that is precisely how an editor loses data.
 */
export declare function fieldsFor(schema: JSONSchema, prefix?: string): Node[];
/** Every leaf field in a tree, depth-first — what the component syncs values and errors for. */
export declare function leafFields(nodes: Node[]): Field[];
/**
 * The fields for one array element, at `path.<index>`.
 *
 * A scalar item is a single field at the index itself (`tags.0`); an object item expands to
 * its properties (`items.0.sku`). Either way the paths are ordinary dotted paths, so value
 * sync, error keying and `setByPath` need no array-specific handling.
 */
export declare function itemFields(itemSchema: JSONSchema, path: string, index: number): Node[];
/** Read a dotted path out of a value object. */
export declare function getByPath(value: any, path: string): unknown;
/**
 * Write a dotted path, returning a NEW object — the old one is never mutated.
 *
 * Immutability is what makes `diff(original, current)` a usable dirty check and what lets a
 * consumer keep the value they handed in. It also means a `change` listener that stashes the
 * event's value gets a stable snapshot rather than an object that keeps moving underneath it.
 */
export declare function setByPath(value: any, path: string, next: unknown): any;
export declare function insertAt(value: any, path: string, index: number, item: unknown): any;
export declare function removeAt(value: any, path: string, index: number): any;
/** Move an item. A no-op when either end is out of range, rather than creating holes. */
export declare function moveItem(value: any, path: string, from: number, to: number): any;
/** A sensible empty item for an `items` schema — what "Add" inserts. */
export declare function blankFor(schema: JSONSchema): unknown;
export interface FieldError {
    path: string;
    message: string;
}
/**
 * Normalise a validator's `(path, message)` callbacks into per-field errors.
 *
 * `known` is the set of field paths the form rendered; a re-keyed error must land on one of
 * them, or it would attach to a field that is not on screen. Errors about the object as a
 * whole end up under `''`, so a form can show them without blaming a field.
 */
export declare function collectErrors(validateFn: (onError: (path: string, message: string) => void) => void, known?: Iterable<string>): FieldError[];
/** The first error for a path, or undefined. */
export declare function errorFor(errors: FieldError[], path: string): string | undefined;
