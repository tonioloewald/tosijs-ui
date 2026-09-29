/*
The dialect registry (#184): the ONE list of languages an example's source block can be
written in, and how each one becomes a running example.

`js`, `tjs` and `ts` are built-in entries, not special cases beside a hook. A site adds its own
(tjs-lang's AJS, say) with `registerDialect`, in its bundle entry, before the doc system
starts; a fence in that language then becomes a live example like any other.

A dialect either TRANSFORMS (source → JavaScript that the example then runs as usual) or RUNS
(it executes the source itself — a VM, a fuel budget, capabilities it closes over). tosijs-ui
never depends on what a `run` dialect uses: the site's registration closes over it.
*/
import { elements } from 'tosijs';
import { registerLiveLanguage } from '../doc-system/example-policy.js';
import { loadTransform } from './code-transform.js';
// Empty specs: the built-ins' behaviour lives in `loadTransform`, and the tab label and editor
// mode default to the name, which is what `tjs`/`ts` examples have always had.
const BUILT_IN = { js: {}, tjs: {}, ts: {} };
const registry = new Map(Object.entries(BUILT_IN));
/**
 * Add a dialect, or replace a built-in one (`registerDialect('tjs', { transform })` runs tjs
 * examples through the site's own tjs-lang build instead of the pinned copy).
 *
 * Call it before the doc system starts: examples take their dialect when they are created,
 * and a fence in an unregistered language is shown as plain code.
 */
export function registerDialect(name, spec) {
    if (!spec.transform === !spec.run) {
        throw new Error(`registerDialect('${name}'): give exactly one of \`transform\` or \`run\``);
    }
    registerLiveLanguage(name);
    registry.set(name.toLowerCase(), spec);
}
/** The registered spec for a dialect, or `undefined`. */
export function getDialect(name) {
    return registry.get(name.toLowerCase());
}
/** Is this dialect's `js`/`tjs`/`ts` built-in still in place (not replaced by the site)? */
export function isBuiltInDialect(name) {
    const key = name.toLowerCase();
    return BUILT_IN[key] !== undefined && registry.get(key) === BUILT_IN[key];
}
/**
 * The transform an example in `name` runs its source through, or `undefined` for a `run`
 * dialect (which executes the source itself). An unknown name runs as plain JavaScript —
 * the same thing an unregistered language's example did before there was a registry.
 */
export async function dialectTransform(name, options = {}) {
    const spec = getDialect(name);
    if (spec === undefined)
        return loadTransform('js');
    if (isBuiltInDialect(name))
        return loadTransform(name.toLowerCase());
    if (spec.run)
        return undefined;
    const transform = spec.transform;
    return (code) => transform(code, options);
}
const { pre } = elements;
/**
 * Show a `run` dialect's result below the example's preview: a string as written, anything
 * else as JSON (falling back to `String()` for what JSON cannot represent).
 */
export function showDialectResult(preview, value) {
    let text;
    if (typeof value === 'string') {
        text = value;
    }
    else {
        try {
            text = JSON.stringify(value, null, 2) ?? String(value);
        }
        catch {
            text = String(value);
        }
    }
    preview.append(pre({ class: 'dialect-result' }, text));
}
/**
 * Put the built-ins back — for TESTS only. The registry is module state, and Bun shares
 * module state across every test file in a process, so a test that overrides `tjs` must undo
 * it or every later file inherits the override.
 */
export function resetBuiltInDialectsForTests() {
    for (const [name, spec] of Object.entries(BUILT_IN))
        registry.set(name, spec);
}
