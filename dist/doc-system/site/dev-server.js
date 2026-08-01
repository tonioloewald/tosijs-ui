/*
Dev server for the static doc-site system.

`devServer(config, { test })` serves the built site over HTTPS with SPA
fallback, rebuilds on source changes, and — in test mode — drives a haltija
headless browser through the inline doc tests and exits with their pass/fail.

Build-time only (Bun APIs). Never import this from browser code.
*/
import * as path from 'path';
import { statSync } from 'fs';
import { $, spawn } from 'bun';
import { buildSite } from './orchestrator';
import { preflight } from './preflight';
import { auditDependencies, reportAudit } from './audit-guard';
import { openDevBrowser } from './open-browser';
import { resolveTunnelLocalPort } from './site-config';
import { TUNNEL_LINK_CMD, isLockedDown, hasTunnel, isLoopbackAddressForAuth as isLoopbackAddress, mayReadSite, shouldInterceptLinkToken, createAuthState, issueLink, readCookie, redeemLink, sessionCookie, urlWithoutToken, validSession, mayWriteSource, isProxiedRequest, SESSION_COOKIE, } from './dev-auth';
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
/*
^1.6.1 — the first version reporting `ready` (haltija#11), which is what lets the lane
tell "server up" from "there is a tab to drive".

The previous floor said ^1.5.5 and cited the teardown fix landing there. **1.5.5 was never
published** — the published line goes 1.5.4 → 1.6.0 — so that floor named a version that
does not exist and silently resolved to whatever 1.6+ shipped. A pin whose justification
cannot be checked is not a pin.
*/
const HALTIJA_PKG = process.env.HALTIJA_VERSION ?? 'haltija@^1.6.1';
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
 * The localhost-gated haltija dev-channel loader injected into served HTML at
 * serve time (never bundled, never in the built output).
 *
 * `self===top` keeps it in the TOP window only. The doc-browser's background test
 * runner loads every page-with-tests in a hidden iframe (`?_testMode=1`), each
 * served this same HTML — without the guard, haltija's `dev.js` gets imported
 * once per test page (N redundant loads in throwaway frames). An agent only ever
 * drives the top page, so nested frames never need the channel.
 */
/**
 * Is this request coming from THIS machine?
 *
 * The dev server binds every interface (`Bun.serve` with no `hostname`), which is
 * deliberate — the mkcert dev cert covers `<host>.local` precisely so you can open the
 * site on a phone or a second laptop. But "anyone on this network may READ the preview"
 * and "anyone on this network may REWRITE my source files" are wildly different
 * propositions, and the source endpoints were getting the first one's treatment.
 *
 * On any shared network — a café, a conference, a hotel — an unauthenticated
 * `POST /__docstore/source` is remote code execution: it writes a file in the repo, the
 * watcher rebuilds, and the build runs what was written. So those endpoints are
 * loopback-only, while the site itself stays reachable from your other devices.
 *
 * IPv4-mapped IPv6 (`::ffff:127.0.0.1`) counts — that is how a v4 client shows up on a
 * dual-stack listener, and missing it would lock out the local machine on some setups.
 *
 * ONE definition, in dev-auth. This existed twice — character for character — with each
 * copy guarding a different authorization door (`/report` + `/__devlink` here, the
 * RCE-class `POST /__docstore/source` there), so a "tidy-up" of either would silently
 * have changed a security boundary while every test stayed green.
 */
export { isLoopbackAddress };
/*
Is a haltija server DRIVABLE, from the CLI's stdout?

Pure, and exported, because the live probe cannot be trusted to represent an adopter: a
standalone `hj` bundle emits clean JSON while an npm-installed one appends a dim hint line
to stdout. Verifying against a local binary proved a fix that was inert everywhere else.
Fixtures can hold both shapes; a machine can only hold its own.

`ready` (haltija >= 1.6.1) is server-up AND a tab connected. Older CLIs lack it, so fall
back to counting windows. Anything unparseable is NOT drivable — failing closed just means
spawning a fresh instance with `-f`.
*/
export function haltijaIsDrivable(stdout) {
    try {
        const status = JSON.parse(stdout);
        if (typeof status.ready === 'boolean')
            return status.ready;
        if (Array.isArray(status.windows))
            return status.windows.length > 0;
        return false;
    }
    catch {
        return false;
    }
}
export function haltijaLoaderSnippet(httpsPort) {
    return (`<script>self===top&&/^localhost$|^127\\./.test(location.hostname)` +
        `&&import('https://localhost:${httpsPort}/dev.js')</script>`);
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
    const HALTIJA_SNIPPET = haltijaLoaderSnippet(HALTIJA_HTTPS_PORT);
    /*
    What the far end has to tell you. `ok: true` means nothing to report and nothing
    is injected into served pages. A failed rebuild sets it; the next good build
    clears it. Surfaced through the page's existing floating widget — see
    statusSnippet() below and the `__tosiDevStatus` reader in doc-browser.ts.
    */
    let buildStatus = { ok: true };
    /*
    Magic-link auth, so a workspace exposed via `tosijs-tunnel` can be edited from
    anywhere. A LINK token rides in a URL and is spent on first use; it is exchanged for
    a durable SESSION cookie that never appears in a URL. See dev-auth.ts for why that
    asymmetry is the whole design.
  
    In memory on purpose: a dev server restart invalidating sessions is a feature, not a
    gap — the credential's lifetime should not outlive the process that granted it, and
    re-linking is one command.
    */
    const auth = createAuthState();
    const LINK_PARAM = 't';
    /** Print a fresh single-use link. Called on demand (SIGUSR2) and by --link. */
    const printLink = () => {
        const token = issueLink(auth, Date.now());
        const base = config.preview?.tunnel?.url ?? `https://localhost:${PORT}`;
        const url = `${base}/?${LINK_PARAM}=${token}`;
        console.log(`\n🔗 Single-use edit link (valid 15 min, then it is spent):\n   ${url}\n`);
        return url;
    };
    /*
    `kill -USR2` still works for a human at the terminal, but it is NOT how `--link`
    finds us any more. That used `pgrep -f 'bun bin/dev.ts'`, which never matches the
    documented start command (`bun --watch bin/dev.ts`) — so the release's headline flow
    was unreachable — while it DID match `bun bin/dev.ts --build-only`, whose process
    exits before this handler is registered, so the default SIGUSR2 disposition killed
    in-flight builds. Broadcasting a signal at a guessed pattern was the whole mistake.
  
    `--link` now asks over HTTP on the loopback listener, which is unambiguous, needs no
    process discovery, and cannot signal a sibling project.
    */
    process.on('SIGUSR2', () => printLink());
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
    /*
    Serve-time status for the page's floating widget.
  
    The widget already exists and already means "the far end has something to tell
    you" — it is how browser-test results surface. A failed rebuild is the same kind
    of news, so it uses the same surface rather than inventing a second one.
  
    Injected as a plain global rather than pushed over a socket: the case that matters
    is "the build broke and I hit refresh", and a refresh re-reads this. (When Phase 2
    of REMOTE-ACCESS-PLAN.md adds a socket, it can update the same global live.)
  
    Only emitted when there IS something to say, so a healthy dev server injects
    nothing at all.
    */
    function statusSnippet(request, viaTunnel = false) {
        if (buildStatus.ok)
            return '';
        /*
        The LABEL is safe to publish; the DETAIL is not.
    
        `detail` is up to 2000 characters of build error — in practice absolute paths from
        this machine, and sometimes source excerpts. It was injected into every served page
        with no auth check, so anyone who could load the workspace read it. Anonymous
        visitors get "Build failed" and nothing else; the person holding a session, or
        sitting at the keyboard, gets the text they actually need.
        */
        const trusted = !viaTunnel ||
            validSession(auth, readCookie(request?.headers.get('cookie'), SESSION_COOKIE), Date.now());
        const payload = JSON.stringify({
            ok: false,
            label: buildStatus.label,
            detail: trusted ? buildStatus.detail : undefined,
            at: buildStatus.at,
        });
        return `<script>window.__tosiDevStatus=${payload}</script>`;
    }
    // Serve a resolved file, injecting the haltija dev-channel loader and/or a build
    // status into HTML pages. Serve-time only — neither touches the built output on
    // disk, and non-HTML assets are streamed untouched.
    async function respondFile(filePath, request, viaTunnel = false) {
        const extras = (haltijaDev ? HALTIJA_SNIPPET : '') +
            (testMode ? '' : statusSnippet(request, viaTunnel));
        if (extras && filePath.endsWith('.html')) {
            const html = await Bun.file(filePath).text();
            const injected = html.includes('</body>')
                ? html.replace('</body>', `${extras}</body>`)
                : html + extras;
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
                console.log(`\n✅ Browser tests: ${results.passed} passed\n`);
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
    const verboseLog = process.env.DEV_VERBOSE === '1';
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
    /*
    Serve WITHOUT watching (`DEV_NO_WATCH=1`).
  
    An automated suite wants a server, not a rebuilder. Playwright's `webServer` ran
    `bun start`, so a watcher sat live for the whole run and `rm -rf docs/` +
    regenerate could land underneath a test that was mid-navigation — the lane
    flaked against its own build system, which reads as a product bug and is the
    worst kind of red. `testMode` already implied this, but that flag also means
    "drive haltija", so it could not be reused. Pair this with dropping `--watch`
    from the command to silence bun's own watcher too.
    */
    const noWatch = process.env.DEV_NO_WATCH === '1' || process.env.DEV_NO_WATCH === 'true';
    if (noWatch)
        console.log('Watching disabled (DEV_NO_WATCH) — serving only.');
    if (!testMode && !noWatch) {
        // Rebuild on any source change. By default that's just buildSite(), but a
        // consumer whose full build has steps BEYOND buildSite — e.g. a custom IIFE
        // bundle built separately (because it needs a Bun plugin buildSite can't
        // take) — MUST pass opts.build with their whole pipeline. buildSite() starts
        // with `rm -rf <outputDir>`, so any artifact those extra steps produced
        // (iife.js, etc.) is deleted on the first rebuild and, without opts.build,
        // never regenerated — leaving the page's /iife.js to 404 into the SPA
        // fallback (it "loads as html"). Serialize builds and coalesce bursts.
        // Watch rebuilds skip the dependency audit: it hits the registry over the
        // network, and re-running it on every hot-reload save would add latency to the
        // edit loop and break offline dev. The audit ran once at launch (below).
        const runBuild = opts.build ?? (() => buildSite(config, { skipAudit: true }));
        /*
        The last-good stash/restore now lives in `buildSite` (orchestrator.ts), next to the
        `rm -rf` that makes it necessary — so `bun run build`, CI, adopters and this
        server's own INITIAL build are protected too, not just watch rebuilds. This wrapper
        only records status for the page widget.
        */
        const runBuildReporting = async () => {
            try {
                const result = await runBuild();
                if (result === false)
                    throw new Error('build reported failure');
                if (!buildStatus.ok)
                    console.log('✅ build recovered — serving fresh output');
                buildStatus = { ok: true, at: Date.now() };
            }
            catch (error) {
                buildStatus = {
                    ok: false,
                    label: 'Build failed',
                    detail: String(error instanceof Error ? error.message : error).slice(0, 2000),
                    at: Date.now(),
                };
                throw error;
            }
        };
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
                await runBuildReporting();
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
        /*
        Lazy — a BUILD must not pull in a file watcher.
    
        This was a top-level `import { watch } from 'chokidar'`, and dev-server.js is part of
        the shipped `tosijs-ui/site` pipeline that a consumer's `bin/site.ts` loads even in
        `--build` mode. chokidar was declared only in devDependencies, so every adopter hit
        `Cannot find package 'chokidar'` on a plain build and had to add it themselves
        (tosijs-ui#32). Importing it here means the build path never touches it, and it is now
        an OPTIONAL peer with a clear message rather than a hard runtime dependency inflicted
        on everyone who only wanted to build a site.
        */
        let watch;
        try {
            ;
            ({ watch } = await import('chokidar'));
        }
        catch {
            console.error(`\n🛑 The dev server watches for changes with \`chokidar\`, which is not installed.\n\n` +
                `   bun add -d chokidar\n\n` +
                `   It is an OPTIONAL peer: only the watching dev server needs it, so\n` +
                `   \`bun run build\` and DEV_NO_WATCH=1 work without it.\n`);
            process.exit(1);
        }
        watch(watchPaths, { ignored, ignoreInitial: true }).on('all', (_event, changedPath) => {
            if (changedPath) {
                triggers.set(changedPath, (triggers.get(changedPath) ?? 0) + 1);
            }
            void rebuild();
        });
    }
    // ── dependency audit (synchronous, before we bind the port) ─────────────────
    //
    // Runs BEFORE the server comes up, not after. The audit is sub-second (local
    // resolution + one registry round-trip, bounded by AUDIT_TIMEOUT_MS and failing
    // open on timeout), so the wait costs nothing next to the alternative: an async
    // audit spikes a server that is already listening and possibly already in use,
    // which reads as a crash and races whatever the developer started doing in the
    // meantime. A gate you wait for cannot be raced.
    //
    // THROWS rather than exits: `devServer` is a public export of `tosijs-ui/site`,
    // and refusing to start is the caller's business to handle — same contract as the
    // launch-time preflight above. (The health tick below still exits, because by then
    // we own a running server and stopping it IS the guard.)
    // Interactive only — `--test` gates synchronously in buildSite().
    if (!testMode) {
        const audit = await auditDependencies(config.audit);
        if (audit.mode !== 'off')
            reportAudit(audit, 'Dev server');
        if (!audit.ok && audit.mode === 'fail') {
            throw new Error('dev server: refusing to start — unaddressed dependency advisory (see above). ' +
                "Fix it, gate it with a reason + expiry in `audit.allow`, set `audit: { mode: 'warn' }`, " +
                'or TOSIJS_AUDIT=off.');
        }
    }
    await ensureDevCerts();
    /*
    ONE handler, TWO listeners.
  
    `viaTunnel` says which socket the request arrived on, and that is the whole point: a
    client cannot forge which port it connected to, whereas it can forge (or a proxy can
    omit) any header. The previous design inferred "local" from the ABSENCE of
    X-Forwarded-*, which fails OPEN for every forwarder that doesn't set it.
    */
    const handleRequest = async (request, srv, viaTunnel) => {
        /*
        A REQUEST is activity. This was lost in the two-listener refactor, leaving the only
        touch() in the rebuild `finally` — so the 8h idle-exit measured time since the last
        BUILD. Someone reading the tunnelled workspace all day got the server killed under
        them, with a message ("no requests, no rebuilds") that was flatly untrue.
        */
        touch();
        /*
          TWO POSTURES, because projects differ.
    
          DEFAULT — read open, write gated. Without a session the site RENDERS: read the
          docs, click around, run live examples. You just cannot change anything. This is
          usually what you want, for two reasons: the read-only view is the thing you most
          often hand someone, and an expired link degrades to a readable page rather than a
          wall — which matters when you already hold a session and open a second window or
          a second device.
    
          `tunnel.requireToken: true` — locked. No session, nothing at all, including the
          page. For work that must not be readable by whoever finds the hostname.
    
          Either way WRITES always need a session (see /__docstore/source below). The
          option only moves where READING sits.
          */
        /*
          Magic-link exchange. A `?t=` on ANY path is spent immediately for a session
          cookie, then we 302 to the same URL with the token stripped.
    
          Redirecting is not cosmetic: it is what stops the token existing in the address
          bar, in history, and in the Referer of anything the page subsequently loads.
          `Referrer-Policy: no-referrer` covers the one request that DID carry it.
    
          An invalid or already-spent token is not an error — it just falls through
          unauthenticated, so a stale link behaves like no link rather than leaking whether
          that token was ever real.
          */
        const reqUrl = new URL(request.url);
        /*
        Only intercept `?t=` when a tunnel is configured, and only on GET.
    
        `t` is the classic cache-buster name. Ungated, ANY adopter's dev server answered
        `GET /?t=12345` with "That invite link has been used" instead of the page, and 401'd
        POSTs carrying a `t` param. This gate was claimed in the rc.1 CHANGELOG and in commit
        52286147 — which never touched this file. Two published releases asserted a fix that
        did not exist.
        */
        const linkToken = shouldInterceptLinkToken({
            tunnelConfigured: hasTunnel(config),
            method: request.method,
        })
            ? reqUrl.searchParams.get(LINK_PARAM)
            : null;
        /*
          PROXIED REQUESTS NEED A SESSION FOR EVERYTHING, not just for writing.
    
          The workspace mirrors dev, so it carries unreleased work — viewing it is as
          private as editing it. Gating only the write endpoint would have left the whole
          site readable to anyone who found the hostname.
    
          This is also what removes the basic-auth dialog. Putting basicauth in front
          defeated the point of a magic link: you clicked the link and the browser asked
          for a password anyway. One credential, one prompt-free click.
    
          Redemption itself must stay reachable without a session — it is how you GET one.
          Direct (unproxied) requests are unaffected: at this keyboard, the site is just
          the dev server it has always been.
          */
        /*
        Key on the LISTENER first, exactly like every other gate in this file.
    
        This read gate was left on `X-Forwarded-*` when the WRITE path was moved off
        headers — so the two halves of the same door used different signals. Any forwarder
        that omits those headers (`ssh -R` with GatewayPorts yes, ngrok tcp, socat, iptables
        DNAT, nginx proxy_pass, HAProxy without `option forwardfor` — the list dev-auth.ts
        enumerates as the reason writes moved) arrived with viaProxy === false and read the
        entire uncommitted working tree, while `requireToken` promises "nothing at all, not
        even the page". Invisible in testing because the blessed path is Caddy, which sets
        XFF by default.
    
        `viaTunnel` cannot be forged by a client; the header check stays only as a
        belt-and-braces OR for a proxy in front of the MAIN listener.
        */
        /*
        Defaults to TRUE **when a tunnel is configured** — and only then.
    
        Reading `requireToken !== false` off an absent `preview.tunnel` armed the lock on
        servers that have no tunnel at all. The read gate then denied every proxied request
        without a session, while `shouldInterceptLinkToken` (correctly gated on the tunnel
        block) refused to read `?t=` — so the invite link could never be redeemed, and the
        401's own advice was unrunnable. Two gates, two different predicates for the same
        question. One predicate now.
        */
        const lockedDown = isLockedDown(config);
        {
            const cookie = readCookie(request.headers.get('cookie'), SESSION_COOKIE);
            if (!mayReadSite({
                lockedDown,
                viaTunnel,
                proxied: isProxiedRequest(request.headers),
                hasLinkToken: Boolean(linkToken),
                hasValidSession: validSession(auth, cookie, Date.now()),
            })) {
                return new Response(`<!doctype html><meta charset=utf-8>` +
                    `<title>Link required</title>` +
                    `<style>body{font:16px/1.6 system-ui;margin:15vh auto;max-width:30rem;padding:0 1.5rem;color:#222}` +
                    `@media(prefers-color-scheme:dark){body{background:#16171a;color:#e8e8ea}}` +
                    `code{background:#8881;padding:.1em .4em;border-radius:4px}</style>` +
                    `<h1>This workspace needs an invite link</h1>` +
                    `<p>Ask for a fresh one — they are single-use and expire after 15 minutes.</p>` +
                    `<p><code>${TUNNEL_LINK_CMD}</code></p>`, {
                    status: 401,
                    headers: {
                        'Content-Type': 'text/html; charset=utf-8',
                        'Cache-Control': 'no-store',
                        'Referrer-Policy': 'no-referrer',
                    },
                });
            }
        }
        if (linkToken) {
            const session = redeemLink(auth, linkToken, Date.now());
            const clean = urlWithoutToken(request.url, LINK_PARAM);
            const headers = {
                Location: clean,
                'Referrer-Policy': 'no-referrer',
                'Cache-Control': 'no-store',
            };
            if (session) {
                headers['Set-Cookie'] = sessionCookie(session);
                console.log('🔓 edit link redeemed — session issued');
                return new Response(null, { status: 302, headers });
            }
            /*
            Invalid or ALREADY SPENT — and the likely culprit is not an attacker but a
            chat-app link-preview bot, whose GET *is* the first use. dev-auth.ts names
            unfurlers as a reason for single-use without handling the consequence: you click
            a dead link, get silently redirected, and the next signal is a save failing.
      
            An anonymous reader who already holds a session never lands here (their cookie is
            sent automatically), so saying this out loud costs nothing and saves a confusing
            hunt.
            */
            const spent = `<!doctype html><meta charset=utf-8><title>Link already used</title>` +
                `<style>body{font:16px/1.6 system-ui;margin:15vh auto;max-width:32rem;padding:0 1.5rem;color:#222}` +
                `@media(prefers-color-scheme:dark){body{background:#16171a;color:#e8e8ea}}` +
                `code{background:#8881;padding:.1em .4em;border-radius:4px}</style>` +
                `<h1>That invite link has been used</h1>` +
                `<p>Invite links are single-use and expire after 15 minutes. If you pasted this ` +
                `link into a chat app, its link preview may have spent it before you clicked — ` +
                `which is exactly why they are single-use.</p>` +
                `<p>Ask for a fresh one: <code>${TUNNEL_LINK_CMD}</code></p>`;
            return new Response(spent, {
                status: 401,
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'no-store',
                    'Referrer-Policy': 'no-referrer',
                },
            });
        }
        let reqPath = new URL(request.url).pathname;
        // Every request, unconditionally, was drowning the warnings this release added.
        // Keep the two kinds that carry information: anything off the tunnel, and anything
        // that is not a plain success (logged at the response, below). DEV_VERBOSE=1 brings
        // back the firehose.
        if (verboseLog || viaTunnel)
            console.log(request.method, reqPath);
        /*
        Test results are LOCAL-ONLY.
    
        This sat above the hardened source endpoint and inherited none of its gating: a
        stranger reaching the tunnel could POST arbitrary JSON into `.browser-tests.json`
        and, in `--test` mode, resolve the lane with a fabricated `{passed: N, failed: 0}` —
        a green exit code for a suite that never ran. That is a worse failure than a leak:
        it makes the gate lie. It was LAN-reachable with no tunnel at all, too.
    
        Same rule as source writes, for the same reason — arriving on the tunnel listener
        means remote, whatever the peer address claims.
        */
        if (request.method === 'POST' && reqPath === '/report') {
            const peer = srv?.requestIP?.(request)?.address;
            if (viaTunnel || !isLoopbackAddress(peer)) {
                console.warn(`⚠️  refused POST /report from ${peer ?? 'unknown'} — test results are local-only.`);
                return new Response('not authorized', { status: 403 });
            }
            return handleTestReport(request);
        }
        // Source read/write for in-browser "edit page source" (opt-in, dev only).
        // A write lands in the repo file; the chokidar watcher then rebuilds and
        // the page refreshes — the build itself is the preview.
        if (reqPath === '/__docstore/source') {
            // Handle this endpoint UNCONDITIONALLY so it never falls through to the SPA
            // index.html fallback below. A 200-with-HTML there is silently corrupting:
            // the client loads the PAGE as the "source" (edit-page-source shows HTML;
            // save-to-source reads HTML). When editing isn't enabled, answer with a clean
            // status so `loadSource` falls back to the GitHub raw source (read-only), which
            // is what the deployed static site already does.
            if (!config.editableSources) {
                return new Response('editableSources is not enabled in this doc-site config (set editableSources: true to edit/save source in dev)', {
                    status: 501,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                });
            }
            /*
              WHO MAY WRITE — decided by mayWriteSource() in dev-auth.ts, which is pure and
              tested. The signal is the LISTENER this arrived on, not a header: tunnel
              traffic lands on a dedicated loopback port and always needs a session, because
              "looks local" is precisely what a tunnel counterfeits.
              */
            const peer = srv?.requestIP?.(request)?.address;
            const session = readCookie(request.headers.get('cookie'), SESSION_COOKIE);
            const authorized = mayWriteSource({
                viaTunnel,
                peer,
                hasValidSession: validSession(auth, session, Date.now()),
            });
            if (!authorized) {
                console.warn(`⚠️  refused ${request.method} /__docstore/source from ${peer ?? 'unknown'} — ` + `no session (use \`${TUNNEL_LINK_CMD}\` for an edit link).`);
                return new Response('not authorized to edit source', {
                    status: 403,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                });
            }
            if (request.method === 'GET')
                return handleReadSource(request);
            if (request.method === 'POST')
                return handleWriteSource(request);
            return new Response('method not allowed', { status: 405 });
        }
        /*
          Mint an invite link. Loopback and NOT via the tunnel: you must already be at this
          keyboard to hand out access. Reachable over the tunnel it would be a privilege
          escalation — a read-only visitor minting themselves a write session.
          */
        if (reqPath === '/__devlink') {
            const peer = srv?.requestIP?.(request)?.address;
            if (viaTunnel || !isLoopbackAddress(peer)) {
                return new Response('not available', { status: 404 });
            }
            return new Response(JSON.stringify({ url: printLink() }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store',
                },
            });
        }
        if (reqPath === '/')
            reqPath = '/index.html';
        const buildFile = resolveFile({ directory: PUBLIC, path: reqPath });
        if (buildFile)
            return await respondFile(buildFile, request, viaTunnel);
        if (isSPA) {
            const spaFile = resolveFile({ directory: PUBLIC, path: '/index.html' });
            if (spaFile)
                return await respondFile(spaFile, request, viaTunnel);
        }
        return new Response('File not found', { status: 404 });
    };
    const server = Bun.serve({
        port: PORT,
        tls: {
            key: Bun.file('./tls/key.pem'),
            cert: Bun.file('./tls/certificate.pem'),
        },
        fetch: (request, srv) => handleRequest(request, srv, false),
    });
    /*
    The TUNNEL listener: plain HTTP, bound to loopback, and the ONLY thing `ssh -R`
    should forward to.
  
    Separate from the main port on purpose. Arriving here is what marks a request as
    remote — an unforgeable fact, unlike a header — so writes through it always require
    a session even though the peer address is 127.0.0.1.
  
    Plain HTTP is fine and simpler: the hop is inside the SSH tunnel already, and it
    removes the `tls_insecure_skip_verify` the proxy previously needed to talk to a
    self-signed dev cert. `hostname: '127.0.0.1'` is load-bearing — on 0.0.0.0 this
    would be an unauthenticated plaintext copy of the dev server on the LAN.
    */
    /*
    Default the tunnel listener to PORT + 1, not a constant.
  
    A fixed `localPort` ignores PORT, so a second dev server on another port still tried
    to bind the SAME tunnel port and died with EADDRINUSE — which is exactly what happened
    to this repo's own Playwright lane (its server runs on 8799, and it collided with the
    8788 held by a `bun start` on 8787). Any adopter running two projects, or a test lane
    beside a dev server, hits it. Deriving it from PORT keeps them disjoint by
    construction; an explicit `tunnel.localPort` still wins for the machine that actually
    tunnels.
    */
    const tunnelPort = config.preview?.tunnel
        ? resolveTunnelLocalPort(config, process.env)
        : undefined;
    const configuredTunnelPort = config.preview?.tunnel?.localPort;
    let tunnelServer;
    if (tunnelPort && !testMode && !process.env.DEV_NO_TUNNEL) {
        try {
            tunnelServer = Bun.serve({
                port: tunnelPort,
                hostname: '127.0.0.1',
                fetch: (request, srv) => handleRequest(request, srv, true),
            });
            console.log(`Tunnel listener on http://127.0.0.1:${tunnelPort} (loopback only; writes require a session)`);
        }
        catch (e) {
            /*
            A busy tunnel port must not take the dev server down. It is an optional extra —
            you only need it if you are actually tunnelling — and killing the whole server
            over it turns "another instance is running" into "my dev server won't start".
            `tosijs-tunnel` already refuses loudly when nothing is listening, so the failure
            still surfaces at the moment it matters.
            */
            console.warn(`⚠️  Could not bind the tunnel listener on 127.0.0.1:${tunnelPort} ` +
                `(${e instanceof Error ? e.message : String(e)}).\n` +
                `   Serving normally; \`tosijs-tunnel\` will not work until this is free` +
                `${configuredTunnelPort ? '' : ' — it defaults to PORT + 1'}.`);
        }
    }
    console.log(`Listening on https://localhost:${PORT}`);
    // ── open (or bring to front) this project's browser tab ─────────────────────
    //
    // create-react-app's "open the tab" trick: reuse the project's existing tab
    // instead of spawning a new one on every launch/restart. Interactive only, off
    // by default (config.openBrowser), and self-skips in CI / non-TTY. Best-effort,
    // fire-and-forget — never blocks startup, never throws. See open-browser.ts.
    if (!testMode) {
        void openDevBrowser({
            url: `https://localhost:${PORT}/`,
            setting: config.openBrowser,
            name: config.name,
        });
    }
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
                tunnelServer?.stop();
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
                tunnelServer?.stop();
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
        /*
        Adoptable means DRIVABLE, not merely "the server answered".
    
        This used to adopt any server that answered `hj windows`, on the reasoning that
        `hj navigate` creates a window if there is none. That is not what happens: a server
        with `windows: []` answers fine and then `hj navigate` fails with "no browser
        reachable" — three times in one release here, each needing a manual `pkill` before
        the lane would pass. (The rule before THAT required `windows.length > 0` and raced a
        second instance; the honest signal is neither of those.)
    
        haltija >= 1.6.1 reports `ready` — server up AND a tab connected — which is exactly
        this distinction, added in response to tosijs-ui filing it (haltija#11). Older CLIs
        have no such field, so fall back to counting windows, which is closer to right than
        assuming.
    
        Declining to adopt is safe: we spawn with `-f`, which stomps the stale instance.
        */
        const haltijaReachable = async () => {
            try {
                /*
                `--json`, and fail CLOSED.
        
                Bare `hj windows` appends a dim hint line to STDOUT after the JSON, so
                `JSON.parse` throws and a `catch` that fell through to `return true` adopted the
                very dead server this check exists to reject — the gate was inert on every
                npm-installed CLI. It passed verification here only because this machine's `hj` is
                a standalone bundle with no `hints.json` beside it, so the hint was never emitted:
                a real behavioural test, run against an environment adopters do not have.
        
                Failing closed costs nothing: the spawn below uses `-f`, which stomps a stale
                instance. Adopting a server we could not read is the expensive direction.
                */
                const out = await $ `hj windows --json`.quiet().text();
                return haltijaIsDrivable(out);
            }
            catch {
                return false;
            }
        };
        const adoptable = await haltijaReachable();
        if (!adoptable) {
            /*
            Leave a receipt: spawning with `-f` reclaims haltija's shared default port, which
            SIGTERMs whatever was there — frequently another project's session, or the
            developer's own. This file already sets that norm for killStrayServer; declining to
            adopt makes the stomp MORE frequent, so it must be at least as loud.
            */
            console.log(`No drivable haltija (server absent, or up with no connected tab).\n` +
                `  Starting one with -f, which reclaims the shared haltija port — any other\n` +
                `  project's session on it will be stopped.  (cwd: ${process.cwd()})`);
        }
        if (adoptable) {
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
            const waitStarted = Date.now();
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
                console.error(`haltija did not become drivable within ${Math.round((Date.now() - waitStarted) / 1000)}s.\n` +
                    `  A single \`hj windows\` can block for several seconds when a server is up\n` +
                    `  with no tab, so this can take much longer than the poll count suggests.`);
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
