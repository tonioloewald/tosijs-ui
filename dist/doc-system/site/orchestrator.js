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
import { namedBooks, partitionByBook, DEFAULT_BOOK } from '../book-target.js';
import { listEpubVolumes, renderEpubDownloads } from './epub-volumes.js';
import { buildSlugMap } from '../routing.js';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { $, spawn } from 'bun';
import { extractDocs } from './docs.js';
import { checkExamples, formatExampleProblems, } from './check-examples.js';
import { ensureSections } from './sections.js';
import { generateLlmsTxt } from './make-llms-txt.js';
import { generateSite } from './generate-site.js';
import { findOutputDirOverlap, resolveBundleDir } from './output-guard.js';
import { acquireBuildLock, describeHolder } from './build-lock.js';
import { sourcemapWarning } from './sourcemap-check.js';
import { firebasePublicMismatch } from './host-preset.js';
import { preflight } from './preflight.js';
import { auditDependencies, reportAudit } from './audit-guard.js';
import { gatherBuildStamp, hashOutput, stampToWrite, } from './build-stamp.js';
import { tjsEditorExternal, tjsEditorLeakedAsExternal, classicScriptSyntaxErrorInChild, } from './bundle-guard.js';
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
/**
 * Run checkExamples() in a child process.
 *
 * It compiles every executable block in the corpus with `new AsyncFunction` on every
 * rebuild, and JSC caches compiled code keyed by source text — so it retains, and
 * (because a rebuild only happens when a file CHANGED) the source is fresh every time
 * and nothing dedups. Measured at +7.1MB over 40 rebuilds with fresh sources, still
 * climbing. It also constructs a `Bun.Transpiler` for `ts` blocks (~40KB stranded per
 * construction). The child gives all of it back on exit. See check-examples-cli.ts.
 *
 * Falls back to in-process on any failure to *run* the child: a build must not break
 * because the health-conscious path is unavailable. A child that runs and reports
 * problems is not a failure — that is the whole point of it.
 */
async function checkExamplesInChild(docsJson, importPrefix, contextKeys = []) {
    const cliTs = `${import.meta.dir}/check-examples-cli.ts`;
    const cli = existsSync(cliTs)
        ? cliTs
        : `${import.meta.dir}/check-examples-cli.js`;
    try {
        const child = spawn(['bun', cli, docsJson, ...contextKeys], {
            stdout: 'pipe',
            stderr: 'pipe',
            // When the resolver's on, let the check accept non-context imports (they validate
            // as dynamic `<prefix><spec>` imports rather than throwing "unsupported").
            env: importPrefix
                ? { ...process.env, TOSI_IMPORT_PREFIX: importPrefix }
                : process.env,
        });
        // Drain BOTH pipes while awaiting exit. An undrained pipe fills its buffer, the
        // child blocks writing to it, and we deadlock waiting for an exit that can't come
        // — and the undrained buffer leaks besides.
        const [out, err, code] = await Promise.all([
            new Response(child.stdout).text(),
            new Response(child.stderr).text(),
            child.exited,
        ]);
        if (err.trim())
            console.warn(err.trim());
        if (code !== 0)
            throw new Error(`check-examples exited ${code}`);
        // The child serializes bakes as [filename, [source, {dialect,js}][]][] (Maps
        // can't JSON-roundtrip); rebuild the nested Map here.
        const payload = JSON.parse(out);
        return {
            problems: payload.problems,
            warnings: payload.warnings ?? [],
            bakes: new Map(payload.bakes.map(([file, e]) => [file, new Map(e)])),
        };
    }
    catch (e) {
        console.warn(`⚠️  example check: could not run it in a child (${String(e)}) — ` +
            `falling back to in-process.`);
        const corpus = JSON.parse(await Bun.file(docsJson).text());
        return checkExamples(corpus, {
            ...(importPrefix ? { importPrefix } : {}),
            ...(contextKeys.length ? { contextKeys } : {}),
        });
    }
}
/**
 * Gzip-size a file IN A CHILD. zlib's gzip is native and strands memory the JS heap
 * never sees; a child hands it all back on exit (same reasoning as the bundle/ePub
 * steps — see the Bun.build note). Returns the gzipped byte count, or 0 if it couldn't
 * measure — a size log must never fail a build.
 */
/*
Write `/version.json`, preserving the previous stamp when nothing else changed (#122).

The filesystem half of `stampToWrite` — the decision itself is pure and unit-tested. The
previous stamp is read from LAST_GOOD (the build moves the old output aside rather than
deleting it) rather than from the live output, which this build has already repopulated.

Never fatal: a stamp is diagnostic, and failing a completed build over one would be a worse
outcome than a slightly stale identity.
*/
async function finalizeStamp(publicDir, lastGoodDir, fresh) {
    const target = `${publicDir}/version.json`;
    try {
        const listFiles = async (d) => {
            const out = await $ `find ${d} -type f`.nothrow().quiet().text();
            return out
                .split('\n')
                .filter(Boolean)
                .map((p) => p.slice(d.length + 1));
        };
        const readBytes = async (p) => {
            try {
                return new Uint8Array(await Bun.file(p).arrayBuffer());
            }
            catch {
                return null;
            }
        };
        const contentHash = await hashOutput(publicDir, listFiles, readBytes);
        const previousJson = lastGoodDir
            ? await Bun.file(`${lastGoodDir}/version.json`)
                .text()
                .catch(() => null)
            : null;
        await Bun.write(target, stampToWrite(previousJson, fresh, contentHash));
    }
    catch {
        await Bun.write(target, JSON.stringify(fresh, null, 2) + '\n').catch(() => { });
    }
}
/*
Read a child's stdout+stderr to completion, concurrently.

Draining BOTH pipes matters: an undrained pipe fills its buffer, the child blocks writing to
it, and we wait forever for an exit that cannot come — the same deadlock `checkExamplesInChild`
documents. Concurrently, for the same reason.
*/
async function drainChild(child) {
    const [out, err] = await Promise.all([
        child.stdout ? new Response(child.stdout).text() : Promise.resolve(''),
        child.stderr ? new Response(child.stderr).text() : Promise.resolve(''),
    ]);
    return [out, err].filter((s) => s.trim()).join('\n');
}
async function gzipSizeInChild(file) {
    try {
        const out = await $ `bun -e ${`const {gzipSync}=require('zlib');const b=await Bun.file(${JSON.stringify(file)}).arrayBuffer();process.stdout.write(String(gzipSync(Buffer.from(b)).length))`}`
            .quiet()
            .text();
        return Number(out.trim()) || 0;
    }
    catch {
        return 0;
    }
}
/**
 * Is this lock holder something we can hand work to?
 *
 * Exported so the test can import the SHIPPED predicate. The previous test retyped this
 * condition inside the test file and asserted on the copy, which passed forever and stayed
 * green when the real one was broadened — the 1.13.0 review caught it by mutation.
 *
 * Only a live dev server with a port that can safely reach a URL: a second `bun run build` is
 * not something to hand work to, and an out-of-range or non-integer port is a value that has
 * no business being interpolated (`https://localhost:1@evil/` parses to another host).
 */
export function canDelegateTo(holder) {
    return (holder.role === 'dev-server' &&
        Number.isInteger(holder.port) &&
        holder.port >= 1 &&
        holder.port <= 65535);
}
async function delegateBuild(holder, outputDir) {
    const port = holder.port;
    // `canDelegateTo` already validated this; re-assert so the URL below can never be fed junk.
    if (!Number.isInteger(port) || port < 1 || port > 65535)
        return null;
    console.log(`\n🔁 A dev server is building this tree — asking it to build instead of racing it.\n`);
    const here = path.resolve('./');
    try {
        const url = new URL(`https://localhost:${port}/__build`);
        // The server answers 409 if it builds a different root, rather than silently building
        // something else and reporting success for a tree nothing touched.
        url.searchParams.set('root', here);
        const res = await fetch(url, {
            method: 'POST',
            // Our own dev cert, and this never leaves loopback.
            tls: { rejectUnauthorized: false },
            /*
            Match the SERVER's idle timeout rather than a wish. This was 10 minutes, but `Bun.serve`
            idles connections out at 120s and the handler emits nothing until the build finishes —
            so the socket died at ~120s and a SUCCESSFUL build was reported as a failure telling the
            user to kill a dev server that was mid-rebuild.
            */
            signal: AbortSignal.timeout(115 * 1000),
        });
        if (res.status === 404)
            return null;
        if (res.status === 409) {
            const why = (await res.json().catch(() => ({})));
            console.error(`   ${why.detail ?? 'the dev server builds a different tree'}\n`);
            return null;
        }
        /*
        Believe the reply only if it is recognisably ours.
    
        A dev server predating this endpoint answers the POST with the SPA fallback — 200 and
        index.html — so `res.json()` rejected and every adopter's first build after upgrading
        printed "the dev server's build FAILED". Dev servers here live for days running the code
        they loaded, so that is the NORMAL upgrade path, not an edge case.
        */
        const contentType = res.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) {
            console.error(`   the dev server on ${port} predates this endpoint — restart it to pick up this version.\n`);
            return null;
        }
        const body = (await res.json().catch(() => null));
        if (body === null || typeof body.ok !== 'boolean') {
            console.error(`   unrecognised reply from the dev server on ${port} — restart it.\n`);
            return null;
        }
        /*
        Prove the build was OURS before reporting it.
    
        The lock records a pid and a port; it cannot say the process still owns them. A planted
        lock plus any listener answering `{"ok":true}` made this print "rebuilt this tree" and exit
        0 with the output tree untouched — and stale locks from other projects are the ordinary
        state of a dev machine, including on the shared default port. `outputDir` is checked for
        the same reason: `buildSite` is a public export and the server builds the config it was
        LAUNCHED with, so a caller wanting a different tree would be told about a build it never got.
        */
        if (body.pid !== holder.pid || body.root !== here) {
            console.error(`   the server on ${port} is not the one this project's lock names ` +
                `(pid ${body.pid ?? '?'} building ${body.root ?? '?'}) — not trusting it.\n`);
            return null;
        }
        const wanted = path.resolve(outputDir);
        if (body.outputDir !== undefined && body.outputDir !== wanted) {
            console.error(`   the dev server writes ${body.outputDir}, this build wants ${wanted} — refusing.\n`);
            return null;
        }
        if (body.ok) {
            console.log('✅ dev server rebuilt this tree\n');
            return true;
        }
        console.error(`🛑 the dev server's build FAILED${body.detail ? `: ${body.detail}` : ''}\n`);
        return false;
    }
    catch (err) {
        const why = err.name === 'TimeoutError'
            ? 'it did not answer in time — the build may still be running'
            : err.message;
        console.error(`   could not reach the dev server on ${port} (${why})`);
        return null;
    }
}
/**
 * May `buildSite` wipe `dist/` on this run? Only if this run regenerates all of it.
 *
 * See the long note at the call site (tosijs-ui#130). Pure and exported so the rule is
 * testable without running a build — the bug it prevents is a `rm -rf` of somebody's
 * published package output, which is not something to discover empirically.
 */
export function shouldCleanDist(config) {
    // A consumer-supplied build owns the directory and may emit a subset. Never clean it,
    // even alongside the other flags — the consumer's function is the authority.
    if (config.libraryBuild)
        return false;
    return config.emitLibrary === true || Boolean(config.libraryTsconfig);
}
export async function buildSite(config, opts = {}) {
    // Look at the machine before adding load to it. Runs on every build, including each
    // watch rebuild, because the danger is not present at launch and then absent — it
    // accumulates across a long session, in OTHER processes this build knows nothing
    // about. One `ps` against a multi-second build is free, and it is the only point
    // where anything looks at all.
    //
    // Returns `false`; does NOT `process.exit`. This is a public export of
    // `tosijs-ui/site`, and an adopter's `await buildSite(cfg); await publishToS3()` must
    // not be killed from inside a health check they never asked for. `bin/dev.ts` already
    // treats a `false` as a failed build and exits — that is the app's call to make, not
    // the library's.
    if (!(await preflight({
        label: 'Build',
        devLimitMb: config.memoryLimitMb,
        mode: config.preflight,
    }))) {
        return false;
    }
    // Dependency-audit gate. Runs on the initial build only — the dev server runs its
    // own synchronous audit just before binding the port, and `opts.skipAudit` keeps
    // watch rebuilds off the network. Fails the build (before the destructive rm -rf)
    // on an ungated high+ advisory; fails open if the audit itself can't run.
    if (!opts.skipAudit) {
        const audit = await auditDependencies(config.audit);
        if (audit.mode !== 'off')
            reportAudit(audit, 'Build');
        if (!audit.ok && audit.mode === 'fail')
            return false;
    }
    /*
    One writer at a time. `buildSite` does `rm -rf <outputDir>` and repopulates it, so a
    standalone build racing a watching dev server means each deletes what the other is
    writing — which silently killed a dev server and left a half-populated site (#51).
  
    Re-entrant: the dev server holds this for its whole life and reaches here on every
    rebuild, so its own builds proceed. `opts.lock: false` is the escape hatch for a caller
    that manages ownership itself.
    */
    const lock = opts.lock === false
        ? { ok: true, release: () => { } }
        : acquireBuildLock('.', 'build');
    if (!lock.ok) {
        /*
        DELEGATE to a running dev server instead of refusing.
    
        The lock exists because two builders `rm -rf` one output tree. Refusing is correct as
        far as it goes, but the workflow it produced was "kill the server, build, forget to
        restart it" — which cost real cycles and, more than once, silently took a live tunnel
        offline. The dev server is already the thing that builds this tree, so asking it for
        one more build is strictly safer than a second process racing it, and it is what the
        caller wanted.
    
        Only a dev-server holder, and only when it answers on loopback. Anything else — a
        second `bun run build`, or a dev server that is gone but left a lock — falls through
        to the message, which is still the right answer there.
        */
        const holder = lock.holder;
        if (canDelegateTo(holder)) {
            const delegated = await delegateBuild(holder, config.outputDir ?? 'docs');
            if (delegated !== null)
                return delegated;
        }
        console.error(describeHolder(holder));
        return false;
    }
    try {
        const PROJECT_ROOT = './';
        const PUBLIC = path.resolve(PROJECT_ROOT, config.outputDir ?? 'docs');
        const DIST = path.resolve(PROJECT_ROOT, 'dist');
        /*
      Where the hydration bundle is BUILT. Defaults to the site output, not to `dist` (#69).
    
      It used to be built into `dist` unconditionally — the same directory `emitLibrary` /
      `libraryTsconfig` use for the LIBRARY — and only the `.js` was copied across to the site.
      The sourcemap stayed behind, in a tree the project publishes to npm and commits to git,
      never served and never reachable by a consumer. In tosijs-3d that came to `iife.js.map` at
      65 MiB across 216 packed blobs — about 35% of the whole repo's packed blob store — for a
      file nothing could ever load, plus a `dist/iife.js` byte-identical to the served one.
    
      Building into the site output instead means the map lands NEXT TO the script it describes,
      where a browser can actually use it, and the library tree holds only library output. Set
      `bundleOutDir` when the bundle is itself a published artifact (this repo does: `dist/iife.js`
      is the CDN `<script>` target an npm consumer reaches through unpkg/jsdelivr).
      */
        const { dir: BUNDLE_DIR, copyToPublic: BUNDLE_NEEDS_COPY } = resolveBundleDir(config.bundleOutDir, PUBLIC, PROJECT_ROOT);
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
        /*
      PRESERVE THE LAST GOOD BUILD — here, not in the dev server.
    
      This wipe is why a failed build leaves nothing to serve. The protection used to live
      in devServer's watch branch, which meant `bun run build`, CI, `bun run test-browser`,
      any adopter calling buildSite(), AND bun start's own INITIAL build all went
      unprotected — and buildSite has plenty of failure paths after this line (a doc example
      that fails to compile throws further down). In interactive mode the server would then
      serve a wiped directory with buildStatus still reporting ok: the exact silent failure
      the feature advertises fixing.
    
      Moving it here covers every caller. Rename rather than copy: atomic, instant, and the
      output is a few MB anyway.
    
      Exit codes are CHECKED. The previous version was all `.nothrow().quiet()`, so a failed
      restore left the site gone while the log still said "still serving the last good
      build" — a fail-soft lie in a project whose rule is fail-hard. A stale spare is also
      removed first, or the `mv` NESTS (docs.last-good/docs) and a later restore resurrects
      a broken tree.
      */
        const LAST_GOOD = `${PUBLIC}.last-good`;
        const hadPrevious = existsSync(PUBLIC);
        if (hadPrevious) {
            const clear = await $ `rm -rf ${LAST_GOOD}`.nothrow().quiet();
            if (clear.exitCode !== 0) {
                throw new Error(`could not clear ${LAST_GOOD} — refusing to continue, because moving the ` +
                    `current build aside would nest inside it and corrupt the spare.`);
            }
            const stash = await $ `mv ${PUBLIC} ${LAST_GOOD}`.nothrow().quiet();
            if (stash.exitCode !== 0) {
                throw new Error(`could not move ${PUBLIC} aside (exit ${stash.exitCode})`);
            }
        }
        /** Put the previous build back. Returns false if it could NOT be restored. */
        const restoreLastGood = async () => {
            if (!hadPrevious)
                return false;
            await $ `rm -rf ${PUBLIC}`.nothrow().quiet();
            const back = await $ `mv ${LAST_GOOD} ${PUBLIC}`.nothrow().quiet();
            return back.exitCode === 0;
        };
        await $ `mkdir -p ${PUBLIC}`.text();
        /*
      TWO different questions, deliberately separate.
    
      `siteOk` — did the site output get generated? It alone decides whether the freshly
      built directory is kept or thrown away for the last-good spare.
    
      The RETURN VALUE — should a one-shot build exit zero? That additionally requires a
      clean library typecheck, so it is `siteOk && !libraryBuildFailed`.
    
      Conflating them (one flag, `!libraryBuildFailed`, also driving the restore) meant one
      unrelated type error anywhere in src/ deleted a perfectly good site and pinned the
      output to the last-good copy for the WHOLE editing session — the exact opposite of the
      contract stated below ("a watch rebuild should still refresh the pages/bundle while the
      developer fixes the type error"). It was also asymmetric: dist/ kept its red-tsc
      declarations while docs/ reverted.
      */
        let siteOk = false;
        try {
            const extract = () => extractDocs({
                paths: docPaths,
                // Skip the build's own output dir by path (not by the name 'docs', so a
                // source dir like src/docs is still scanned).
                ignore: ['node_modules', 'dist', 'build', PUBLIC],
                output: DOCS_JSON,
            });
            extract();
            /*
          Fill `<!-- epub-downloads -->` and publish a manifest of the volumes this build makes.
      
          Substituted into the corpus HERE, before pages are generated, so the static page and
          the hydrated SPA render the same list and the client needs no new data source. The
          volume set is computed from the corpus itself, so it is known before the ePubs are
          built — the links and the files derive from one function and cannot disagree.
      
          Why this exists: the build produced a valid ePub and linked to nothing, so a reader had
          no route to it. A build that makes an artifact should be able to say where it is
          (tosijs-ui#46).
          */
            const publishVolumeLinks = async () => {
                if (!config.epub)
                    return;
                const corpus = JSON.parse(await Bun.file(DOCS_JSON).text());
                const volumes = listEpubVolumes(corpus, config);
                if (!volumes.length)
                    return;
                let touched = 0;
                for (const doc of corpus) {
                    const filled = renderEpubDownloads(doc.text ?? '', volumes);
                    if (filled !== doc.text) {
                        doc.text = filled;
                        touched++;
                    }
                }
                if (touched)
                    await Bun.write(DOCS_JSON, JSON.stringify(corpus, null, 2));
                // A stable, machine-readable list so a consumer can link the books without
                // re-deriving the filename — the "documented helper" half of #46.
                await Bun.write(`${PUBLIC}/epub-volumes.json`, JSON.stringify(volumes, null, 2));
            };
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
            // Build-time transpiled JS for `tjs` examples, per doc filename (each keyed by
            // source text) — computed by the example check (it transpiles anyway) and used by
            // generateSite to embed hidden scripts AND attach per-doc bakes to docs.json, so
            // pages RUN without the tjs transpiler on both first paint and SPA nav. Empty when
            // checkExamples is disabled; the runtime then transpiles on demand. See
            // self-contained-examples-plan.md.
            // If the import-resolver is on, the example check accepts non-context imports.
            const resolverPrefix = config.importResolver
                ? (config.importResolver === true
                    ? undefined
                    : config.importResolver.prefix) ?? '/lib/'
                : undefined;
            let exampleBakes;
            if (config.checkExamples !== false) {
                const { problems, warnings, bakes } = await checkExamplesInChild(DOCS_JSON, resolverPrefix, typeof config.checkExamples === 'object'
                    ? config.checkExamples.contextKeys ?? []
                    : []);
                exampleBakes = bakes;
                // Unsupported imports don't fail the build — the code isn't broken, it just
                // can't run in the doc environment (almost always illustrative code that
                // should be tagged `typescript`). Warn loudly, treat the block as display-only,
                // and keep going. Only real syntax/transpile errors below are fatal.
                if (warnings.length) {
                    console.warn(`⚠️  doc-site build: ${warnings.length} live example block(s) can't run ` +
                        `here and were left as display-only:\n\n` +
                        formatExampleProblems(warnings) +
                        `\n\nTag each with a display-only language like \`typescript\` (instead of` +
                        ` \`js\`/\`ts\`) to silence this, or enable \`importResolver\` to import` +
                        ` other packages.\n`);
                }
                if (problems.length) {
                    throw new Error(`doc-site build: ${problems.length} live example(s) failed to build:\n\n` +
                        formatExampleProblems(problems) +
                        `\n\nFix the code, or — if a block is illustrative and not meant to run —` +
                        ` tag it with a display-only language like \`typescript\` instead of` +
                        ` \`js\`/\`ts\`. (Disable all checking with checkExamples: false.)`);
                }
            }
            // Copy static-asset dirs into the web root.
            const staticDirs = config.staticDirs ??
                (existsSync('demo/static') ? ['demo/static'] : ['static']);
            for (const dir of staticDirs) {
                if (existsSync(dir))
                    await $ `cp -R ${dir}/. ${PUBLIC}`.text();
            }
            /*
            Clean `dist/` only when THIS run regenerates all of it (tosijs-ui#130).
      
            This used to be unconditional, on every `buildSite` — including from `devServer`, and
            including for projects that configure no library build at all. `dist/` is not a site
            artifact: for the repos this API exists to serve, it is the **published package
            output**, an input to `npm publish`. Wiping it destroys build products the current run
            does not rebuild.
      
            What it cost, reported from tosijs: two bundles (`module.debug.js`, `module.safe.js`,
            exposed as the `./debug` and `./safe` subpath exports) are produced only under
            `--build`, because they need a 53-file transpile too slow for the dev loop. So
            `bun start` — or Playwright's `webServer`, which runs it — wiped `dist/` and rebuilt
            only five of seven. A publish from that tree ships two subpaths that throw
            `ERR_MODULE_NOT_FOUND`, and their release checklist walks straight into it: build at
            step 3, browser tests at step 4, publish at step 8. It reached a commit once already.
      
            Nothing local could catch it: size and smoke gates iterate the bundles the current run
            BUILT, so a bundle that was deleted rather than skipped is invisible to both.
      
            The doc `outputDir` wipe is fine and stays — that directory is wholly generated and the
            build announces it. `dist/` is different, so the rule is now "clean only what you
            wholly generate":
      
              - `emitLibrary` / `libraryTsconfig` — tsc emits the complete set, so a clean is safe
                and keeps stale artifacts from surviving a rename.
              - `libraryBuild` (a consumer function) — NOT cleaned. The consumer owns the
                directory and may legitimately emit a subset, which is exactly the reported case.
              - nothing configured — NOT cleaned. Nothing here owns it.
      
            Incidental win: `emitLibrary` runs `tsc --incremental`, whose `.tsbuildinfo` lives in
            `dist/`. Wiping it every run meant incremental compilation never once did anything.
            */
            if (shouldCleanDist(config)) {
                await $ `rm -rf ${DIST}`.text();
            }
            await $ `mkdir -p ${DIST}`.text();
            console.timeEnd('prebuild');
            // ── build ───────────────────────────────────────────────────────────────
            console.time('build');
            // Optionally also build the library (ESM + type declarations) — for repos
            // whose single build publishes both an npm package and its doc site.
            //
            // These paths emit SHIPPABLE `dist/*.d.ts`. A failed `tsc` must fail the build:
            // `tsc` still writes declarations when it errors (unless `noEmitOnError`), so a
            // swallowed failure publishes declarations that don't match the source. This bit
            // tosijs 1.7.0-beta.1 — a real type error rode into the release because the branch
            // caught the failure and logged a success-sounding line (tosijs-ui#22). We surface
            // it loudly and mark the build failed (so a one-shot `--build` exits non-zero), but
            // do NOT abort the rest: a watch rebuild should still refresh the pages/bundle while
            // the developer fixes the type error — the loud message + non-zero one-shot exit are
            // what matter.
            let libraryBuildFailed = false;
            if (config.libraryBuild) {
                // Full override — the consumer owns emitting dist/*.js + *.d.ts for ALL
                // sources (e.g. tsc for `.ts` + `tjs convert`/`generateDTS` for native `.tjs`
                // that tsc can't compile). See BUILD-TJS-HOOK.md. Throws propagate (one-shot
                // crashes non-zero; watch's rebuild wrapper logs it) — already fails hard.
                await config.libraryBuild({
                    dist: DIST,
                    root: path.resolve(PROJECT_ROOT),
                    tsconfig: config.libraryTsconfig,
                });
            }
            else if (config.libraryTsconfig) {
                // Consumer-controlled library build (handles root noEmit, removeComments,
                // outDir, etc.). tsc output is left visible so the errors are readable.
                const r = await $ `bun tsc -p ${config.libraryTsconfig}`.nothrow();
                if (r.exitCode !== 0) {
                    console.error(`❌ tsc -p ${config.libraryTsconfig} FAILED (exit ${r.exitCode}) — ` +
                        `published declarations may be stale or contain type errors. Build marked failed.`);
                    libraryBuildFailed = true;
                }
            }
            else if (config.emitLibrary) {
                const r = await $ `bun tsc --declaration --incremental --outDir dist`.nothrow();
                if (r.exitCode !== 0) {
                    console.error(`❌ tsc --declaration FAILED (exit ${r.exitCode}) — emitted dist/*.d.ts may ` +
                        `be stale or contain type errors. Build marked failed.`);
                    libraryBuildFailed = true;
                }
            }
            // The hydration bundle. If bundleEntry is set we build it (IIFE), else pages
            // load config.scriptUrl (default /iife.js) — a prebuilt/CDN bundle the
            // consumer supplies (e.g. via staticDirs or an absolute URL).
            const scriptName = (config.scriptUrl ?? '/iife.js').replace(/^\//, '');
            // Set once the ESM+splitting hydration bundle is emitted (bundleEntry projects);
            // when set, pages load IT as a `<script type="module">` instead of the classic IIFE,
            // so CodeMirror rides a lazy chunk instead of every page.
            let hydrateName;
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
                // Probe ONCE. Both the `external` list and the post-build guard below must agree
                // on whether tjs-lang resolved; two independent probes could in principle disagree
                // and misfire the guard.
                //
                // This probe is NOT redundant with tjs-lang#16 (which made tjs-lang declare
                // `@codemirror/*` as optional peerDeps — its own dependency hygiene, and what keeps
                // the hoisted CodeMirror copy single). This asks a DIFFERENT question: is tjs-lang
                // ITSELF installed? It's an OPTIONAL peer of tosijs-ui, and bundling
                // `tjs-lang/editors/codemirror` when it's absent is a hard build failure
                // ("Could not resolve"). Verified 2026-07-20 — do not "simplify" this away.
                const tjsEditorExternals = tjsEditorExternal(PROJECT_ROOT);
                const tjsEditorIsBundled = tjsEditorExternals.length === 0;
                const externals = [
                    'tjs-lang/browser',
                    'tjs-lang/browser/from-ts',
                    ...tjsEditorExternals,
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
                    BUNDLE_DIR,
                    '--sourcemap=linked',
                    '--format=iife',
                    '--minify',
                    '--entry-naming',
                    scriptName,
                    ...externals.flatMap((ext) => ['--external', ext]),
                ], 
                /*
                CAPTURED, not inherited — `bun build` lists every chunk and every sourcemap, which
                was 18 of a 37-line build. Build output has a budget (~20 lines): spam trains
                people and agents to stop reading it, which is exactly what lets a real failure
                through. The sizes that matter are summarised a few lines below; the listing is
                not information, it is the same information again, longer.
      
                Replayed in full on FAILURE, where it is the only thing you want.
                */
                { stdout: 'pipe', stderr: 'pipe' });
                const bundleOut = await drainChild(bundle);
                if ((await bundle.exited) !== 0) {
                    console.error(bundleOut);
                    console.error('bundle build failed');
                    return false;
                }
                // Only a copy when the bundle was deliberately built elsewhere; by default it is
                // already in the site output and copying it onto itself would truncate the file.
                if (BUNDLE_NEEDS_COPY) {
                    await $ `cp ${BUNDLE_DIR}/${scriptName} ${PUBLIC}`.text();
                    // …and its sourcemap. The bundle ends `//# sourceMappingURL=<name>.map`, so
                    // copying only the `.js` leaves every consumer following the CDN quick-start
                    // with a 404 in devtools. Best-effort — a missing map must not fail a build.
                    const map = `${BUNDLE_DIR}/${scriptName}.map`;
                    if (existsSync(map))
                        await $ `cp ${map} ${PUBLIC}`.nothrow().quiet();
                }
                const bundleFile = await Bun.file(`${BUNDLE_DIR}/${scriptName}`).arrayBuffer();
                const bundleJs = Buffer.from(bundleFile).toString('utf8');
                const mapWarning = sourcemapWarning(bundleJs, PUBLIC, existsSync);
                if (mapWarning)
                    console.warn(mapWarning);
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
                const syntaxError = await classicScriptSyntaxErrorInChild(`${BUNDLE_DIR}/${scriptName}`);
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
                if (tjsEditorIsBundled && tjsEditorLeakedAsExternal(bundleJs)) {
                    console.error(`⚠️  ${scriptName} externalized tjs-lang's CodeMirror extension instead of bundling it.\n` +
                        `    It must share the editor's single CodeMirror instance; a separately loaded copy\n` +
                        `    silently no-ops. Check the bundle's \`external\` list — entries are PREFIX matches,\n` +
                        `    so a bare 'tjs-lang' externalizes tjs-lang/editors/codemirror along with it.`);
                    return false;
                }
                // Gzip in a CHILD, not in-process.
                //
                // This runs on every rebuild, over a 1.2MB bundle, to print ONE size line — and
                // zlib's gzip is native, so it strands memory the JS heap never sees, in the
                // process that lives for days. Measured at ~81KB per rebuild and still creeping at
                // 40: the last native call left in the parent's hot path. The child gives it all
                // back on exit, for a few ms on a step that already took seconds.
                //
                // Deliberately zlib-in-a-child rather than the `gzip` CLI: the two disagree by
                // ~1.6% (378.6kb vs 384.9kb here), and this number is quoted in the docs and
                // tracked across releases. Moving the work must not silently move the measurement.
                const bytes = await gzipSizeInChild(`${BUNDLE_DIR}/${scriptName}`);
                const gzipKb = bytes > 0 ? ` (${(bytes / 1024).toFixed(1)}kb gzip)` : '';
                console.log(`${scriptName}: ${(bundleFile.byteLength / 1024).toFixed(1)}kb${gzipKb}`);
                // ── ESM hydration bundle (the doc pages load THIS, not the IIFE above) ──────
                //
                // The IIFE can't code-split, so `<tosi-code>`'s lazy `import('./code-editor-cm')`
                // is flattened into it — CodeMirror + lezer + acorn (~265KB gz) ride every page
                // whether or not it has an editor. Bun DOES code-split ESM, so we emit a second
                // bundle as `--format=esm --splitting`: the entry gzips to roughly the pre-editor
                // size and CodeMirror becomes a lazy chunk pulled only when an editor mounts.
                //
                // The tjs CM extension MUST share the editor's single `@codemirror/state` (a
                // separately-loaded copy no-ops) — which is why it's bundled, not external. Splitting
                // PRESERVES the sharing: it and `code-editor-cm` both statically import the same
                // shared CodeMirror chunk. The IIFE (dist/${scriptName}) stays for the CDN <script>
                // path; only the served pages move to the module.
                /*
              The hydrate bundle is DOC-SITE output, so it must not live under the LIBRARY dist.
        
              It used to build into `${DIST}/hydrate`, get copied into the site output, and then
              just… stay there — nothing references it, but `files: ['/dist']` shipped it to
              every consumer. For a project whose site bundles something heavy the effect is
              brutal: one adopter's package went from 0.62MB/398 files to 10.2MB/2888 files
              (tosijs-ui#31), and they only caught it by reading `npm pack` output before
              publishing. tosijs-ui was shipping 5.2MB of its own.
        
              Build it in a temp dir instead. The only consumer is the copy into PUBLIC on the
              next line, so nothing needs it to persist — and a temp dir cannot be swept into a
              published tarball by a broad `files` entry.
              */
                const HYDRATE_DIR = `${tmpdir()}/tosijs-hydrate-${process.pid}`;
                await $ `rm -rf ${HYDRATE_DIR}`.text().catch(() => { });
                const esm = spawn([
                    'bun',
                    'build',
                    config.bundleEntry,
                    '--outdir',
                    HYDRATE_DIR,
                    '--sourcemap=linked',
                    '--format=esm',
                    '--splitting',
                    '--minify',
                    '--entry-naming',
                    'hydrate.js',
                    /*
                  Code-split chunks go in a SUBDIRECTORY, not the web root.
        
                  `--splitting` emits one hashed chunk per dynamic import, and they landed flat
                  beside `index.html`. For a corpus that pulls something large — Babylon's glTF
                  extensions, shader chunks, audio engines — that is thousands of files in the root:
                  tosijs-3d reported **2,473 hashed chunks** among 2,604 files (tosijs-ui#64).
        
                  Three costs, and the second is the dangerous one. `ls docs` stops being usable.
                  Any dependency bump rewrites every hash, so a Babylon upgrade becomes a
                  multi-thousand-file commit — which makes the standing "don't commit docs/ from a
                  feature push" hazard far worse, because a stray `git add -A` now moves thousands
                  of files and the diff is unreviewable. (They took their doc site down exactly that
                  way.) And a genuinely stale or missing artifact is invisible among the lookalikes.
                  */
                    '--chunk-naming',
                    '_chunks/[name]-[hash].[ext]',
                    '--asset-naming',
                    '_assets/[name]-[hash].[ext]',
                    ...externals.flatMap((ext) => ['--external', ext]),
                ], 
                // Captured for the same reason as the iife bundle above; replayed on failure.
                { stdout: 'pipe', stderr: 'pipe' });
                const esmOut = await drainChild(esm);
                if ((await esm.exited) !== 0) {
                    console.error(esmOut);
                    console.error('ESM hydration bundle build failed');
                    return false;
                }
                // Copy the whole ESM output (entry + hashed chunks) to the served root — the entry
                // imports its chunks by RELATIVE path, so they must sit right beside it.
                await $ `cp -R ${HYDRATE_DIR}/. ${PUBLIC}/`.text();
                hydrateName = 'hydrate.js';
                // Report the always-loaded weight (entry, not the lazy editor chunks) so a
                // regression that pulls CodeMirror back into the entry is visible.
                {
                    const entryBytes = await gzipSizeInChild(`${HYDRATE_DIR}/hydrate.js`);
                    await $ `rm -rf ${HYDRATE_DIR}`.nothrow().quiet();
                    if (entryBytes > 0)
                        console.log(`hydrate.js (module, editor lazy): ${(entryBytes / 1024).toFixed(1)}kb gzip entry`);
                }
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
                        haltijaDev: config.haltijaDev,
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
            // Optional (tjs-lang 0.11+): the import-resolver service worker. Lets live examples
            // import real npm packages from anywhere — bare specifiers the doc-system doesn't
            // inject become `/<prefix>/<spec>` requests the worker resolves + caches. GATED behind
            // `config.importResolver` (OFF by default; 1.7.0 ships without it). Copies the worker
            // to the public root and hands the client a config global to register it from (see the
            // doc-system client's registration). See import-resolver-plan.md.
            let importResolverHead = '';
            if (config.importResolver) {
                try {
                    const opts = config.importResolver === true ? {} : config.importResolver;
                    const worker = Bun.resolveSync('tjs-lang/import-resolver/worker', PROJECT_ROOT);
                    await $ `cp ${worker} ${PUBLIC}/import-resolver-worker.js`.text();
                    const bp = config.basePath;
                    const root = !bp || bp === '/' ? '' : bp.replace(/\/$/, '');
                    const clientConfig = {
                        prefix: opts.prefix ?? '/lib/',
                        workerUrl: `${root}/import-resolver-worker.js`,
                        // Don't reload a reader's page on first install — the SW takes control on the
                        // next navigation, and nothing needs it before an example imports from /lib/.
                        reloadOnFirstInstall: false,
                    };
                    if (opts.defaultCdn)
                        clientConfig.defaultCdn = opts.defaultCdn;
                    if (opts.esmShPackages)
                        clientConfig.esmShPackages = opts.esmShPackages;
                    importResolverHead = `<script>globalThis.__TOSI_IMPORT_RESOLVER=${JSON.stringify(clientConfig)}</script>`;
                    console.log(`import-resolver worker at ${root}/import-resolver-worker.js (prefix ${clientConfig.prefix})`);
                }
                catch (e) {
                    console.warn(`import-resolver: could not set it up (${String(e)}) — skipping`);
                }
            }
            // Fill the download marker and write the volume manifest before pages are rendered,
            // so the static HTML and the SPA agree. PUBLIC exists by now (static assets copied).
            await publishVolumeLinks();
            // Generate the static, pre-rendered doc site (one /slug/index.html per doc).
            // Runs after the static-asset copy so the generated index.html (README) wins,
            // and after the bundle copy so every page's <script src> resolves.
            // Build identity at /version.json — "what am I looking at?" for any deployed copy.
            // Deterministic (commit-derived, no wall clock) so a committed outputDir doesn't
            // churn on every build. See build-stamp.ts.
            const buildStamp = await gatherBuildStamp({
                // Read package.json rather than importing the generated src/version.ts —
                // that import put a generated file in `bun --watch`'s module graph while
                // prebuild rewrote it every build, i.e. a rebuild loop (899 restarts in
                // ~40s). But resolve it from THIS MODULE, not the cwd: cwd is the ADOPTER's
                // repo, so a cwd-relative read stamped THEIR version as the generator —
                // the one field whose job is answering "which tosijs-ui built this?"
                // (tosijs-ui#37, and caught for real by the consumer smoke test).
                //
                // That import put a GENERATED file into bin/dev.ts's module graph, and
                // `bun --watch` restarts the process when any graph file changes — while
                // prebuild rewrites version.ts on every build. Result: build → rewrite →
                // restart → build, forever. Observed at 899 restarts in ~40 seconds, and it
                // makes `bun start` (the documented dev command) completely unusable.
                //
                // Never import generated source from the build. Read the data instead.
                // Resolved from THIS module, never the cwd — see the note above.
                generator: await Bun.file(`${import.meta.dir}/../../../package.json`)
                    .json()
                    .then((p) => p.version ?? 'unknown')
                    .catch(() => 'unknown'),
                site: config.name,
            });
            /*
            One stamp, two uses: `/version.json` answers "what am I looking at?", and the same value
            busts asset caches as `?v=`. Derived once so they cannot disagree — a page claiming one
            build while loading another's bundle is the exact confusion this is meant to end.
      
            Commit-derived, so a rebuild at the same commit produces byte-identical output and a
            committed `docs/` does not churn. Falls back to the generator version when git is
            unavailable (a consumer may not be in a repo at all), which still busts on upgrade.
            */
            /*
            Stamp from the PROJECT'S VERSION, not its commit.
      
            A commit-derived stamp re-stamps every generated page on every commit, and `docs/` is
            committed here and in the sibling projects — so a 68-file diff appeared on each build,
            and it did not terminate: the test lanes build too, so commit → build → dirty → commit.
            That is the same non-terminating loop this repo already documents for release
            annotations, and it is worse than the staleness it was added to fix.
      
            A version changes once per release, which is the granularity a published site actually
            changes at, and it leaves a rebuild byte-identical between releases.
      
            The tradeoff, stated rather than discovered later: two builds of the SAME version with
            different code carry the same stamp, so a mid-version redeploy can still serve a cached
            bundle. That is no worse than having no stamp at all, which was the previous state, and
            it closes the case that actually bit — a cached bundle surviving across releases.
      
            Read from the CONSUMER's cwd, deliberately: this must be the version of the site being
            built, not tosijs-ui's. (`generator` is read from this module's own package.json for the
            opposite reason — see the note below.) Falls back to the generator version, then the
            commit, so a project without a version still gets something that moves.
            */
            const assetStamp = (await Bun.file(`${process.cwd()}/package.json`)
                .json()
                .then((p) => p.version)
                .catch(() => undefined)) ??
                buildStamp.generator ??
                buildStamp.commit;
            /*
            `docs.json` gets its OWN stamp, keyed to its own bytes.
      
            The version stamp is right for the bundles — it moves once per release, which is when
            they change. The corpus does not work that way: it changes whenever anyone edits a doc,
            including many times within one version, and a preview host redeployed mid-version is
            the normal way this project looks at its own site. A version-keyed corpus URL would be
            stale for exactly that workflow.
      
            Cheap, and available here because the file is already being read.
            */
            const docsJsonText = await Bun.file(DOCS_JSON).text();
            const docsStamp = new Bun.CryptoHasher('sha256')
                .update(docsJsonText)
                .digest('hex')
                .slice(0, 12);
            const docs = JSON.parse(docsJsonText);
            const pageCount = await generateSite({
                docs,
                outputDir: PUBLIC,
                projectName: config.name,
                description: config.description,
                baseUrl: config.baseUrl,
                lang: config.lang,
                projectLinks: config.projectLinks,
                logo: config.logo,
                navbarLinks: config.navbarLinks,
                localizedStrings: config.localizedStrings,
                favicon: config.favicon,
                ogImage: config.ogImage,
                // When set, pages load this as a `<script type="module">` (editor lazy-split)
                // instead of the classic IIFE. See the ESM hydration bundle above.
                hydrateUrl: hydrateName ? `/${hydrateName}` : undefined,
                bakes: exampleBakes,
                headExtra: [config.headExtra, tjsHead, importResolverHead]
                    .filter(Boolean)
                    .join('') || undefined,
                scriptUrl: config.scriptUrl,
                basePath: config.basePath,
                assetStamp,
                docsStamp,
            });
            // NOTE: /version.json is written at the END of the build (see `finalizeStamp`
            // below), because deciding whether to restamp means hashing everything else in
            // the output — and the ePub, the burnt CSS and the host preset files are all
            // still to come.
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
            else if (config.host === 'firebase' && existsSync('firebase.json')) {
                /*
                An EXISTING firebase.json is not ours to rewrite — but it is worth reading (#134).
                If `hosting.public` names a different directory than we just built into, `buildSite`
                writes one place and `firebase deploy` publishes another, both succeed, and the site
                serves whatever was in that directory last.
                */
                const mismatch = firebasePublicMismatch(await Bun.file('firebase.json')
                    .text()
                    .catch(() => ''), config.outputDir ?? 'docs');
                if (mismatch) {
                    console.warn(`\n⚠️  firebase.json serves ${mismatch.declared
                        .map((d) => `"${d}"`)
                        .join(' / ')}, but this build wrote "${mismatch.built}".\n` +
                        `   \`firebase deploy\` will publish the other directory — whatever was left in\n` +
                        `   it — and both commands will succeed. Point \`hosting.public\` at\n` +
                        `   "${mismatch.built}", or set \`outputDir\` to match.\n`);
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
                const epubOpts = typeof config.epub === 'object' ? config.epub : {};
                /*
              One volume per `book` name, plus the default.
        
              A corpus can declare `book: "appendices"` on a section and get a second .epub
              without a second config; `book: "none"` keeps a doc on the site and out of every
              volume. Each runs in its own child process — the ePub build strands native memory
              (happy-dom + resvg), which is exactly why it was moved out-of-process, and that
              reasoning applies per volume rather than per build.
              */
                const corpus = JSON.parse(await Bun.file(config.docsJson ?? 'demo/docs.json')
                    .text()
                    .catch(() => '[]'));
                /*
              Only build the default volume if anything is actually in it.
        
              A book corpus where EVERY doc names a volume — the two-volumes-from-one-corpus case
              this release is for — has an empty default bucket. Building it unconditionally threw
              on every build and every watch rebuild, with no opt-out, so the headline feature
              broke the moment you used it thoroughly. An explicitly requested `bookTarget` that
              matches nothing is still a hard error: that one is a typo, not a shape.
              */
                const slugs = buildSlugMap(corpus);
                const partitioned = partitionByBook(corpus, slugs);
                const volumes = [
                    ...(partitioned.get(DEFAULT_BOOK)?.length ? [undefined] : []),
                    ...namedBooks(corpus, slugs),
                ];
                if (!volumes.length) {
                    console.warn(`⚠️  epub: no documents in any volume — skipping. (Every doc is hidden or \`book: "none"\`.)`);
                }
                for (const bookTarget of volumes) {
                    await buildEpubInChild(config, {
                        // `modified` is NOT set here. `buildEpub` defaults and validates it, so every
                        // path — this one, `bun book`, and any adopter calling the public export —
                        // gets the same behaviour. A second assembly here is what made them differ.
                        ...epubOpts,
                        bookTarget,
                    });
                }
            }
            console.timeEnd('build');
            // A failed library typecheck (above) marks the whole build failed so a one-shot
            // `--build` exits non-zero and never publishes declarations from a red tsc.
            /*
            Build identity at /version.json — "what am I looking at?" for any deployed copy.
      
            LAST, because the decision needs every other output file to exist: if nothing else
            changed, the previous stamp is preserved verbatim so a committed `docs/` stops going
            dirty on every build (tosijs-ui#122 — see build-stamp.ts for the loop it broke).
      
            The previous build is still on disk as LAST_GOOD (moved aside, not deleted, and
            dropped only once this build succeeds), so the comparison costs no extra bookkeeping.
            */
            await finalizeStamp(PUBLIC, hadPrevious ? LAST_GOOD : null, buildStamp);
            // Reaching here means the site generated. The typecheck only gates the exit code.
            siteOk = true;
            return !libraryBuildFailed;
        }
        finally {
            /*
          Success drops the spare; failure puts it back.
      
          In `finally` so it covers BOTH shapes of failure — a thrown error and a plain
          `return false` — because buildSite reports some failures each way and a caller
          that only handled one would still be left with a wiped output directory.
          */
            if (siteOk) {
                if (hadPrevious)
                    await $ `rm -rf ${LAST_GOOD}`.nothrow().quiet();
            }
            else if (hadPrevious) {
                const restored = await restoreLastGood();
                console.error(restored
                    ? `\n🛑 Build failed — restored the previous build at ${PUBLIC}.\n`
                    : `\n🛑 Build failed AND the previous build could not be restored.\n` +
                        `   Look for it at ${LAST_GOOD}.\n`);
            }
        }
    }
    finally {
        // Release even on a thrown/early exit — a lock outliving its build would refuse the
        // NEXT build until someone found a file in the temp dir they do not know exists.
        lock.release();
    }
}
