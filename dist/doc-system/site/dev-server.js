/*
Dev server for the static doc-site system.

`devServer(config, { test })` serves the built site over HTTPS with SPA
fallback, rebuilds on source changes, and — in test mode — drives a haltija
headless browser through the inline doc tests and exits with their pass/fail.

Build-time only (Bun APIs). Never import this from browser code.
*/
import * as path from 'path';
import { statSync } from 'fs';
import { watch } from 'chokidar';
import { $, spawn } from 'bun';
import { buildSite } from './orchestrator';
import { preflight } from './preflight';
const TEST_RESULTS_FILE = '.browser-tests.json';
const DEFAULT_IDLE_HOURS = 8;
/**
 * The haltija the dev server spawns (`bunx <this>`).
 *
 * Pinned to a **range with a floor**, not `@latest`. This is library code: every
 * adopter's dev server runs whatever this string resolves to, so `@latest` means a
 * floating executable fetch — the tool can change under every consumer overnight,
 * with haltija in nobody's lockfile and no version contract. A caret range still
 * picks up fixes without letting a major land unannounced.
 *
 * Override with `HALTIJA_VERSION` (e.g. `HALTIJA_VERSION=haltija@beta` to test a
 * pre-release, or a local path/tarball) — you should not have to edit library code
 * to try a different haltija.
 *
 * Floor is **1.4.0** — the first release whose behavior this integration can rely on:
 *   - `hj` routes to the server owning the current directory, so `hj` inside a project
 *     drives THAT project's browser instead of falling back to a shared port and
 *     silently driving whoever was focused there.
 *   - a haltija server no longer overwrites the machine-wide `hj` binary with an older
 *     copy on startup — so OUR spawning one can't downgrade the CLI for an unrelated,
 *     up-to-date project (the exact "unpinned executable fetch from library code"
 *     hazard this pin exists to bound).
 *   - HTTPS-only servers stopped advertising an HTTP port they weren't listening on.
 *   - `hj` action commands (`navigate`, `click`, …) exit NON-ZERO on failure, so the
 *     test lane below can trust an exit code instead of racing to a timeout.
 */
const HALTIJA_PKG = process.env.HALTIJA_VERSION ?? 'haltija@^1.5.0';
/**
 * Resolve the idle-exit timeout to milliseconds (0 = disabled).
 *
 * Env wins over config, config over the default. An unparseable value falls back
 * to the default rather than to 0: a typo'd `DEV_IDLE_TIMEOUT_HOURS=8h` must not
 * silently turn the guard OFF — that is the exact failure it exists to prevent.
 * Only an explicit non-positive number disables it.
 */
export function resolveIdleMs(configHours, envHours) {
    const env = envHours?.trim();
    const raw = env ? Number(env) : configHours ?? DEFAULT_IDLE_HOURS;
    const hours = Number.isFinite(raw) ? raw : DEFAULT_IDLE_HOURS;
    return hours > 0 ? hours * 3600_000 : 0;
}
const DEFAULT_LIMIT_MB = 4096;
/**
 * Resolve the RSS ceiling in MB (0 = disabled).
 *
 * Same rule as `resolveIdleMs`, and it was NOT being applied: the ceiling was read as
 * `Number(env ?? config ?? 4096)`, which fails in both directions at once —
 *
 *   DEV_MEMORY_LIMIT_MB=''   → `??` passes '' through → Number('') === 0 → the ceiling
 *                              is ZERO, so `rss >= limit` is true on the first sample
 *                              and the dev server kills itself on every rebuild.
 *   DEV_MEMORY_LIMIT_MB=4gb  → NaN → every `>=` comparison is false → the guard is
 *                              silently OFF, on the machine of someone who was
 *                              explicitly trying to configure it.
 *
 * An empty env var is *unset*, not zero. Garbage falls back to the default, never to
 * off. Only an explicit non-positive number disables the ceiling.
 */
export function resolveLimitMb(configMb, envMb) {
    const env = envMb?.trim();
    const raw = env ? Number(env) : configMb ?? DEFAULT_LIMIT_MB;
    const mb = Number.isFinite(raw) ? raw : DEFAULT_LIMIT_MB;
    return mb > 0 ? mb : 0;
}
/**
 * Reclaim the port we are about to bind, from the process LISTENING on it.
 *
 * That sentence is the predicate, and the old code did not implement it. It ran
 * `lsof -ti:${port} | xargs kill -9`, and **`lsof -i:PORT` matches sockets whose
 * LOCAL *or REMOTE* port is PORT** — so it returned every process merely *connected*
 * to that port and SIGKILLed them all. Not theoretical: on this machine
 * `lsof -ti:443` returns GitHub Desktop, Proton Bridge and two `claude` processes,
 * none of which listen on 443. Aimed at our own dev port it would take out the
 * browser reading the page, Playwright's browsers, the haltija Electron — anything
 * with an open connection.
 *
 * We shipped that reasoning in this very file for `pkill -f haltija` ("a test lane
 * that reaches outside the repo and kills the developer's tools presents as 'my tools
 * got weird', never as a red test") and then failed to apply it here.
 *
 * So: listeners only; confirm each pid is actually a JS runtime before signalling
 * (if something else owns our port, that is the user's business — say so, don't shoot
 * it); SIGTERM first and give it a moment; SIGKILL only what refuses to die.
 */
async function killStrayServer(port) {
    // Number('') is 0, and `lsof -ti:0` matches sockets with an UNBOUND port — on this
    // machine, system daemons. Never let a bad port become a kill list.
    if (!Number.isInteger(port) || port <= 0 || port > 65535)
        return;
    const pids = await $ `lsof -ti:${port} -sTCP:LISTEN`
        .quiet()
        .text()
        .then((out) => out
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(Number)
        .filter((p) => Number.isInteger(p) && p > 0 && p !== process.pid))
        .catch(() => []); // nothing listening — the normal case
    for (const pid of pids) {
        const comm = await $ `ps -p ${pid} -o comm=`
            .quiet()
            .text()
            .then((s) => s.trim())
            .catch(() => '');
        if (!/\b(bun|node|deno)\b/.test(comm)) {
            console.warn(`⚠️  port ${port} is held by pid ${pid} (${comm || 'unknown'}), which is not a\n` +
                `    dev server — leaving it alone. Free the port, or set PORT to another one.`);
            continue;
        }
        try {
            process.kill(pid, 'SIGTERM');
        }
        catch {
            continue; // already gone
        }
        // Leave a receipt: reclaiming a port is destructive, so if it ever hits a server
        // the developer actually wanted, the log says exactly which pid/comm on which port.
        console.warn(`↻ reclaimed port ${port}: SIGTERM → pid ${pid} (${comm || 'unknown'})`);
        // Give it a moment to close the listener, then insist.
        for (let i = 0; i < 20; i++) {
            await Bun.sleep(50);
            try {
                process.kill(pid, 0);
            }
            catch {
                break; // exited
            }
            if (i === 19) {
                try {
                    process.kill(pid, 'SIGKILL');
                    console.warn(`   pid ${pid} ignored SIGTERM — sent SIGKILL`);
                }
                catch {
                    // gone between the check and the signal — fine
                }
            }
        }
    }
}
/**
 * Reuse-or-spawn a haltija dev-channel server (server-only, no desktop app) on
 * `port` over HTTPS, so the loader injected into the dev pages has something to
 * connect to. Best-effort: if the reachability check fails we still spawn, and
 * if the spawn fails we just log — the injected loader degrades to a no-op, so
 * dev startup is never blocked on haltija.
 */
async function ensureHaltijaChannel(port) {
    const base = `https://localhost:${port}`;
    const up = await fetch(`${base}/status`, {
        // The 8701 cert is mkcert-signed, but don't let a TLS/availability hiccup
        // in the probe stop us — we only care whether something is answering.
        tls: { rejectUnauthorized: false },
    })
        .then((r) => r.ok)
        .catch(() => false);
    if (up) {
        console.log(`Haltija dev-channel: reusing existing server at ${base}`);
        return;
    }
    console.log(`Haltija dev-channel: starting server-only channel (HTTP 8700 + HTTPS ${port}) …`);
    try {
        // --server = channel server only (no Electron desktop app). --both = HTTP on
        // 8700 AND HTTPS on 8701: the injected loader/widget use HTTPS 8701 (so an
        // HTTPS dev page has no mixed-content), while the `hj` CLI drives over its
        // default HTTP 8700 — one server, both transports, shared state. HTTPS cert
        // is mkcert-trusted. Output quiet so it doesn't drown the dev log.
        // Version comes from HALTIJA_PKG — a pinned range, not `@latest`; see above.
        spawn(['bunx', HALTIJA_PKG, '--server', '--both'], {
            stdout: 'ignore',
            stderr: 'ignore',
        });
        console.log(`Haltija dev-channel ready — drive this page with \`hj\` (e.g. \`hj tree\`). ` +
            `The widget appears when the channel is active (Option+Tab to toggle).`);
    }
    catch (err) {
        console.warn(`Haltija dev-channel: could not start (${String(err)}). The page loader ` +
            `will no-op until you run \`bunx haltija --server --https\` yourself.`);
    }
}
// The HTTPS dev server needs a cert in tls/. On a fresh clone/adopter there
// isn't one, so warn with the exact command rather than serving a broken
// server. We don't generate it automatically because it runs `mkcert -install`,
// which prompts for sudo — not something to spring on someone mid-startup.
async function ensureDevCerts() {
    const haveCerts = (await Bun.file('./tls/key.pem').exists()) &&
        (await Bun.file('./tls/certificate.pem').exists());
    if (haveCerts)
        return;
    console.error('\nNo dev TLS certificate found in tls/.\n\n' +
        'Generate one (locally-trusted, no browser warnings) with:\n\n' +
        '    bunx tosijs-dev-certs\n\n' +
        'then start the dev server again. Requires mkcert — the command prints\n' +
        'install instructions if it is missing.\n');
    process.exit(1);
}
export async function devServer(config, opts = {}) {
    // PORT env wins over the config, so a test harness can bring up its own instance on
    // its own port instead of adopting (or killing — killStrayServer takes the port)
    // the dev server you already have running.
    // `||`, not `??`: an EMPTY `PORT=` is unset, not "port zero". `??` only catches
    // null/undefined, so `PORT=''` yielded `Number('') === 0` — and port 0 fed
    // killStrayServer, whose `lsof -ti:0` matches sockets with an unbound port (system
    // daemons, on this machine). An env var set to empty is the most ordinary shell
    // accident there is; it must not become a kill list.
    const PORT = Number(process.env.PORT || config.port || 8787);
    const PUBLIC = path.resolve('./', config.outputDir ?? 'docs');
    const isSPA = true;
    const testMode = !!opts.test;
    // Don't add a days-long watch process to a machine that is already drowning — and
    // don't quietly become the fourth stale dev server. `buildSite` preflights too, but a
    // consumer's custom `build` need not go through it, and "on launch" is the moment a
    // human is actually looking at the terminal.
    //
    // THROWS; does not `process.exit`. `devServer` is a public export, and library code
    // killing the host process is not ours to do — the caller catches and decides. (The
    // health tick below is different: by then we own a running server on a dying machine,
    // and stopping it is the entire point of the guard.)
    if (!(await preflight({
        label: 'Dev server',
        devLimitMb: config.memoryLimitMb,
        mode: config.preflight,
    }))) {
        throw new Error('dev server: refusing to start — see the machine-health report above. ' +
            'Override with DEV_SKIP_PREFLIGHT=1, or set `preflight: "warn"` in your site config.');
    }
    // Haltija dev-channel — give a coding agent eyes on the running page. Opt-in
    // (config.haltijaDev or HALTIJA_DEV=1), never in test mode. The loader is a
    // localhost-gated runtime import() of the local channel's dev.js, so haltija
    // is never bundled and self-disables off-localhost; it's injected only at
    // serve time (below), so it never lands in the built output.
    //
    // Explicitly OFF under `HALTIJA_DEV=0` and in CI, which both override a config
    // `haltijaDev: true`: the E2E lane starts this server, and there is no agent on
    // the other end of the channel there — spawning it would only download an Electron
    // app into the runner for nobody to look at.
    const HALTIJA_HTTPS_PORT = 8701;
    const haltijaOff = process.env.HALTIJA_DEV === '0' ||
        process.env.HALTIJA_DEV === 'false' ||
        process.env.CI === 'true';
    const haltijaDev = !testMode &&
        !haltijaOff &&
        (config.haltijaDev === true ||
            process.env.HALTIJA_DEV === '1' ||
            process.env.HALTIJA_DEV === 'true');
    const HALTIJA_SNIPPET = `<script>/^localhost$|^127\\./.test(location.hostname)` +
        `&&import('https://localhost:${HALTIJA_HTTPS_PORT}/dev.js')</script>`;
    let testReportResolve;
    // Source read/write for in-browser "edit page source" (config.editableSources).
    // Local dev only — your machine, your files — so the lone guard is correctness:
    // confine paths to the repo root so a stray path can't escape it. No auth/token.
    const PROJECT_ROOT = path.resolve('./');
    const resolveInRepo = (rel) => {
        const resolved = path.resolve(PROJECT_ROOT, rel.replace(/^\/+/, ''));
        if (resolved !== PROJECT_ROOT &&
            !resolved.startsWith(PROJECT_ROOT + path.sep)) {
            return null;
        }
        return resolved;
    };
    async function handleReadSource(request) {
        const rel = new URL(request.url).searchParams.get('file') ?? '';
        const resolved = resolveInRepo(rel);
        if (!resolved)
            return new Response('path outside repo', { status: 400 });
        const file = Bun.file(resolved);
        if (!(await file.exists()))
            return new Response('not found', { status: 404 });
        return new Response(await file.text(), {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
    }
    async function handleWriteSource(request) {
        try {
            const { file, content } = (await request.json());
            const resolved = resolveInRepo(file ?? '');
            if (!resolved || typeof content !== 'string') {
                return new Response(JSON.stringify({ error: 'bad request' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            await Bun.write(resolved, content);
            console.log('wrote', resolved);
            return new Response(JSON.stringify({ ok: true }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }
        catch (e) {
            return new Response(JSON.stringify({ error: String(e) }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    }
    await killStrayServer(PORT);
    function resolveFile(cfg) {
        const basePath = path.join(cfg.directory, cfg.path);
        const suffixes = ['', '.html', 'index.html'];
        for (const suffix of suffixes) {
            try {
                const pathWithSuffix = path.join(basePath, suffix);
                const stat = statSync(pathWithSuffix);
                if (stat && stat.isFile()) {
                    return pathWithSuffix;
                }
            }
            catch {
                // not found at this suffix — try the next
            }
        }
        return null;
    }
    // Serve a resolved file, injecting the haltija dev-channel loader into HTML
    // pages when enabled. Serve-time only — the loader never touches the built
    // output on disk, and non-HTML assets are streamed untouched.
    async function respondFile(filePath) {
        if (haltijaDev && filePath.endsWith('.html')) {
            const html = await Bun.file(filePath).text();
            const injected = html.includes('</body>')
                ? html.replace('</body>', `${HALTIJA_SNIPPET}</body>`)
                : html + HALTIJA_SNIPPET;
            return new Response(injected, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
            });
        }
        return new Response(Bun.file(filePath));
    }
    async function handleTestReport(request) {
        try {
            const results = await request.json();
            await Bun.write(TEST_RESULTS_FILE, JSON.stringify(results, null, 2));
            if (results.failed > 0) {
                console.error(`\n❌ Browser tests: ${results.failed} failed, ${results.passed} passed`);
                for (const [pageName, pageResults] of Object.entries(results.pages)) {
                    if (!pageResults.passed) {
                        console.error(`\n  ${pageName}:`);
                        for (const test of pageResults.tests) {
                            if (!test.passed) {
                                console.error(`    ✗ ${test.name}${test.error ? `: ${test.error}` : ''}`);
                            }
                        }
                    }
                }
                console.error('');
            }
            else if (results.passed > 0) {
                console.log(`\n✓ Browser tests: ${results.passed} passed\n`);
            }
            if (testReportResolve && (results.passed > 0 || results.failed > 0)) {
                testReportResolve(results);
            }
            return new Response(JSON.stringify({ ok: true }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }
        catch (e) {
            console.error('Failed to process test report:', e);
            return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    }
    // Idle self-exit.
    //
    // The memory ceiling below bounds how bad one server gets; this bounds how many
    // there are. A dev server is trivially forgotten — and a forgotten one is not
    // inert, it is a days-old process still running the code it loaded at launch,
    // leaking whatever that code leaked (updating the package does nothing for a
    // process that is already running). Three of those, left over from before a leak
    // fix landed, wedged a 32GB machine at ~210GB of demand. An idle server has no
    // value to weigh against that, so it exits and lets you start a current one.
    //
    // Activity is a request served or a rebuild — i.e. someone is actually reading or
    // editing. Off in test mode, which has its own timeout and exits on its own.
    const idleMs = resolveIdleMs(config.idleTimeoutHours, process.env.DEV_IDLE_TIMEOUT_HOURS);
    let lastActivity = Date.now();
    const touch = () => {
        lastActivity = Date.now();
    };
    // Memory watchdog.
    //
    // The build hands work to native code (the bundler, the HTML parser, the SVG
    // rasterizer) which can strand memory the JS heap never sees — so nothing
    // here can GC it away, and `heapUsed` stays flat while RSS climbs. A watch
    // process lives for DAYS across thousands of rebuilds, so a per-rebuild leak
    // compounds until the machine swaps itself to death. That is not
    // hypothetical: a 2-day session reached 136GB RSS and took the machine down
    // (Bun.build's native arena — see orchestrator.ts and oven-sh/bun#34053).
    // Dying loudly beats being the reason a laptop overheats: the dev server is
    // one keystroke to restart, the machine is not.
    //
    // Sampled after every rebuild AND on the periodic health tick below. The tick
    // matters: a rebuild-only check is blind to a process that is already over the
    // ceiling but has stopped rebuilding — which is exactly the shape of a server
    // you have walked away from, i.e. the one that kills the machine.
    const rssMb = () => Math.round(process.memoryUsage().rss / 1e6);
    const limitMb = resolveLimitMb(config.memoryLimitMb, process.env.DEV_MEMORY_LIMIT_MB);
    let baselineMb = 0;
    let rebuilds = 0;
    let warned = false;
    const checkMemory = (fromRebuild = true) => {
        if (limitMb <= 0)
            return; // explicitly disabled
        const mb = rssMb();
        if (fromRebuild) {
            rebuilds += 1;
            if (!baselineMb)
                baselineMb = mb;
        }
        if (!baselineMb)
            baselineMb = mb;
        const growth = mb - baselineMb;
        const each = rebuilds > 1 ? growth / (rebuilds - 1) : 0;
        if (mb >= limitMb) {
            // Distinguish the two ways to get here, because the advice is opposite:
            // memory that GREW across rebuilds is a leak (report it); a build that was
            // simply born bigger than the ceiling just needs a bigger ceiling.
            const leaking = rebuilds > 1 && each >= 1;
            const diagnosis = leaking
                ? `   ${rebuilds} rebuilds, +${growth}MB since the first ` +
                    `(~${each.toFixed(1)}MB per rebuild).\n\n` +
                    `   Growth per rebuild should be ~0, so this is a leak, not your project\n` +
                    `   getting bigger. Restarting reclaims it — please report the numbers\n` +
                    `   above. If this build genuinely needs the headroom, raise the ceiling\n` +
                    `   with DEV_MEMORY_LIMIT_MB=<mb> or memoryLimitMb in your site config.\n`
                : `   ${rebuilds} rebuild${rebuilds === 1 ? '' : 's'}, ` +
                    `+${growth}MB since the first — i.e. it is not growing.\n\n` +
                    `   This build's baseline footprint is simply above the ceiling, which is\n` +
                    `   not a leak. Raise it with DEV_MEMORY_LIMIT_MB=<mb> or memoryLimitMb in\n` +
                    `   your site config.\n`;
            console.error(`\n🛑 dev server stopping: ${mb}MB RSS, over the ${limitMb}MB limit.\n\n` +
                diagnosis);
            process.exit(1);
        }
        if (!warned && mb > limitMb * 0.6) {
            warned = true;
            console.warn(`⚠️  dev server at ${mb}MB RSS after ${rebuilds} rebuilds (+${growth}MB, ` +
                `~${each.toFixed(1)}MB each; limit ${limitMb}MB). Growth per rebuild ` +
                `should be ~0 — if this keeps climbing, restart and report it.`);
        }
    };
    if (!testMode) {
        // Rebuild on any source change. By default that's just buildSite(), but a
        // consumer whose full build has steps BEYOND buildSite — e.g. a custom IIFE
        // bundle built separately (because it needs a Bun plugin buildSite can't
        // take) — MUST pass opts.build with their whole pipeline. buildSite() starts
        // with `rm -rf <outputDir>`, so any artifact those extra steps produced
        // (iife.js, etc.) is deleted on the first rebuild and, without opts.build,
        // never regenerated — leaving the page's /iife.js to 404 into the SPA
        // fallback (it "loads as html"). Serialize builds and coalesce bursts.
        const runBuild = opts.build ?? (() => buildSite(config));
        // Rebuild-storm detector.
        //
        // The other way this process eats the machine is not a leak but a LOOP: if the
        // build writes a file that the watcher watches, every rebuild triggers the next
        // one, forever. Each iteration spawns children (bundler, css, ePub), pegs the
        // CPU, and adds the per-rebuild residual — so a loop is a leak with a throttle
        // removed. The known self-writes (`version.ts`, `icon-data.ts`) are in `ignored`
        // below, but `config.prebuild` is arbitrary consumer code: anything it writes
        // into a watched path loops, and the failure looks like "my fan is on" rather
        // than like a bug.
        //
        // RATE is the wrong signal, and it is worth saying why, because it is the obvious
        // thing to reach for and it does not work: this project's build takes ~3s, so a
        // real loop can only manage ~19 rebuilds a minute — under any "20 a minute" limit
        // you would think to set. Meanwhile a 200ms build loops at 300 a minute. No single
        // rate threshold is both blind to human editing and sensitive to a slow-build loop.
        //
        // The signal that actually separates them is that a loop is SELF-SUSTAINING: the
        // next rebuild is always already queued the instant the current one ends. There is
        // never a human-scale pause, because no human is involved. So count *consecutive
        // immediate* rebuilds, and let any ordinary gap — someone pausing to think, even
        // for two seconds — reset the count.
        const IMMEDIATE_MS = 1500;
        const LOOP_STREAK = 30; // fatal: 30 rebuilds with no human-scale gap between any
        const LOOP_WARN = 15;
        let lastBuildEnd = 0;
        let streak = 0;
        let stormWarned = false;
        const triggers = new Map();
        const topTriggers = () => [...triggers.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([p, n]) => `   ${String(n).padStart(4)}x  ${p}`)
            .join('\n');
        let building = false;
        let pending = false;
        const rebuild = async () => {
            if (building) {
                pending = true;
                return;
            }
            building = true;
            // "Immediate" covers both shapes a loop takes: for a SLOW build the self-write
            // lands mid-build and `pending` is already set when it ends (so the next rebuild
            // starts at once); for a FAST build the watcher event arrives just after the end.
            // Both look like: started again with no gap.
            const immediate = lastBuildEnd > 0 && Date.now() - lastBuildEnd < IMMEDIATE_MS;
            try {
                await runBuild();
            }
            catch (error) {
                console.error('rebuild failed:', error);
            }
            finally {
                building = false;
                lastBuildEnd = Date.now();
                streak = immediate ? streak + 1 : 0;
                touch();
                checkMemory();
                if (streak >= LOOP_STREAK) {
                    console.error(`\n🛑 dev server stopping: rebuild loop — ${streak} rebuilds back to back, ` +
                        `with no pause between any of them.\n\n` +
                        `   The files that keep triggering it:\n\n${topTriggers()}\n\n` +
                        `   A build that writes a file it also watches rebuilds forever, spawning a\n` +
                        `   bundler every time until the machine gives up — a loop is a leak with the\n` +
                        `   throttle removed. If a file above is generated by your build, stop writing\n` +
                        `   it into a watched path, or add it to the watcher's ignore list (\`ignored\`\n` +
                        `   in dev-server.ts; see the \`prebuild\` notes in the doc-site-system docs).\n`);
                    process.exit(1);
                }
                if (streak >= LOOP_WARN && !stormWarned) {
                    stormWarned = true;
                    console.warn(`⚠️  ${streak} rebuilds back to back with no pause — this looks like a rebuild\n` +
                        `    loop (a build writing a file it also watches). Top triggers:\n${topTriggers()}`);
                }
                if (pending) {
                    pending = false;
                    void rebuild();
                }
            }
        };
        // Ignore the files the build itself writes, or the watch would loop.
        const ignored = (p) => /node_modules|(^|[/\\])(version|icon-data)\.ts$/.test(p);
        const watchPaths = [
            'README.md',
            './src',
            './demo/src',
            './icons',
            ...(config.watchPaths ?? []),
        ];
        watch(watchPaths, { ignored, ignoreInitial: true }).on('all', (_event, changedPath) => {
            if (changedPath) {
                triggers.set(changedPath, (triggers.get(changedPath) ?? 0) + 1);
            }
            void rebuild();
        });
    }
    await ensureDevCerts();
    const server = Bun.serve({
        port: PORT,
        tls: {
            key: Bun.file('./tls/key.pem'),
            cert: Bun.file('./tls/certificate.pem'),
        },
        async fetch(request) {
            touch();
            let reqPath = new URL(request.url).pathname;
            console.log(request.method, reqPath);
            if (request.method === 'POST' && reqPath === '/report') {
                return handleTestReport(request);
            }
            // Source read/write for in-browser "edit page source" (opt-in, dev only).
            // A write lands in the repo file; the chokidar watcher then rebuilds and
            // the page refreshes — the build itself is the preview.
            if (config.editableSources && reqPath === '/__docstore/source') {
                if (request.method === 'GET')
                    return handleReadSource(request);
                if (request.method === 'POST')
                    return handleWriteSource(request);
            }
            if (reqPath === '/')
                reqPath = '/index.html';
            const buildFile = resolveFile({ directory: PUBLIC, path: reqPath });
            if (buildFile)
                return await respondFile(buildFile);
            if (isSPA) {
                const spaFile = resolveFile({ directory: PUBLIC, path: '/index.html' });
                if (spaFile)
                    return await respondFile(spaFile);
            }
            return new Response('File not found', { status: 404 });
        },
    });
    console.log(`Listening on https://localhost:${PORT}`);
    // ── health tick ───────────────────────────────────────────────────────────
    //
    // Everything else in this file is edge-triggered: the RSS check fires after a
    // rebuild, the preflight fires at launch. Both are blind to the state that
    // actually kills machines — a server nobody is touching any more, sitting on
    // gigabytes, on a box that is quietly filling up around it. Nothing rebuilds,
    // so nothing looks. So look on a timer, not only on an event.
    //
    // Three checks, cheapest first:
    //   1. RSS ceiling — catches a process already over the line that has stopped
    //      rebuilding (the walked-away-from server).
    //   2. Idle exit — bounds how MANY servers exist, not just how big one gets.
    //   3. Machine preflight (every tick) — catches the box going bad around us,
    //      including other projects' runaways. If the machine is dying we exit too, and
    //      print the PIDs and the kill command on the way out. Exiting IS the guard here,
    //      unlike at launch where we throw: by now we own a running server on a dying
    //      machine, and the whole point is to stop being part of the problem.
    if (!testMode) {
        if (idleMs > 0) {
            console.log(`Exits after ${idleMs / 3600_000}h idle (DEV_IDLE_TIMEOUT_HOURS=0 to disable).`);
        }
        // Every minute, not every five. The runaway that killed the machine went 0→100GB
        // in about twenty minutes; on a box whose dev budget is a fraction of its RAM
        // (most of it held by a resident model), the trip from healthy to unrecoverable
        // fits comfortably inside a five-minute window — and with swap on a fast, large
        // disk, macOS will thrash for a very long time before it gives up, which is more
        // rope to hang the machine with, not less. A `ps` + `vm_stat` per minute is free.
        const TICK_MS = 60_000;
        const timer = setInterval(async () => {
            checkMemory(false); // exits if we are over the ceiling
            const idleFor = Date.now() - lastActivity;
            if (idleMs > 0 && idleFor >= idleMs) {
                console.log(`\n💤 dev server exiting: idle for ${Math.round(idleFor / 3600_000)}h — no requests, no rebuilds.\n\n` +
                    `   Restart it when you need it; a fresh one also picks up any dependency\n` +
                    `   updates, which a long-running process never does. Disable with\n` +
                    `   DEV_IDLE_TIMEOUT_HOURS=0 or idleTimeoutHours in your site config.\n`);
                clearInterval(timer);
                server.stop();
                process.exit(0);
            }
            const ok = await preflight({
                label: 'Dev server',
                devLimitMb: config.memoryLimitMb,
                mode: config.preflight,
            });
            if (!ok) {
                clearInterval(timer);
                server.stop();
                process.exit(1);
            }
        }, TICK_MS);
        // Never let the health check itself be the thing keeping the process alive.
        timer.unref?.();
    }
    if (haltijaDev) {
        await ensureHaltijaChannel(HALTIJA_HTTPS_PORT);
    }
    if (testMode) {
        const testTimeout = 120_000;
        const testResults = new Promise((resolve, reject) => {
            testReportResolve = resolve;
            setTimeout(() => reject(new Error('Browser tests timed out')), testTimeout);
        });
        let haltija;
        /**
         * Tear down the haltija WE started — including the Electron grandchild. Defined up
         * front so EVERY failure path can call it, including the start-timeout below, which
         * used to call the naive `haltija.kill()` — that only signals the `bunx` wrapper and
         * leaves the Electron alive, so a failed run left an orphan that poisoned the next.
         *
         * The predicate is **descendants of the process we spawned** — NOT `pkill -f
         * haltija/apps/desktop`, which matches every haltija on the machine and would kill
         * the one YOU are running. And it is the *test suite* that runs this. The tree is
         * collected BEFORE the wrapper dies: once it's gone, Electron is reparented to init
         * and `pgrep -P` can no longer find it.
         */
        const descendantsOf = async (pid) => {
            const out = await $ `pgrep -P ${pid}`
                .quiet()
                .text()
                .catch(() => '');
            const kids = out
                .trim()
                .split('\n')
                .filter(Boolean)
                .map(Number)
                .filter((n) => Number.isInteger(n) && n > 0);
            const all = [...kids];
            for (const kid of kids)
                all.push(...(await descendantsOf(kid)));
            return all;
        };
        const stopHaltija = async () => {
            if (!haltija?.pid)
                return;
            const tree = await descendantsOf(haltija.pid);
            haltija.kill();
            for (const pid of tree) {
                try {
                    process.kill(pid, 'SIGTERM');
                }
                catch {
                    // already gone — fine
                }
            }
        };
        // "Reachable" = the haltija SERVER answers `hj windows`, regardless of how many
        // windows it has. This used to require `windows.length > 0`, so against a
        // running-but-zero-window haltija (the normal state after you close a tab) it
        // DECLINED to adopt it and raced a SECOND instance beside it — which never came up
        // in the budget and timed out (then leaked its Electron via the old `haltija.kill`).
        // `hj navigate` below creates/uses a window, so a zero-window server is fine to
        // adopt; we only need the server up.
        const haltijaReachable = async () => {
            try {
                await $ `hj windows`.quiet();
                return true;
            }
            catch {
                return false;
            }
        };
        if (await haltijaReachable()) {
            console.log('Using existing haltija browser');
        }
        else {
            console.log('Starting haltija...');
            // stdout/stderr are NOT inherited: `bunx haltija` launches an Electron app as a
            // grandchild, and killing the bunx wrapper does not kill it. An orphaned Electron
            // holding our inherited stdout keeps the pipe open forever, so a CI job or an
            // agent capturing this command's output sees it hang long after it exited (0).
            haltija = spawn(['bunx', HALTIJA_PKG, '-f'], {
                stdout: 'ignore',
                stderr: 'ignore',
            });
            console.log('Waiting for haltija…');
            let up = false;
            for (let i = 0; i < 20; i++) {
                await new Promise((resolve) => setTimeout(resolve, 500));
                if (await haltijaReachable()) {
                    up = true;
                    break;
                }
            }
            if (!up) {
                console.error('haltija did not become reachable within 10s');
                await stopHaltija();
                server.stop();
                process.exit(1);
            }
        }
        console.log('Opening demo site...');
        // haltija 1.4: `hj navigate` exits NON-ZERO on failure (no browser reachable, a
        // window that didn't take the URL, …). Before 1.4 it exited 0 regardless, so a
        // failed navigate silently sailed on and the run died 120s later at the test
        // timeout with a misleading "Browser tests timed out". Now we can read the exit
        // code: fail immediately, say why, and tear down the haltija we spawned so the
        // next run isn't inheriting a half-navigated browser.
        const nav = await $ `hj navigate https://localhost:${PORT}`.nothrow().quiet();
        if (nav.exitCode !== 0) {
            console.error(`hj navigate failed (exit ${nav.exitCode}): ${nav.stderr.toString().trim() || 'no browser reachable'}`);
            await stopHaltija();
            server.stop();
            process.exit(1);
        }
        try {
            const results = await testResults;
            const exitCode = results.failed > 0 ? 1 : 0;
            await stopHaltija();
            server.stop();
            process.exit(exitCode);
        }
        catch (e) {
            console.error(e.message);
            await stopHaltija();
            server.stop();
            process.exit(1);
        }
    }
}
