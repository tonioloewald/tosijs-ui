import type { Node, FieldError } from './fields.js';
import type { FieldPlugin } from './plugins.js';
/**
 * A custom editor for one property: a function returning an element that follows the
 * component contract (a `value` property, a `change` event), such as any tosijs-ui element
 * creator, or a `FieldPlugin` for full control.
 */
export type FieldEditor = FieldPlugin | (() => HTMLElement);
export interface CuratedField {
    /** The label to show. Defaults to the schema's `title`, else the humanised key. */
    caption?: string;
    /** A line of help shown under the control. */
    help?: string;
    /** Show the value without letting it be edited in this form. Not a security boundary. */
    readOnly?: boolean;
    /** Render the property with this editor in place of the built-in control. */
    editor?: FieldEditor;
}
/**
 * Paths into the schema (`thresholds.default`), in display order, each mapped to how to show
 * it. A string is shorthand for `{ caption }`, and `true` for "as the schema describes it".
 */
export type FieldCuration = Record<string, CuratedField | string | true>;
export declare function curatedField(entry: CuratedField | string | true): CuratedField;
/**
 * The node at a path. A path runs through object properties only: an array, a union or a
 * plugin-claimed property is chosen whole, since what is inside one depends on the value.
 */
export declare function findNode(nodes: Node[], path: string): Node | undefined;
/**
 * The curated nodes, in the curation's order. A path the schema does not describe becomes
 * an `unsupported` placeholder that says so and is listed in `unknown`: a field that
 * silently fails to appear looks the same as one that was never asked for.
 */
export declare function curateNodes(nodes: Node[], fields: FieldCuration): {
    nodes: Node[];
    unknown: string[];
};
/**
 * Errors the form has no field to show under: the value is invalid somewhere the curation
 * does not display. `shown` is every path with a rendered error slot.
 */
export declare function hiddenErrors(errors: FieldError[], shown: Iterable<string>): FieldError[];
/** A `FieldEditor` as the plugin the form already knows how to host. */
export declare function editorPlugin(editor: FieldEditor): FieldPlugin;
