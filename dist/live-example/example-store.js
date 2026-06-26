/*
Per-example local edit scratchpad.

Live examples can be edited in place; this persists those edits to the browser
(localStorage) keyed by the source-to-doc map (sourceFile + ordinal) so they
survive reloads. Per-browser, no server — the local-only flavor of the DocStore
example scratchpad. An example with no source map can't be keyed, so it isn't
persisted.
*/
const PREFIX = 'tosi-example-edit:';
/** Stable key for an example, from its source↔doc map attributes. */
export function exampleEditKey(sourceFile, ordinal) {
    return `${PREFIX}${sourceFile}#${ordinal}`;
}
export function saveExampleEdit(key, edit) {
    try {
        localStorage.setItem(key, JSON.stringify(edit));
    }
    catch (e) {
        console.warn('example-store: save failed', e);
    }
}
export function loadExampleEdit(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}
export function clearExampleEdit(key) {
    try {
        localStorage.removeItem(key);
    }
    catch {
        // ignore
    }
}
export function hasExampleEdit(key) {
    try {
        return localStorage.getItem(key) !== null;
    }
    catch {
        return false;
    }
}
