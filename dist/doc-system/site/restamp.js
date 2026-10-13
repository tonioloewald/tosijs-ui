/*
For a project that REPLACES the hydration bundle after `buildSite` (board #3248).

`buildSite` stamps every page's asset URLs (`iife.js?v=<hash>`) from the bundle IT wrote, and
checks that the bundle it built registers the doc system. A project that then overwrites
that file (tosijs does: its docs bundle aliases `tosijs` to the working source, which a
`bundleEntry` string cannot express) is past both: the stamp describes a file that is no
longer served, so a returning visitor runs the cached library against new pages, and
nothing checks that the replacement registers `<tosi-doc-system>`. Both were silent: a
green build, pages served, and an inert site.

`restampSite` is the step to call after replacing the bundle. It hashes what is actually on
disk, rewrites the stamp in every page, and applies the same registration check `buildSite`
applies to a `bundleEntry`.
*/
import * as path from 'path';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { assetStampInputs, computeAssetStamp } from './asset-stamp.js';
import { bundleRegistrations } from './host-preset.js';
import { liveFenceLanguages, misconfigured } from './build-warnings.js';
import { registerSiteDialects } from './orchestrator.js';
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function htmlFiles(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory())
            return htmlFiles(full);
        return entry.name.endsWith('.html') ? [full] : [];
    });
}
/** The hydration entry `buildSite` emitted for a `bundleEntry`, if there is one. */
export function hydrateEntryIn(publicDir) {
    return readdirSync(publicDir).find((f) => /^hydrate-[a-z0-9]+\.js$/.test(f));
}
/**
 * What is wrong with the bundle the pages will load, or null. `source` is the text of every
 * script the pages hydrate from.
 */
export function servedBundleProblem(source, scriptName, docsHaveExamples) {
    const reg = bundleRegistrations(source);
    if (!reg.docSystem) {
        return (`\n⚠️  /${scriptName} does not register <tosi-doc-system>, so every page will render\n` +
            `    its prerendered markup and nothing else: no header, no nav, no live examples,\n` +
            `    no doc tests, and no error in the console.\n\n` +
            `    The root \`tosijs-ui\` import does not include the doc system (since 1.14.0).\n` +
            `    The bundle's entry needs:\n` +
            `        import 'tosijs-ui/doc-browser'\n` +
            (docsHaveExamples && !reg.liveExample
                ? `        import 'tosijs-ui/live-example'   // this corpus has live examples\n`
                : ''));
    }
    if (docsHaveExamples && !reg.liveExample) {
        return (`\n⚠️  This corpus has executable fences but /${scriptName} does not register\n` +
            `    <tosi-example>. Add \`import 'tosijs-ui/live-example'\` to the bundle's entry;\n` +
            `    the code blocks will render as plain text otherwise.\n`);
    }
    return null;
}
/**
 * Re-stamp a built site from the assets actually on disk, and check the hydration bundle.
 * Call it after replacing `/iife.js` (or whatever `scriptUrl` names) in `outputDir`.
 *
 * Throws when no page carries a stamp (the build did not run, or `outputDir` is wrong): a
 * restamp that silently did nothing is the failure it exists to prevent. A bundle that does
 * not register the doc system is a warning, and fails under `strict: true`, as in
 * `buildSite`.
 */
export async function restampSite(config) {
    const scriptUrl = config.scriptUrl ?? '/iife.js';
    if (/^(https?:)?\/\//.test(scriptUrl)) {
        throw new Error(`restampSite: scriptUrl is ${scriptUrl}, which this build does not serve; there is no local bundle to stamp.`);
    }
    const publicDir = path.resolve(config.outputDir ?? 'docs');
    const scriptName = scriptUrl.replace(/^\//, '');
    const scriptPath = path.join(publicDir, scriptName);
    if (!existsSync(scriptPath)) {
        throw new Error(`restampSite: ${scriptPath} does not exist.`);
    }
    const hydrateName = hydrateEntryIn(publicDir);
    const pages = htmlFiles(publicDir);
    const stamped = new RegExp(`${escapeRegExp(scriptName)}\\?v=([^"'&\\s<>]+)`);
    let previous;
    for (const file of pages) {
        previous = stamped.exec(readFileSync(file, 'utf8'))?.[1];
        if (previous)
            break;
    }
    if (!previous) {
        throw new Error(`restampSite: no page in ${publicDir} references ${scriptName}?v=…, so there is nothing to re-stamp. Run buildSite first.`);
    }
    const { stamp, missing } = await computeAssetStamp(assetStampInputs(publicDir, scriptName, hydrateName), previous);
    if (missing.length) {
        throw new Error(`restampSite: missing asset(s) the stamp covers: ${missing.join(', ')}`);
    }
    let carrying = 0;
    let changed = 0;
    const from = `?v=${previous}`;
    const to = `?v=${stamp}`;
    for (const file of pages) {
        const html = readFileSync(file, 'utf8');
        if (!html.includes(from))
            continue;
        carrying += 1;
        if (from === to)
            continue;
        writeFileSync(file, html.split(from).join(to));
        changed += 1;
    }
    // The same question buildSite asks of a bundleEntry, of the file that is really served.
    let docsHaveExamples = false;
    try {
        registerSiteDialects(config);
        const corpus = JSON.parse(readFileSync(config.docsJson ?? 'demo/docs.json', 'utf8'));
        docsHaveExamples = liveFenceLanguages(corpus, config.liveExamples).size > 0;
    }
    catch {
        // corpus unreadable: the doc-system check still stands on its own
    }
    let source = readFileSync(scriptPath, 'utf8');
    if (hydrateName) {
        for (const name of readdirSync(publicDir)) {
            if (/^(hydrate|chunk)-[a-z0-9]+\.js$/.test(name)) {
                source += readFileSync(path.join(publicDir, name), 'utf8');
            }
        }
    }
    const problem = servedBundleProblem(source, scriptName, docsHaveExamples);
    if (problem)
        misconfigured(config.strict, problem);
    return { stamp, previous, pages: carrying, changed };
}
