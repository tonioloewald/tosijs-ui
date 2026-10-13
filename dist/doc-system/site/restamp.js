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
disk, applies the same registration check `buildSite` applies to a `bundleEntry`, and then
rewrites the stamp in every page. It is for a site with NO `bundleEntry`: one that has a
`bundleEntry` hydrates from a hash-named bundle and never loads `scriptUrl`.
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
 * What is wrong with the scripts the pages hydrate from, or null. ONE wording and one rule,
 * for `buildSite` (asked of a `bundleEntry`'s output) and `restampSite` (asked of a file the
 * project wrote itself). `subject` names what was read; `fix` says where the import goes.
 */
export function servedBundleProblem(source, subject, docsHaveExamples, fix = `the bundle's entry`) {
    const reg = bundleRegistrations(source);
    if (!reg.docSystem) {
        return (`\n⚠️  ${subject} does not register <tosi-doc-system>, so every page will render\n` +
            `    its prerendered markup and nothing else: no header, no nav, no menu, no live\n` +
            `    examples, no doc tests, and no error in the console.\n\n` +
            `    The root \`tosijs-ui\` import does not include the doc system (since 1.14.0),\n` +
            `    and a bundle of your own REPLACES tosijs-ui's; it does not extend it. Add:\n` +
            `        import 'tosijs-ui/doc-browser'\n` +
            (docsHaveExamples && !reg.liveExample
                ? `        import 'tosijs-ui/live-example'   // this corpus has live examples\n`
                : '') +
            `    to ${fix}.\n`);
    }
    if (docsHaveExamples && !reg.liveExample) {
        return (`\n⚠️  This corpus has executable fences but ${subject} does not register\n` +
            `    <tosi-example>. Add \`import 'tosijs-ui/live-example'\` to ${fix};\n` +
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
    /*
    A `bundleEntry` site hydrates from `hydrate-<hash>.js`, whose name already carries its
    hash, and its pages do not load `scriptUrl` at all. There is nothing to replace and
    nothing to re-stamp; saying "run buildSite first" straight after a build would misdirect.
    */
    if (config.bundleEntry || hydrateEntryIn(publicDir)) {
        throw new Error(`restampSite: this site hydrates from the bundle buildSite builds from bundleEntry, not from ${scriptUrl}. ` +
            `restampSite is for a site with no bundleEntry whose ${scriptUrl} is replaced after the build.`);
    }
    if (!existsSync(scriptPath)) {
        throw new Error(`restampSite: ${scriptPath} does not exist.`);
    }
    /*
    Only the URLs the generator wrote: a `src` or `href` attribute ending in the asset's name.
    A page whose PROSE mentions `iife.js?v=1.2.3` must not be read as carrying that stamp, or
    have its text rewritten while the real tag is left stale.
    */
    const stampedUrl = (name) => new RegExp(`((?:src|href)=["'][^"'<>]*${escapeRegExp(name)})\\?v=([^"'&\\s<>]+)`, 'g');
    const assets = [scriptName, 'doc-system.css'];
    const pages = htmlFiles(publicDir);
    let previous;
    for (const file of pages) {
        previous = stampedUrl(scriptName).exec(readFileSync(file, 'utf8'))?.[2];
        if (previous)
            break;
    }
    if (!previous) {
        throw new Error(`restampSite: no page in ${publicDir} loads ${scriptName}?v=…, so there is nothing to re-stamp. Run buildSite first.`);
    }
    const { stamp, missing } = await computeAssetStamp(assetStampInputs(publicDir, scriptName), previous);
    if (missing.length) {
        throw new Error(`restampSite: missing asset(s) the stamp covers: ${missing.join(', ')}`);
    }
    /*
    The same question buildSite asks of a bundleEntry, of the file that is really served.
    Asked BEFORE any page is written: under `strict` a refused bundle must leave the site as
    it was, not freshly cache-busted around a bundle that does nothing.
    */
    registerSiteDialects(config);
    const docsJson = config.docsJson ?? 'demo/docs.json';
    let corpus;
    try {
        corpus = JSON.parse(readFileSync(docsJson, 'utf8'));
    }
    catch (error) {
        // Not skipped: without the corpus the live-example half of the check cannot run, and a
        // check that quietly did less than it claims is how a strict build passes a broken site.
        throw new Error(`restampSite: cannot read the corpus at ${docsJson} (${error.message}), so it cannot tell whether the bundle needs <tosi-example>. Pass the same config buildSite was given.`, { cause: error });
    }
    const docsHaveExamples = liveFenceLanguages(corpus, config.liveExamples).size > 0;
    const problem = servedBundleProblem(readFileSync(scriptPath, 'utf8'), `/${scriptName}`, docsHaveExamples);
    if (problem)
        misconfigured(config.strict, problem);
    let carrying = 0;
    let changed = 0;
    for (const file of pages) {
        const html = readFileSync(file, 'utf8');
        let next = html;
        let found = false;
        for (const name of assets) {
            next = next.replace(stampedUrl(name), (_all, url) => {
                found = true;
                return `${url}?v=${stamp}`;
            });
        }
        if (!found)
            continue;
        carrying += 1;
        if (next === html)
            continue;
        writeFileSync(file, next);
        changed += 1;
    }
    return { stamp, previous, pages: carrying, changed };
}
