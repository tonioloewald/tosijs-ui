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
import { existsSync } from 'fs';
import { gzipSync } from 'zlib';
import { $ } from 'bun';
import { extractDocs } from './docs';
import { ensureSections } from './sections';
import { generateLlmsTxt } from './make-llms-txt';
import { generateSite } from './generate-site';
export async function buildSite(config) {
    const PROJECT_ROOT = './';
    const PUBLIC = path.resolve(PROJECT_ROOT, config.outputDir ?? 'docs');
    const DIST = path.resolve(PROJECT_ROOT, 'dist');
    // ── prebuild ──────────────────────────────────────────────────────────────
    console.time('prebuild');
    // Project-specific codegen (version stamp, icon data, …) before anything else.
    await config.prebuild?.();
    await $ `rm -rf ${PUBLIC}`.text();
    await $ `mkdir ${PUBLIC}`.text();
    const extract = () => extractDocs({
        paths: config.docPaths ?? ['src', 'README.md'],
        // Skip the build's own output dir by path (not by the name 'docs', so a
        // source dir like src/docs is still scanned).
        ignore: ['node_modules', 'dist', 'build', PUBLIC],
        output: 'demo/docs.json',
    });
    extract();
    // Auto-create missing section docs + regenerate their TOC blocks, then
    // re-extract so the corpus reflects the on-disk changes.
    ensureSections({
        docsJsonPath: 'demo/docs.json',
        sectionsDir: config.sectionsDir ?? 'src/docs',
        reExtract: extract,
    });
    // Copy static-asset dirs into the web root.
    const staticDirs = config.staticDirs ?? (existsSync('demo/static') ? ['demo/static'] : ['static']);
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
    if (config.emitLibrary) {
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
        // IIFE externals become a synchronous require() shim that throws at
        // module-eval ("Dynamic require of … is not supported") — the build still
        // succeeds, so warn rather than fail silently.
        if (config.bundleExternals && config.bundleExternals.length > 0) {
            console.warn(`⚠️  bundleExternals in an IIFE bundle (${config.bundleExternals.join(', ')}): Bun emits a dynamic require() shim that throws at runtime. Load these\n` +
                `    via import() (dynamically, so the bundler keeps them async) or an importmap, not a static import.`);
        }
        const result = await Bun.build({
            entrypoints: [config.bundleEntry],
            outdir: DIST,
            sourcemap: 'linked',
            format: 'iife',
            minify: true,
            naming: scriptName,
            external: ['sucrase', ...(config.bundleExternals ?? [])],
        });
        if (!result.success) {
            console.error('bundle build failed');
            for (const message of result.logs)
                console.error(message);
            return false;
        }
        await $ `cp ${DIST}/${scriptName} ${PUBLIC}`.text();
        const bundleFile = await Bun.file(`${DIST}/${scriptName}`).arrayBuffer();
        // import.meta is illegal in a classic <script> — if it survived bundling
        // (a branch the bundler couldn't eliminate) the IIFE will SyntaxError.
        if (Buffer.from(bundleFile).toString('utf8').includes('import.meta')) {
            console.warn(`⚠️  ${scriptName} contains \`import.meta\`, which is a SyntaxError in a classic <script>.\n` +
                `    A dependency referenced it in a branch the bundler couldn't drop — mark that dep external\n` +
                `    (+ importmap) or choose a browser-only entry point.`);
        }
        const bundleGzip = gzipSync(Buffer.from(bundleFile));
        console.log(`${scriptName}: ${(bundleFile.byteLength / 1024).toFixed(1)}kb (${(bundleGzip.length / 1024).toFixed(1)}kb gzip)`);
    }
    if (config.llmsTxt !== false) {
        if (typeof config.llmsTxt === 'function') {
            const corpus = JSON.parse(await Bun.file('demo/docs.json').text());
            await Bun.write('llms.txt', config.llmsTxt(corpus));
        }
        else {
            generateLlmsTxt('llms.txt', {
                name: config.name,
                description: config.description,
                baseUrl: config.baseUrl,
                projectLinks: config.projectLinks,
            });
        }
    }
    // Generate the static, pre-rendered doc site (one /slug/index.html per doc).
    // Runs after the static-asset copy so the generated index.html (README) wins,
    // and after the bundle copy so every page's <script src> resolves.
    const docs = JSON.parse(await Bun.file('demo/docs.json').text());
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
        headExtra: config.headExtra,
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
    await $ `bun ${genCss} ${PUBLIC}/doc-system.css ${JSON.stringify(config.theme || {})}`.text();
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
    console.timeEnd('build');
    return true;
}
