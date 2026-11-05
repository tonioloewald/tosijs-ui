/*
The parent side of the accessibility mode's axe audit (#3521, item 6). The browser work is in
`a11y-audit-cli.ts`, in a child process.

When it runs: with `accessibility` on, on the first full build in a process, and never under a
dev server (a watch rebuild, or `bun start`'s first build). Auditing every page in a browser
takes seconds per page; that is a release step, not something to repeat on each keystroke.

What it never does is report a pass it did not earn: when Playwright, axe-core or Chromium is
missing, the result says the audit did not run and why, and the build prints that.
*/
import { existsSync, mkdtempSync, rmSync } from 'fs';
import { runBounded } from './bounded-child.js';
import { tmpdir } from 'os';
import * as path from 'path';
/** The child's exit code when it could not run at all (a missing package or browser). */
export const NOT_RUN_EXIT = 3;
/** axe-core's tags for WCAG 2.0, 2.1 and 2.2 at levels A and AA. */
export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
/**
 * The file in `root` a request path names for the audit server, or null when it is not one.
 *
 * Containment is `root + sep`, not a bare prefix: `startsWith(root)` let `/..%2fdocs-private/x`
 * serve a sibling directory whose name starts with the output dir's (#3861). A malformed
 * percent-escape is not a file either.
 */
export function auditFileFor(root, prefix, rawPathname) {
    let pathname;
    try {
        pathname = decodeURIComponent(rawPathname);
    }
    catch {
        return null;
    }
    if (prefix && pathname.startsWith(prefix))
        pathname = pathname.slice(prefix.length) || '/';
    if (pathname.endsWith('/'))
        pathname += 'index.html';
    const base = path.resolve(root);
    const file = path.join(base, pathname);
    return file === base || file.startsWith(base + path.sep) ? file : null;
}
export async function auditBuiltSite(opts) {
    const cliTs = `${import.meta.dir}/a11y-audit-cli.ts`;
    const cli = existsSync(cliTs) ? cliTs : `${import.meta.dir}/a11y-audit-cli.js`;
    // A private directory, removed afterwards: a predictable name in a shared /tmp could be
    // planted, and the payloads were never cleaned up (#3862).
    const workDir = mkdtempSync(path.join(tmpdir(), 'tosijs-a11y-'));
    const payloadPath = path.join(workDir, 'payload.json');
    await Bun.write(payloadPath, JSON.stringify({
        outputDir: path.resolve(opts.outputDir),
        basePath: opts.basePath ?? '',
        pages: opts.pages,
        slowPageMs: opts.slowPageMs,
    }));
    /*
    The worst case, plus a minute: every page waits out the slow-page limit, four at a time. A
    run past that is hung, and is killed rather than hanging the build (#3860).
    */
    const timeoutMs = 60_000 + Math.ceil(opts.pages.length / 4) * (opts.slowPageMs ?? 30_000) * 2;
    // `--no-install`: without it Bun resolves a package the project does not have from its global
    // cache, so "not installed" would never be said and the audit would use a Playwright nobody chose.
    let run;
    try {
        run = await runBounded(['bun', '--no-install', cli, payloadPath], {
            cwd: opts.projectDir,
            timeoutMs,
        });
    }
    finally {
        rmSync(workDir, { recursive: true, force: true });
    }
    const { stdout, stderr, code } = run;
    if (run.timedOut)
        return {
            ran: false,
            reason: `the audit did not finish in ${Math.round(timeoutMs / 1000)}s and was stopped`,
        };
    if (code === NOT_RUN_EXIT)
        return { ran: false, reason: stderr.trim() };
    const line = stdout.trim().split('\n').pop() ?? '';
    try {
        if (code === 0) {
            const { violations, unsettled = [] } = JSON.parse(line);
            return { ran: true, violations, unsettled };
        }
    }
    catch {
        // fall through: a run that printed no result did not run
    }
    return {
        ran: false,
        reason: `the audit failed (exit ${code}): ${stderr.trim().slice(0, 400)}`,
    };
}
/** The report: one line per rule per page, worst impact first. */
export function formatAxeFindings(violations) {
    const rank = ['critical', 'serious', 'moderate', 'minor'];
    return [...violations]
        .sort((a, b) => rank.indexOf(a.impact ?? 'minor') - rank.indexOf(b.impact ?? 'minor') ||
        a.page.localeCompare(b.page))
        .map((v) => `    ${v.page}  ${v.rule} (${v.impact ?? 'unknown'}): ${v.help}\n` +
        v.targets
            .slice(0, 3)
            .map((t) => `        ${t}`)
            .join('\n') +
        (v.targets.length > 3
            ? `\n        … and ${v.targets.length - 3} more`
            : ''))
        .join('\n');
}
