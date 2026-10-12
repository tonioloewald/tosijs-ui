/*
Curation: show a hand-picked set of a schema's properties, in a chosen order, under chosen
captions, optionally through a custom editor (#221).

DOM-free apart from `editorPlugin`, like the rest of the field model, so the picking rule is
testable without a form. A curation only chooses what is SHOWN. The form still holds and
validates the whole value, so a property that is not shown keeps its value and can still be
in error; `hiddenErrors` is what lets the form say so.
*/
export function curatedField(entry) {
    return entry === true
        ? {}
        : typeof entry === 'string'
            ? { caption: entry }
            : entry;
}
/**
 * The node at a path. A path runs through object properties only: an array, a union or a
 * plugin-claimed property is chosen whole, since what is inside one depends on the value.
 */
export function findNode(nodes, path) {
    for (const node of nodes) {
        if (node.path === path)
            return node;
        if ('children' in node && path.startsWith(node.path + '.')) {
            return findNode(node.children, path);
        }
    }
    return undefined;
}
/**
 * The curated nodes, in the curation's order. A path the schema does not describe becomes
 * an `unsupported` placeholder that says so and is listed in `unknown`: a field that
 * silently fails to appear looks the same as one that was never asked for.
 */
export function curateNodes(nodes, fields) {
    const curated = [];
    const unknown = [];
    for (const [path, entry] of Object.entries(fields)) {
        const { caption } = curatedField(entry);
        const node = findNode(nodes, path);
        if (!node) {
            unknown.push(path);
            const placeholder = {
                path,
                label: caption ?? path,
                kind: 'unsupported',
                schema: {},
                required: false,
                reason: `The schema describes no property at "${path}".`,
            };
            curated.push(placeholder);
            continue;
        }
        curated.push(caption === undefined ? node : { ...node, label: caption });
    }
    return { nodes: curated, unknown };
}
/**
 * Errors the form has no field to show under: the value is invalid somewhere the curation
 * does not display. `shown` is every path with a rendered error slot.
 */
export function hiddenErrors(errors, shown) {
    const visible = new Set(shown);
    return errors.filter((error) => !visible.has(error.path));
}
const isNativeControl = (el) => el instanceof HTMLInputElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLTextAreaElement;
/** A `FieldEditor` as the plugin the form already knows how to host. */
export function editorPlugin(editor) {
    if (typeof editor !== 'function')
        return editor;
    const put = (el, value) => {
        const next = isNativeControl(el)
            ? value == null
                ? ''
                : String(value)
            : value;
        if (el.value !== next)
            el.value = next;
    };
    return {
        render({ value, set }) {
            const el = editor();
            put(el, value);
            let last = value;
            const commit = (event) => {
                // The editor's own event stops here; the form fires its own `change`.
                event.stopPropagation();
                const next = el.value;
                if (Object.is(next, last))
                    return;
                last = next;
                set(next);
            };
            el.addEventListener('input', commit);
            el.addEventListener('change', commit);
            return el;
        },
        sync: put,
    };
}
