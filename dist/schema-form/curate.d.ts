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
    /**
     * Render the property with this editor in place of the built-in control. Its `value`
     * must be of the schema's type: a native `<input>` yields strings, so it suits string
     * properties only.
     */
    editor?: FieldEditor;
    /**
     * Curate what is INSIDE an object, an array or a union. Paths are relative to the
     * property: for an array, to each of its items; for a union, to the branch the value
     * currently matches.
     */
    fields?: FieldCuration;
    /** An object or array panel starts closed. */
    collapsed?: boolean;
    /** For a union: `false` hides the variant picker, leaving the active branch's fields. */
    picker?: boolean;
}
/**
 * A titled panel grouping some of the curated fields. Its key in the curation is an id
 * (the panel's `data-section`), not a path, and its `fields` use the same paths as the
 * entries around it.
 */
export interface CuratedSection {
    section: string;
    fields: FieldCuration;
    /** The panel starts closed. */
    collapsed?: boolean;
}
/**
 * Paths into the schema (`thresholds.default`), in display order, each mapped to how to show
 * it. A string is shorthand for `{ caption }`, and `true` for "as the schema describes it".
 */
export type FieldCuration = {
    [path: string]: CuratedField | CuratedSection | string | true;
};
export declare const CURATED_KEYS: string[];
export declare const SECTION_KEYS: string[];
export declare const isSection: (entry: unknown) => entry is CuratedSection;
export declare function curatedField(entry: CuratedField | string | true): CuratedField;
/**
 * The node at a path. A path runs through object properties only: what is inside an array
 * or a union depends on the value, so those are reached through their entry's own `fields`.
 */
export declare function findNode(nodes: Node[], path: string): Node | undefined;
export interface Curated {
    nodes: Node[];
    /** Paths the schema does not describe. Each renders as a placeholder that says so. */
    unknown: string[];
    /** Paths skipped because they are, contain, or are inside one already shown. */
    overlapping: string[];
    /** Entries carrying keys the curation does not have. */
    badKeys: Array<{
        path: string;
        keys: string[];
    }>;
    /** The entry for each path that is shown, by absolute path. */
    entries: Map<string, CuratedField>;
}
/**
 * The curated nodes, in the curation's order. A path the schema does not describe becomes
 * an `unsupported` placeholder that says so and is listed in `unknown`: a field that
 * silently fails to appear looks the same as one that was never asked for.
 *
 * `base` is the path the curation's own paths are relative to (an array item, a union).
 * `elsewhere` answers "is this path described, only not here?", which is how a union's
 * curation can name fields of a branch the value does not currently match: those are left
 * out without a placeholder.
 */
export declare function curateNodes(nodes: Node[], fields: FieldCuration, base?: string, elsewhere?: (path: string) => boolean): Curated;
/**
 * Errors the form has no field to show under: the value is invalid somewhere the curation
 * does not display. `shown` is every path with a rendered error slot.
 */
export declare function hiddenErrors(errors: FieldError[], shown: Iterable<string>): FieldError[];
/** A `FieldEditor` as the plugin the form already knows how to host, one per editor. */
export declare function editorPlugin(editor: FieldEditor): FieldPlugin;
