/*
Build orchestrator for the static doc-site system.

`buildSite(config)` runs the full pipeline:
  prebuild — config.prebuild() hook, extract docs, copy static assets
  build    — (optional library tsc), hydration bundle, llms.txt,
             static-site generation, burned-in theme stylesheet

NOTE: keep heavy/icon imports OUT of this module's static graph. generate-css
runs as a SEPARATE subprocess on purpose — importing the full tosijs module or
the icon system here would put src/icon-data.ts into `bun --watch`'s graph and
cause an endless rebuild loop.
*/
import * as path from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { gzipSync } from 'zlib';
import { $, spawn } from 'bun';
import { extractDocs } from './docs';
import { checkExamples, formatExampleProblems } from './check-examples';
import { ensureSections } from './sections';
import { generateLlmsTxt } from './make-llms-txt';
import { generateSite } from './generate-site';
import { findOutputDirOverlap } from './output-guard';
import { tjsEditorExternal, tjsEditorLeakedAsExternal, classicScriptSyntaxErrorInChild, } from './bundle-guard';
// Module specifiers contain regex metacharacters (`/`, `.`, `@`, …), so escape
// before interpolating into the require-shim detector below.
/** Give up on a hung ePub child rather than wedge the dev server's rebuild. */
const EPUB_TIMEOUT_MS = 120_000;
/**
 * Run buildEpub() in a child process.
 *
 * buildEpub drives happy-dom (HTML→XHTML for every chapter) and @resvg/resvg-js
 * (cover raster) — both native, both retaining — and it runs on EVERY dev rebuild,
 * so in-process it strands memory in a watch process that lives for days. The child
 * hands it all back on exit. If it hangs we kill it, and if it fails we warn: the
 * ePub is a side artifact, so neither should block the page you're trying to look at.
 *
 * Only the data buildEpub reads is forwarded — SiteConfig also carries functions
 * (llmsTxt, libraryBuild, prebuild) that don't survive JSON.
 */
async function buildEpubInChild(config, opts) {
    // Resolve the sibling relative to THIS module so it works both in-repo (.ts)
    // and when shipped (compiled .js) — same trick as generate-css below.
    const cliTs = `${import.meta.dir}/epub-cli.ts`;
    const cli = existsSync(cliTs) ? cliTs : `${import.meta.dir}/epub-cli.js`;
    const payload = {
        config: {
            basePath: config.basePath,
            baseUrl: config.baseUrl,
            book: config.book,
            docsJson: config.docsJson,
            favicon: config.favicon,
            lang: config.lang,
            name: config.name,
            outputDir: config.outputDir,
        },
        opts,
    };
    const payloadPath = path.join(tmpdir(), `tosijs-epub-${process.pid}.json`);
    await Bun.write(payloadPath, JSON.stringify(payload));
    const child = spawn(['bun', cli, payloadPath], {
        stdout: 'inherit',
        stderr: 'inherit',
    });
    const killer = setTimeout(() => {
        console.warn(`⚠️  epub build exceeded ${EPUB_TIMEOUT_MS / 1000}s — killing it. The site is\n` + `    fine; the .epub may be stale.`);
        child.kill();
    }, EPUB_TIMEOUT_MS);
    try {
        const code = await child.exited;
        if (code !== 0) {
            console.warn(`⚠️  epub build failed (exit ${code}). The site is fine; the .epub may be stale.`);
        }
    }
    finally {
        clearTimeout(killer);
        try {
            unlinkSync(payloadPath);
        }
        catch {
            // already gone — fine
        }
    }
}
// Module specifiers contain regex metacharacters (`/`, `.`, `@`, …), so escape
// before interpolating into the require-shim detector below.
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export async function buildSite(config) {
    const PROJECT_ROOT = './';
    const PUBLIC = path.resolve(PROJECT_ROOT, config.outputDir ?? 'docs');
    const DIST = path.resolve(PROJECT_ROOT, 'dist');
    // Intermediate corpus the build extracts to and re-reads. Default keeps the
    // legacy 'demo/docs.json' location, but we mkdir -p its directory so a project
    // without a demo/ folder doesn't fail with ENOENT on the very first write
    // (which would abort the whole build, every build, and leave the dev server
    // SPA-fallback serving index.html for /iife.js).
    const DOCS_JSON = config.docsJson ?? 'demo/docs.json';
    mkdirSync(path.dirname(path.resolve(PROJECT_ROOT, DOCS_JSON)), {
        recursive: true,
    });
    // ── prebuild ──────────────────────────────────────────────────────────────
    console.time('prebuild');
    // Project-specific codegen (version stamp, icon data, …) before anything else.
    await config.prebuild?.();
    // Guard before the destructive `rm -rf`: if a docPath overlaps the output dir,
    // wiping the output would delete the source docs we're about to extract.
    const docPaths = config.docPaths ?? ['src', 'README.md'];
    const overlap = findOutputDirOverlap(docPaths, config.outputDir ?? 'docs', PROJECT_ROOT);
    if (overlap) {
        throw new Error(`doc-site build: docPath "${overlap}" overlaps outputDir "${config.outputDir ?? 'docs'}". ` +
            'buildSite() runs `rm -rf <outputDir>` before extracting docs, so this would ' +
            'delete your source docs first (producing an empty site with no error). Move the ' +
            "source docs out of the output dir, or set a different outputDir (e.g. outputDir: 'site').");
    }
    await $ `rm -rf ${PUBLIC}`.text();
    await $ `mkdir ${PUBLIC}`.text();
    const extract = () => extractDocs({
        paths: docPaths,
        // Skip the build's own output dir by path (not by the name 'docs', so a
        // source dir like src/docs is still scanned).
        ignore: ['node_modules', 'dist', 'build', PUBLIC],
        output: DOCS_JSON,
    });
    extract();
    // Auto-create missing section docs + regenerate their TOC blocks, then
    // re-extract so the corpus reflects the on-disk changes.
    ensureSections({
        docsJsonPath: DOCS_JSON,
        sectionsDir: config.sectionsDir ?? 'src/docs',
        reExtract: extract,
    });
    // Fail fast on any live example that can't build — a real syntax/import error,
    // or illustrative code mistakenly tagged executable (`js`/`ts`/…) instead of
    // display-only `typescript`. Runs on the whole corpus, so it catches breakage
    // on pages the browser test never navigates to.
    if (config.checkExamples !== false) {
        const corpus = JSON.parse(await Bun.file(DOCS_JSON).text());
        const problems = await checkExamples(corpus);
        if (problems.length) {
            throw new Error(`doc-site build: ${problems.length} live example(s) failed to build:\n\n` +
                formatExampleProblems(problems) +
                `\n\nFix the code, or — if a block is illustrative and not meant to run —` +
                ` tag it with a display-only language like \`typescript\` instead of` +
                ` \`js\`/\`ts\`. (Disable with checkExamples: false.)`);
        }
    }
    // Copy static-asset dirs into the web root.
    const staticDirs = config.staticDirs ??
        (existsSync('demo/static') ? ['demo/static'] : ['static']);
    for (const dir of staticDirs) {
        if (existsSync(dir))
            await $ `cp -R ${dir}/. ${PUBLIC}`.text();
    }
    await $ `rm -rf ${DIST}`.text();
    await $ `mkdir ${DIST}`.text();
    console.timeEnd('prebuild');
    // ── build ───────────────────────────────────────────────────────────────
    console.time('build');
    // Optionally also build the library (ESM + type declarations) — for repos
    // whose single build publishes both an npm package and its doc site.
    if (config.libraryBuild) {
        // Full override — the consumer owns emitting dist/*.js + *.d.ts for ALL
        // sources (e.g. tsc for `.ts` + `tjs convert`/`generateDTS` for native `.tjs`
        // that tsc can't compile). See BUILD-TJS-HOOK.md.
        await config.libraryBuild({
            dist: DIST,
            root: path.resolve(PROJECT_ROOT),
            tsconfig: config.libraryTsconfig,
        });
    }
    else if (config.libraryTsconfig) {
        // Consumer-controlled library build (handles root noEmit, removeComments,
        // outDir, etc.).
        try {
            await $ `bun tsc -p ${config.libraryTsconfig}`;
        }
        catch {
            console.log('library (tsc -p) build finished');
        }
    }
    else if (config.emitLibrary) {
        try {
            await $ `bun tsc --declaration --incremental --outDir dist`;
        }
        catch {
            console.log('esm + types created');
        }
    }
    // The hydration bundle. If bundleEntry is set we build it (IIFE), else pages
    // load config.scriptUrl (default /iife.js) — a prebuilt/CDN bundle the
    // consumer supplies (e.g. via staticDirs or an absolute URL).
    const scriptName = (config.scriptUrl ?? '/iife.js').replace(/^\//, '');
    if (config.bundleEntry) {
        // tjs-lang's TRANSPILER (browser bundles) is dynamically import()'d at
        // runtime (same-origin `/tjs/` copy, else CDN), so keep it out of the bundle.
        //
        // `tjs-lang/editors/codemirror` (the CodeMirror language + autocomplete) is
        // different: it MUST share the editor's CodeMirror instance, so it has to be
        // bundled IN — a separately loaded copy carries its own `@codemirror/state`
        // and silently no-ops. So we do NOT externalize it *when tjs-lang is
        // installed*. But tjs-lang is an OPTIONAL peer; if it's absent, bundling would
        // fail to resolve, so we externalize it in that case (the runtime import then
        // no-ops to plain TS highlighting — graceful degradation).
        //
        // NB: bare `'tjs-lang'` must NOT appear here. Externals are PREFIX matches, so
        // it would silently externalize tjs-lang/editors/codemirror along with it.
        const externals = [
            'tjs-lang/browser',
            'tjs-lang/browser/from-ts',
            ...tjsEditorExternal(PROJECT_ROOT),
            ...(config.bundleExternals ?? []),
        ];
        // UPSTREAM STATUS (2026-07-13): confirmed by Bun and a fix is in flight —
        // oven-sh/bun#34054, still OPEN/unmerged, so no released Bun has it. Root cause
        // is not a malloc leak (LSAN sees ~5KB unreachable): the memory is freed but
        // mimalloc never purges it back to the OS. Revisit going back in-process only
        // once that lands in a version we require — and even then the child is ~30ms and
        // immune to the whole class, so the bar for reverting is "measurably worth it",
        // not "the bug is fixed". The Bun.Transpiler half (see check-examples.ts) is not
        // covered by that PR at all.
        //
        // Bundle in a CHILD PROCESS, not via Bun.build().
        //
        // Bun.build() never gives back the bundler's native arena: measured at ~9MB
        // of RSS per call and rising, monotonic, with no plateau (40 sequential
        // builds of one real entry = +367MB, still climbing ~5MB/build at the end),
        // while the JS heap stays flat — so it is invisible to Bun.gc() and to any
        // heap profiler. devServer() calls this once per rebuild in a process that
        // lives for DAYS, so it compounds: a ~2-day watch session reached 136GB RSS
        // and took the machine down with it. Filed as oven-sh/bun#34053.
        //
        // The CLI does identical work in a child whose memory the OS reclaims on
        // exit: the same 15 bundles leave the parent +0.5MB instead of +192MB.
        // Keep these flags in sync with the Bun.build() options they replace.
        const bundle = spawn([
            'bun',
            'build',
            config.bundleEntry,
            '--outdir',
            DIST,
            '--sourcemap=linked',
            '--format=iife',
            '--minify',
            '--entry-naming',
            scriptName,
            ...externals.flatMap((ext) => ['--external', ext]),
        ], { stdout: 'inherit', stderr: 'inherit' });
        if ((await bundle.exited) !== 0) {
            console.error('bundle build failed');
            return false;
        }
        await $ `cp ${DIST}/${scriptName} ${PUBLIC}`.text();
        const bundleFile = await Bun.file(`${DIST}/${scriptName}`).arrayBuffer();
        const bundleJs = Buffer.from(bundleFile).toString('utf8');
        // Warn only when an external actually compiled to a synchronous require()
        // shim, which throws at module-eval ("Dynamic require of … is not
        // supported"). That only happens for a *static* `import x from 'ext'`. A
        // *dynamic* `import('ext')` is preserved as native `import("ext")` and
        // resolves via the page's importmap — the recommended pattern, so it must
        // stay silent. The config alone can't tell the two apart; the emitted
        // bundle can, so we inspect the actual output.
        if (config.bundleExternals && config.bundleExternals.length > 0) {
            const broken = config.bundleExternals.filter((ext) => new RegExp(`(?:__require|\\brequire)\\(\\s*["'\`]${escapeRegExp(ext)}["'\`]`).test(bundleJs));
            if (broken.length > 0) {
                console.warn(`⚠️  bundleExternals compiled to a synchronous require() shim that throws at runtime (${broken.join(', ')}). Reference these via a dynamic import() (kept async by the bundler)\n` +
                    `    or an importmap, not a static import.`);
            }
        }
        // The IIFE must parse as a classic <script>. `import.meta` is the usual way it
        // doesn't (a branch the bundler couldn't eliminate) — and it's a SyntaxError, so
        // the whole bundle fails to evaluate and the page never hydrates. Compile it
        // (without running it) rather than grepping: the substring also occurs inside
        // string literals — acorn's error messages contain it — which made the old grep
        // fire on every build while the bundle was fine.
        const syntaxError = await classicScriptSyntaxErrorInChild(`${DIST}/${scriptName}`);
        if (syntaxError) {
            console.error(`⚠️  ${scriptName} does not parse as a classic <script>: ${syntaxError}\n` +
                `    The page will not hydrate. If a dependency pulled in \`import.meta\`, mark it\n` +
                `    external (+ importmap) or choose a browser-only entry point.`);
            return false;
        }
        // tjs-lang's CodeMirror extension MUST be bundled, not externalized — a separate
        // copy carries its own @codemirror/state and silently no-ops (tjs highlighting and
        // autocomplete just stop working, with no error anywhere). If it was externalized,
        // the bundler leaves its specifier behind. Failing the build is the only way this
        // gets noticed; every test lane stays green when it regresses.
        if (tjsEditorExternal(PROJECT_ROOT).length === 0 &&
            tjsEditorLeakedAsExternal(bundleJs)) {
            console.error(`⚠️  ${scriptName} externalized tjs-lang's CodeMirror extension instead of bundling it.\n` +
                `    It must share the editor's single CodeMirror instance; a separately loaded copy\n` +
                `    silently no-ops. Check the bundle's \`external\` list — entries are PREFIX matches,\n` +
                `    so a bare 'tjs-lang' externalizes tjs-lang/editors/codemirror along with it.`);
            return false;
        }
        const bundleGzip = gzipSync(Buffer.from(bundleFile));
        console.log(`${scriptName}: ${(bundleFile.byteLength / 1024).toFixed(1)}kb (${(bundleGzip.length / 1024).toFixed(1)}kb gzip)`);
    }
    else if (!/^(https?:)?\/\//.test(config.scriptUrl ?? '/iife.js')) {
        // No custom bundleEntry (the normal case for a pure-docs / book site) and a
        // local scriptUrl: pages still load it to hydrate. Nothing emits it, so it
        // 404s and the site never hydrates. Ship tosijs-ui's own published iife.js
        // (version-matched, offline) so a no-code adopter works out of the box.
        try {
            const iife = Bun.resolveSync('tosijs-ui/iife', PROJECT_ROOT);
            await $ `cp ${iife} ${PUBLIC}/${scriptName}`.text();
            if (existsSync(`${iife}.map`)) {
                await $ `cp ${iife}.map ${PUBLIC}/${scriptName}.map`.text();
            }
            console.log(`hydration bundle: tosijs-ui/iife.js → /${scriptName}`);
        }
        catch {
            console.warn(`⚠️  No bundleEntry set and tosijs-ui's iife.js couldn't be resolved — pages\n` +
                `    will 404 on /${scriptName} and won't hydrate. Install tosijs-ui, set\n` +
                `    bundleEntry, or supply ${scriptName} via staticDirs / an absolute scriptUrl.`);
        }
    }
    if (config.llmsTxt !== false) {
        // Drive llms.txt from the extracted corpus (every doc, by rendered URL) — not
        // a re-scan of src/*.ts — so it works regardless of doc source (.md, etc.)
        // and whether the project emits a dist/ library.
        const corpus = JSON.parse(await Bun.file(DOCS_JSON).text());
        if (typeof config.llmsTxt === 'function') {
            await Bun.write('llms.txt', config.llmsTxt(corpus));
        }
        else {
            generateLlmsTxt('llms.txt', {
                name: config.name,
                description: config.description,
                baseUrl: config.baseUrl,
                projectLinks: config.projectLinks,
            }, corpus);
        }
        // Also place it at the served web root so {baseUrl}/llms.txt resolves (the
        // root copy stays for the npm package's `files`).
        await $ `cp llms.txt ${PUBLIC}/llms.txt`.text();
    }
    // Serve the tjs-lang browser bundles SAME-ORIGIN so live examples never depend
    // on a third-party CDN's propagation timing — a freshly-published tjs-lang
    // version 404s on a CDN until it caches it (minutes–hours), which would break
    // every example. We ship the exact bundles the build resolved, and a global
    // tells the loader to prefer them (it falls back to the CDN chain if absent).
    // Optional: skipped if tjs-lang isn't installed.
    let tjsHead = '';
    try {
        const browser = Bun.resolveSync('tjs-lang/browser', PROJECT_ROOT);
        const fromTs = Bun.resolveSync('tjs-lang/browser/from-ts', PROJECT_ROOT);
        await $ `mkdir -p ${PUBLIC}/tjs`.text();
        await $ `cp ${browser} ${PUBLIC}/tjs/tjs-browser.js`.text();
        await $ `cp ${fromTs} ${PUBLIC}/tjs/tjs-browser-from-ts.js`.text();
        const bp = config.basePath;
        const base = !bp || bp === '/' ? '/tjs/' : bp.replace(/\/$/, '') + '/tjs/';
        tjsHead = `<script>globalThis.__TJS_LOCAL_BASE=${JSON.stringify(base)}</script>`;
        console.log(`tjs-lang bundles served same-origin at ${base}`);
    }
    catch {
        // tjs-lang not installed — live examples fall back to the CDN chain
    }
    // Generate the static, pre-rendered doc site (one /slug/index.html per doc).
    // Runs after the static-asset copy so the generated index.html (README) wins,
    // and after the bundle copy so every page's <script src> resolves.
    const docs = JSON.parse(await Bun.file(DOCS_JSON).text());
    const pageCount = await generateSite({
        docs,
        outputDir: PUBLIC,
        projectName: config.name,
        description: config.description,
        baseUrl: config.baseUrl,
        lang: config.lang,
        projectLinks: config.projectLinks,
        navbarLinks: config.navbarLinks,
        localizedStrings: config.localizedStrings,
        favicon: config.favicon,
        ogImage: config.ogImage,
        headExtra: [config.headExtra, tjsHead].filter(Boolean).join('') || undefined,
        scriptUrl: config.scriptUrl,
        basePath: config.basePath,
    });
    // Burn the theme into a static stylesheet (separate subprocess — see
    // generate-css.ts). Resolve the sibling relative to THIS module so it works
    // both in-repo (.ts) and when shipped (compiled .js).
    const genCssTs = `${import.meta.dir}/generate-css.ts`;
    const genCss = existsSync(genCssTs)
        ? genCssTs
        : `${import.meta.dir}/generate-css.js`;
    // generate-css imports the consumer's library to burn the theme; when that graph
    // reaches non-`.ts` sources (e.g. `.tjs`), `--preload` a module that registers the
    // Bun loader plugin so those modules evaluate. (See BUILD-TJS-HOOK.md.)
    const themeArg = JSON.stringify(config.theme || {});
    await (config.generateCssPreload
        ? $ `bun --preload ${config.generateCssPreload} ${genCss} ${PUBLIC}/doc-system.css ${themeArg}`
        : $ `bun ${genCss} ${PUBLIC}/doc-system.css ${themeArg}`).text();
    console.log(`generated ${pageCount} static pages`);
    // ── host preset files ──
    // Idempotent, and an explicit static file (copied from staticDirs) always wins.
    if (config.host === 'github-pages') {
        await Bun.write(`${PUBLIC}/.nojekyll`, '');
        const domain = config.domain ??
            (config.baseUrl ? new URL(config.baseUrl).hostname : undefined);
        if (domain && !existsSync(`${PUBLIC}/CNAME`)) {
            await Bun.write(`${PUBLIC}/CNAME`, `${domain}\n`);
        }
    }
    else if (config.host === 'firebase' && !existsSync('firebase.json')) {
        await Bun.write('firebase.json', JSON.stringify({
            hosting: {
                public: config.outputDir ?? 'docs',
                ignore: ['firebase.json', '**/.*', '**/node_modules/**'],
                cleanUrls: true,
            },
        }, null, 2) + '\n');
    }
    // Emit the ePub into the output dir on every build, so it stays in sync with
    // the corpus and survives the `rm -rf <outputDir>` at the top of the NEXT build
    // (otherwise a dev rebuild would silently drop it). Cheap (~0.4s).
    if (config.epub) {
        await buildEpubInChild(config, typeof config.epub === 'object' ? config.epub : {});
    }
    console.timeEnd('build');
    return true;
}
