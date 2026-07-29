/*
Open the dev page in a browser once the server is up — and REUSE the project's
tab instead of piling up a new one on every launch/restart.

This is the "react-scripts / create-react-app trick": on macOS, drive the browser
by AppleScript, look for a tab already pointed at this project's dev origin, and if
one exists just bring it to front rather than opening another. The tab's identity
(the "frame id") is the project's dev origin — `https://localhost:<port>` — which is
per-project, because each project runs its own dev port. So you get exactly ONE tab
per project: restart tosijs-ui and its tab comes forward; start a sibling project on
a different port and it gets its own tab; two runs of the same project never spawn a
second tab. (The origin is the durable key on purpose — a name/hash marker in the URL
would be dropped by the doc-browser SPA on the first in-page navigation, so it can't
identify the tab later; the origin survives every navigation.)

Best-effort and never fatal: anything unexpected degrades to a plain `open <url>`
(default browser, new tab) or a no-op. Off by default for adopters — opt in with
`openBrowser` in the site config, or the `BROWSER` env var. Build-time only (spawns
a child process); never import from browser code.

Note (macOS): controlling another app by AppleScript triggers a one-time
"<runtime> wants to control <Browser>" automation permission prompt — expected, and
the same prompt create-react-app users see. Approve it once per browser.
*/
import { $, spawn } from 'bun';
// Priority order for auto-detection (first running one wins).
const KNOWN_BROWSERS = [
    {
        app: 'Google Chrome',
        flavor: 'chromium',
        psMatch: 'Google Chrome.app',
        aliases: ['chrome', 'google chrome', 'google-chrome'],
    },
    {
        app: 'Brave Browser',
        flavor: 'chromium',
        psMatch: 'Brave Browser.app',
        aliases: ['brave', 'brave browser'],
    },
    {
        app: 'Microsoft Edge',
        flavor: 'chromium',
        psMatch: 'Microsoft Edge.app',
        aliases: ['edge', 'microsoft edge', 'msedge'],
    },
    {
        app: 'Chromium',
        flavor: 'chromium',
        psMatch: 'Chromium.app',
        aliases: ['chromium'],
    },
    {
        app: 'Safari',
        flavor: 'safari',
        psMatch: 'Safari.app',
        aliases: ['safari'],
    },
];
function findByAlias(name) {
    const n = name.trim().toLowerCase();
    return KNOWN_BROWSERS.find((b) => b.app.toLowerCase() === n || b.aliases.includes(n));
}
function firstRunning(running) {
    const blob = running.join('\n');
    return KNOWN_BROWSERS.find((b) => blob.includes(b.psMatch));
}
/** Scheme + host + port, no path — the durable per-project tab key. */
export function originOf(url) {
    try {
        return new URL(url).origin;
    }
    catch {
        // Best-effort: strip any path from a bare `https://host:port/...`.
        const m = url.match(/^[a-z]+:\/\/[^/]+/i);
        return m ? m[0] : url;
    }
}
/** AppleScript that focuses an existing project tab or opens a new one. */
export function appleScript(flavor, app, origin, url) {
    // `origin` (no path) is matched with `starts with` so any page of this project's
    // site counts as "the project's tab". `url` is only used when opening fresh.
    if (flavor === 'safari') {
        return [
            `tell application ${JSON.stringify(app)}`,
            `  activate`,
            `  set theOrigin to ${JSON.stringify(origin)}`,
            `  set found to false`,
            `  repeat with w in windows`,
            `    repeat with t in tabs of w`,
            `      if (URL of t starts with theOrigin) then`,
            `        set current tab of w to t`,
            `        set index of w to 1`,
            `        set found to true`,
            `        exit repeat`,
            `      end if`,
            `    end repeat`,
            `    if found then exit repeat`,
            `  end repeat`,
            `  if not found then`,
            `    if (count of windows) = 0 then`,
            `      make new document with properties {URL:${JSON.stringify(url)}}`,
            `    else`,
            `      tell window 1 to set current tab to (make new tab with properties {URL:${JSON.stringify(url)}})`,
            `    end if`,
            `  end if`,
            `end tell`,
        ].join('\n');
    }
    // chromium family (Chrome / Brave / Edge / Chromium share this dictionary)
    return [
        `tell application ${JSON.stringify(app)}`,
        `  activate`,
        `  set theOrigin to ${JSON.stringify(origin)}`,
        `  set found to false`,
        `  repeat with w in windows`,
        `    set tabIndex to 0`,
        `    repeat with t in tabs of w`,
        `      set tabIndex to tabIndex + 1`,
        `      if (URL of t starts with theOrigin) then`,
        `        set active tab index of w to tabIndex`,
        `        set index of w to 1`,
        `        set found to true`,
        `        exit repeat`,
        `      end if`,
        `    end repeat`,
        `    if found then exit repeat`,
        `  end repeat`,
        `  if not found then`,
        `    if (count of windows) = 0 then`,
        `      make new window`,
        `      set URL of active tab of front window to ${JSON.stringify(url)}`,
        `    else`,
        `      tell front window to make new tab with properties {URL:${JSON.stringify(url)}}`,
        `    end if`,
        `  end if`,
        `end tell`,
    ].join('\n');
}
/**
 * Decide what (if anything) to do to open the browser. Pure and fully injectable so
 * the platform/browser branches are unit-testable without spawning anything.
 */
export function buildOpenPlan(input) {
    const { url, setting, env, platform, isTTY, running } = input;
    // Default OFF for adopters: only an explicit truthy `openBrowser` (or $BROWSER) opts in.
    if (setting === undefined || setting === false) {
        return { action: 'skip', reason: 'openBrowser not enabled' };
    }
    if (env.CI === 'true')
        return { action: 'skip', reason: 'CI' };
    if (!isTTY)
        return { action: 'skip', reason: 'not a TTY (non-interactive)' };
    const browserEnv = env.BROWSER?.trim();
    if (browserEnv && /^(none|false|0)$/i.test(browserEnv)) {
        return { action: 'skip', reason: 'BROWSER=none' };
    }
    // $BROWSER wins over the config string (mirrors create-react-app / the shell norm).
    const requestedName = browserEnv || (typeof setting === 'string' ? setting.trim() : '');
    const origin = originOf(url);
    if (platform === 'darwin') {
        const known = requestedName
            ? findByAlias(requestedName)
            : firstRunning(running);
        if (known) {
            return {
                action: 'applescript',
                app: known.app,
                flavor: known.flavor,
                script: appleScript(known.flavor, known.app, origin, url),
            };
        }
        // A named-but-unrecognized app: open in it (no reuse). Nothing supported running
        // and no name given: open in the default browser (no reuse).
        return requestedName
            ? { action: 'exec', cmd: ['open', '-a', requestedName, url], reuse: false }
            : { action: 'exec', cmd: ['open', url], reuse: false };
    }
    if (platform === 'win32') {
        return { action: 'exec', cmd: ['cmd', '/c', 'start', '', url], reuse: false };
    }
    // linux / other unix
    return { action: 'exec', cmd: ['xdg-open', url], reuse: false };
}
/** `osascript` argv for a script — each line as its own `-e` (no temp file). */
export function osascriptArgv(script) {
    return ['osascript', ...script.split('\n').flatMap((line) => ['-e', line])];
}
async function detectRunningApps() {
    try {
        const out = await $ `ps -Ao comm=`.quiet().text();
        return out.split('\n').filter(Boolean);
    }
    catch {
        return [];
    }
}
/**
 * Open (or bring to front) the project's dev tab. Best-effort: logs one line, never
 * throws, never blocks. Call it once, after the server is listening — interactive
 * launches only (the caller already excludes test mode).
 */
export async function openDevBrowser(opts) {
    const platform = process.platform;
    // Only darwin uses running-app detection (to avoid launching a browser the user
    // doesn't use); other platforms just hand off to open/xdg-open/start.
    const running = platform === 'darwin' ? await detectRunningApps() : [];
    const plan = buildOpenPlan({
        url: opts.url,
        setting: opts.setting,
        env: { BROWSER: process.env.BROWSER, CI: process.env.CI },
        platform,
        isTTY: !!process.stdout.isTTY,
        running,
    });
    if (plan.action === 'skip')
        return;
    try {
        const cmd = plan.action === 'applescript' ? osascriptArgv(plan.script) : plan.cmd;
        // Detached + ignored I/O so a slow browser launch never keeps this process alive
        // or holds the dev log's pipe open.
        spawn(cmd, { stdout: 'ignore', stderr: 'ignore' });
        const tab = opts.name ? `the ${opts.name} tab` : "this project's tab";
        const where = plan.action === 'applescript'
            ? `${plan.app} (reusing ${tab} if open)`
            : 'your default browser';
        console.log(`Opening ${opts.url} in ${where}`);
    }
    catch (err) {
        console.warn(`⚠️  Could not open a browser (${String(err)}) — open ${opts.url} yourself.`);
    }
}
