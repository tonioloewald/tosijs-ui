import type { JSONSchema } from 'tosijs-schema';
/** What kind of control a field wants. The component maps this to elements. */
export type FieldKind = 'string' | 'number' | 'integer' | 'boolean' | 'enum' | 'const' | 'unsupported';
/** A nested object: its own label, and the fields inside it. */
export interface FieldGroup {
    kind: 'group';
    path: string;
    label: string;
    required: boolean;
    schema: JSONSchema;
    children: Node[];
}
/** An array property: its item schema, and the fields for each current element. */
export interface FieldArray {
    kind: 'array';
    path: string;
    label: string;
    required: boolean;
    schema: JSONSchema;
    itemSchema: JSONSchema;
}
/** One branch of a variant union — a shape the value may take. */
export interface UnionBranch {
    label: string;
    schema: JSONSchema;
    /** the `const`-valued properties that identify this branch, e.g. `{kind: 'circle'}` */
    marks: Record<string, unknown>;
}
/** A property whose value may take one of several object shapes. */
export interface FieldUnion {
    kind: 'union';
    path: string;
    label: string;
    required: boolean;
    schema: JSONSchema;
    branches: UnionBranch[];
    /** the property whose `const` distinguishes the branches, when there is one */
    discriminator?: string;
    /** keywords in this property's schema that the validator ignores — see `unenforced.ts` */
    unvalidated?: string[];
}
export type Node = Field | FieldGroup | FieldArray | FieldUnion;
export interface Field {
    /** dotted path into the value object, e.g. `email` or `address.city` */
    path: string;
    /** keywords in this field's schema that the validator ignores — see `unenforced.ts` */
    unvalidated?: string[];
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
/** Build the leaf field for a scalar / enum / const schema. Shared by objects and array items. */
export declare function scalarField(schema: JSONSchema, path: string, label: string, required: boolean): Field;
/**
 * Which branch does `value` currently look like? `-1` when nothing matches.
 *
 * Marks first: a discriminator is an exact answer, and it is the reason schemas carry one.
 * Otherwise score by how many of the branch's own required keys are present — the component
 * this design learned from demanded that **every** key match (its SF-10), so a
 * half-filled object matched no branch at all and the editor showed the user nothing.
 */
export declare function matchBranch(branches: UnionBranch[], value: any): number;
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
 * The fields of the branch `value` currently matches, at the union's own path.
 *
 * The discriminator is dropped: the variant `<select>` **is** that control, and rendering it
 * twice invites the user to set them to different things.
 */
export declare function branchFields(node: FieldUnion, value: any): Node[];
/**
 * Switch a union to another branch, keeping what the two shapes have in common.
 *
 * Only the branch marks are written. Nothing is deleted — a key the new branch does not
 * describe stays in the model, for the same reason output is never rebuilt from the inputs:
 * the form is an editor, not a filter, and `filter()` is what strips a value to a schema.
 */
export declare function selectBranch(value: any, node: FieldUnion, index: number): any;
/**
 * The fields for one array element, at `path.<index>`.
 *
 * A scalar item is a single field at the index itself (`tags.0`); an object item expands to
 * its properties (`items.0.sku`). Either way the paths are ordinary dotted paths, so value
 * sync, error keying and `setByPath` need no array-specific handling.
 */
export declare function itemFields(itemSchema: JSONSchema, path: string, index: number): Node[];
/**
 * The field for ONE property of an object schema — what an editable table cell needs.
 *
 * Same function the form uses per property, so a cell and a field agree about what a
 * property is: same input type from `format`, same enum options, same `unsupported` verdict
 * with the same reason. Two surfaces, one answer — which is the whole point of keeping the
 * model DOM-free.
 */
export declare function fieldForProperty(schema: JSONSchema | null | undefined, prop: string): Field | undefined;
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
/**
 * Strip `required` from a schema derived from a sample.
 *
 * `inferSchema` marks every key it saw as required, which is correct for describing a sample
 * and wrong for editing one: it says *this data had these keys*, not *this data must have
 * them*. Left in, every field in an inferred form is required because one example happened to
 * fill it in — the same "a sample's extremes are not the domain's" error that keeps
 * `minimum`/`maxLength` out of inference upstream.
 *
 * A consumer who does want required fields has the inferred schema in hand (`form.schema`),
 * and can add them and set it back.
 */
export declare function relaxInferred(schema: JSONSchema): JSONSchema;
