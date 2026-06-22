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
import { existsSync, mkdirSync } from 'fs';
import { gzipSync } from 'zlib';
import { $ } from 'bun';
import { extractDocs } from './docs';
import { ensureSections } from './sections';
import { generateLlmsTxt } from './make-llms-txt';
import { generateSite } from './generate-site';
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
    await $ `rm -rf ${PUBLIC}`.text();
    await $ `mkdir ${PUBLIC}`.text();
    const extract = () => extractDocs({
        paths: config.docPaths ?? ['src', 'README.md'],
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
    if (config.libraryTsconfig) {
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
        // Warn only when an external actually compiled to a synchronous require()
        // shim, which throws at module-eval ("Dynamic require of … is not
        // supported"). That only happens for a *static* `import x from 'ext'`. A
        // *dynamic* `import('ext')` is preserved as native `import("ext")` and
        // resolves via the page's importmap — the recommended pattern, so it must
        // stay silent. The config alone can't tell the two apart; the emitted
        // bundle can, so we inspect the actual output.
        if (config.bundleExternals && config.bundleExternals.length > 0) {
            const js = (await Promise.all(result.outputs
                .filter((o) => o.kind === 'entry-point' || o.path.endsWith('.js'))
                .map((o) => o.text()))).join('\n');
            const broken = config.bundleExternals.filter((ext) => new RegExp(`(?:__require|\\brequire)\\(\\s*["'\`]${escapeRegExp(ext)}["'\`]`).test(js));
            if (broken.length > 0) {
                console.warn(`⚠️  bundleExternals compiled to a synchronous require() shim that throws at runtime (${broken.join(', ')}). Reference these via a dynamic import() (kept async by the bundler)\n` +
                    `    or an importmap, not a static import.`);
            }
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
            const corpus = JSON.parse(await Bun.file(DOCS_JSON).text());
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
        // Also place it at the served web root so {baseUrl}/llms.txt resolves (the
        // root copy stays for the npm package's `files`).
        await $ `cp llms.txt ${PUBLIC}/llms.txt`.text();
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
