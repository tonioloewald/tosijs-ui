/*
Per-example local edit scratchpad.

Live examples can be edited in place; this persists those edits to the browser
(localStorage) keyed by the source-to-doc map (sourceFile + ordinal) so they
survive reloads. Per-browser, no server — the local-only flavor of the DocStore
example scratchpad. An example with no source map can't be keyed, so it isn't
persisted.
*/
const PREFIX = 'tosi-example-edit:';
/*
A saved edit outlives the source it was made from. One kept running a long-gone version of an
example in one browser profile: the page looked like the source, the error read like a library
defect, and every other browser was clean (#3276). The fingerprint is what tells the two apart.
Trailing whitespace is ignored, as hasLocalEdits ignores it.
*/
export function sourceFingerprint(code) {
    const t = (s) => (s ?? '').replace(/\s+$/, '');
    const text = [code.js, code.html, code.css, code.test].map(t).join('\u0000');
    // FNV-1a, 32 bits: telling versions of one example apart, not security.
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}
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
