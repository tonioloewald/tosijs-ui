/*
Two copies of CodeMirror in one install (board #3248, item 2; the same failure as #131).

Every CodeMirror package must share ONE `@codemirror/state` (and one `@codemirror/view`):
extensions are recognised by identity, so a language package holding a different copy hands
the editor values it rejects ("Unrecognized extension value in extension set"), and every
`<tosi-code>` renders blank while the build and the tests stay green.

It arrives through an ordinary upgrade. A lockfile that pinned an older hoisted
`@codemirror/state` keeps it, the package manager nests the newer one tosijs-ui now needs
under `node_modules/tosijs-ui/`, and the `lang-*` packages go on resolving the hoisted copy.

Build-time only: it asks the module resolver, which is the thing that decides what loads.
*/
import * as path from 'path';
import { existsSync, readFileSync, realpathSync } from 'fs';
const SHARED = ['@codemirror/state', '@codemirror/view'];
/** The package directory a resolved file belongs to (the one holding its package.json). */
function packageDirOf(file) {
    let dir = path.dirname(file);
    while (dir !== path.dirname(dir)) {
        if (existsSync(path.join(dir, 'package.json')))
            return dir;
        dir = path.dirname(dir);
    }
    return path.dirname(file);
}
function resolveFrom(specifier, from) {
    try {
        return realpathSync(Bun.resolveSync(specifier, from));
    }
    catch {
        return null;
    }
}
/**
 * For each package that must be shared, the distinct copies reachable from tosijs-ui, from
 * every `@codemirror/*` package it depends on, and from tjs-lang's editor extension. More than one path for a name is
 * the defect. `uiDir` is where tosijs-ui itself is installed.
 */
export function codemirrorCopies(root, uiDir) {
    let deps = [];
    try {
        const pkg = JSON.parse(readFileSync(path.join(uiDir, 'package.json'), 'utf8'));
        deps = Object.keys(pkg.dependencies ?? {}).filter((name) => name.startsWith('@codemirror/'));
    }
    catch {
        // no package.json to read: only the two direct resolutions are compared
    }
    // Where each CodeMirror package tosijs-ui uses actually lives: each resolves its OWN
    // dependencies from there, which is where a second copy shows up.
    /*
    NOT the project root. A project may hold its own, unrelated `@codemirror/state` for an
    editor of its own, beside a consistent set under tosijs-ui: that is two copies in the
    install and no defect. The defect is the packages the editor is BUILT FROM disagreeing,
    and the upgrade case shows up there, since the hoisted `lang-*` resolve the hoisted copy.
    */
    const origins = new Set([uiDir]);
    for (const dep of deps) {
        const resolved = resolveFrom(dep, uiDir);
        if (resolved)
            origins.add(packageDirOf(resolved));
    }
    // tjs-lang's CodeMirror extension is bundled into the same editor (see bundle-guard.ts).
    const tjs = resolveFrom('tjs-lang/editors/codemirror', root);
    if (tjs)
        origins.add(packageDirOf(tjs));
    const copies = {};
    for (const name of SHARED) {
        const found = new Set();
        for (const origin of origins) {
            const resolved = resolveFrom(name, origin);
            if (resolved)
                found.add(packageDirOf(resolved));
        }
        copies[name] = [...found].sort();
    }
    return copies;
}
/** What to say about `codemirrorCopies`' answer, or null when each package has one copy. */
export function duplicateCodemirrorWarning(copies) {
    const doubled = Object.entries(copies).filter(([, dirs]) => dirs.length > 1);
    if (doubled.length === 0)
        return null;
    return (`\n⚠️  This install has more than one copy of a CodeMirror package that must be shared:\n` +
        doubled
            .map(([name, dirs]) => `    ${name}\n` + dirs.map((dir) => `      ${dir}\n`).join(''))
            .join('') +
        `    CodeMirror recognises extensions by identity, so in a bundle built from this install\n` +
        `    every <tosi-code> renders blank ("Unrecognized extension value in extension set")\n` +
        `    and nothing fails. It usually follows an upgrade: the lockfile kept an older hoisted\n` +
        `    copy. Bring them back to one:\n` +
        `        bun update ${doubled
            .map(([name]) => name)
            .join(' ')}    (npm: npm dedupe)\n`);
}
/** tosijs-ui's own package directory, found from this module's location. */
export function tosijsUiDir(moduleDir) {
    let dir = moduleDir;
    while (dir !== path.dirname(dir)) {
        const file = path.join(dir, 'package.json');
        if (existsSync(file)) {
            try {
                if (JSON.parse(readFileSync(file, 'utf8')).name === 'tosijs-ui') {
                    return dir;
                }
            }
            catch {
                // unreadable: keep walking up
            }
        }
        dir = path.dirname(dir);
    }
    return moduleDir;
}
