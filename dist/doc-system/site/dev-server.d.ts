import type { SiteConfig } from './site-config.js';
import { isLoopbackAddressForAuth as isLoopbackAddress } from './dev-auth.js';
/**
 * Every path the dev server watches for changes.
 *
 * `docPaths` is included because that is where an adopter DECLARES their documentation —
 * omitting it meant a root-level doc (`Migration.md`, say) was served and rendered but never
 * watched: edit, save, refresh, stale page, no rebuild, and no message anywhere. The failure
 * is indistinguishable from the other stale-page causes (bunx cache, browser cache, a
 * restored last-good build), which is what made it cost several sessions to pin (#49).
 *
 * `staticDirs` is included for exactly the same reason, one bug later (#110). `buildSite`
 * COPIES those directories into the output on every build, so a replaced asset is only picked
 * up when something else happens to trigger a rebuild — re-export a GLB over `static/model.glb`
 * and the dev server keeps serving the previous copy indefinitely, with no error and no hint.
 * Both files exist and only their contents differ, which is the hardest version of stale to
 * see. The workaround people find is touching a source file to provoke a rebuild, which is a
 * strong signal the tool should be doing it.
 *
 * The built-in defaults stay for projects that declare no `docPaths`. `watchPaths` remains
 * the additive override. Deduped by RESOLVED path, so `src`, `./src` and an absolute form
 * collapse to one watcher rather than three firing three rebuilds for one keystroke.
 */
/**
 * Is `candidate` inside `root` — the same directory, or below it?
 *
 * Exported so it can be tested directly. The dev server's static handler cannot reach a
 * containment violation over HTTP, because the WHATWG URL parser collapses `../` before
 * `.pathname` is read — which is exactly the problem: the guarantee belongs to the CALLER, so a
 * test that goes through the server proves nothing about this rule (tosijs-ui#96).
 *
 * `root + sep` rather than a bare `startsWith`, or `/srv/docs-evil` counts as inside `/srv/docs`.
 */
export declare function isUnderRoot(root: string, candidate: string): boolean;
export declare function resolveWatchPaths(config: {
    docPaths?: string[];
    watchPaths?: string[];
    staticDirs?: string[];
}, root?: string): string[];
declare global {
    var Bun: any;
}
export declare function resolveHaltijaChannel(cwd?: string, env?: Record<string, string | undefined>): {
    argv: string[];
    describe: string;
};
/**
 * Resolve the idle-exit timeout to milliseconds (0 = disabled).
 *
 * Env wins over config, config over the default. An unparseable value falls back
 * to the default rather than to 0: a typo'd `DEV_IDLE_TIMEOUT_HOURS=8h` must not
 * silently turn the guard OFF — that is the exact failure it exists to prevent.
 * Only an explicit non-positive number disables it.
 */
export declare function resolveIdleMs(configHours: number | undefined, envHours: string | undefined): number;
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
export declare function resolveLimitMb(configMb: number | undefined, envMb: string | undefined): number;
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
export declare function haltijaIsDrivable(stdout: string): boolean;
export declare function haltijaLoaderSnippet(httpsPort: number): string;
/**
 * The SAME-ORIGIN loader, for a page reached over the tunnel (`haltijaDev: 'tunnel'`).
 *
 * Over the tunnel `localhost` is the HEADSET, so every hardcoded `https://localhost:8701` in
 * the upstream chain points at the wrong machine. This skips that chain entirely rather than
 * asking haltija to change: `dev.js` and `inject.js` exist only to set `__haltija_config__`
 * and load `component.js`, and both carry their own localhost gates. `component.js` has NO
 * such gate — it reads `__haltija_config__.serverUrl` and falls back to localhost only when
 * the config is absent — so setting the config ourselves and loading the component directly
 * is both sufficient and the only part that can work remotely.
 *
 * `serverUrl` is derived from the page's own origin at runtime, not baked in, because the
 * tunnel hostname is not known when this string is built and can differ per request.
 *
 * `self===top` is kept from the localhost loader: an iframe should not attach a second widget,
 * and the doc-test runner executes pages in hidden iframes.
 */
export declare function haltijaTunnelLoaderSnippet(): string;
/** Same-origin paths the tunnel bridge serves. One place, so the loader and the routes agree. */
export declare const HALTIJA_BRIDGE_PREFIX = "/__haltija/";
export declare const HALTIJA_BRIDGE_WS = "/__haltija/ws";
export declare const HALTIJA_BRIDGE_COMPONENT = "/__haltija/component.js";
/** br if the client takes it, else gzip, else nothing. */
export declare function negotiateEncoding(accept: string | null): 'br' | 'gzip' | null;
/** Is this worth compressing? Already-compressed formats only get bigger. */
export declare function isCompressible(filePath: string): boolean;
export declare function devServer(config: SiteConfig, opts?: {
    test?: boolean;
    build?: () => unknown | Promise<unknown>;
}): Promise<void>;
