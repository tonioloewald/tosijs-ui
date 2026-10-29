/*
The accessibility mode's axe audit, run in a child process (#3521, item 6).

Serves the built site, opens every page in Chromium, waits for it to hydrate, and runs axe-core
with the WCAG 2.0–2.2 A and AA rules. A child for the same reason as the ePub: a browser and
everything it strands go back to the OS on exit, and a build process may live for days.

Playwright and axe-core are the ADOPTER's: resolved from the project, never dependencies of
tosijs-ui. When either is missing, or Chromium is not installed, it says which and exits
NOT_RUN_EXIT, so the build can say the audit did not run instead of reporting a pass.

  bun a11y-audit-cli.ts <payload.json>   # payload = { outputDir, basePath, pages }
  stdout: one JSON line, { violations: AxeFinding[] }

Build-time only. Never import this from browser code.
*/
import * as path from 'path';
import { createRequire } from 'module';
import { existsSync } from 'fs';
import { NOT_RUN_EXIT, AXE_TAGS } from './a11y-audit.js';
const payloadPath = process.argv[2];
const { outputDir, basePath, pages } = JSON.parse(await Bun.file(payloadPath).text());
const notRun = (why) => {
    console.error(why);
    process.exit(NOT_RUN_EXIT);
};
// Resolve from the project, where an adopter installs them, not from this package.
const projectRequire = createRequire(path.resolve('package.json'));
let axePath = '';
let playwright;
try {
    axePath = projectRequire.resolve('axe-core/axe.min.js');
}
catch {
    notRun('axe-core is not installed in this project (bun add -d axe-core)');
}
try {
    playwright = await import(projectRequire.resolve('playwright'));
}
catch {
    notRun('playwright is not installed in this project (bun add -d playwright)');
}
const root = path.resolve(outputDir);
const prefix = (basePath || '').replace(/\/$/, '');
const server = Bun.serve({
    port: 0,
    fetch(request) {
        let pathname = decodeURIComponent(new URL(request.url).pathname);
        if (prefix && pathname.startsWith(prefix))
            pathname = pathname.slice(prefix.length) || '/';
        if (pathname.endsWith('/'))
            pathname += 'index.html';
        const file = path.join(root, pathname);
        if (!file.startsWith(root) || !existsSync(file))
            return new Response('not found', { status: 404 });
        return new Response(Bun.file(file));
    },
});
let browser;
try {
    browser = await playwright.chromium.launch();
}
catch (error) {
    server.stop(true);
    notRun(`Chromium could not be launched (bunx playwright install chromium): ${error.message.split('\n')[0]}`);
}
/*
Pages are audited a few at a time, each in its own tab: one at a time took Learn 3D's 126 pages
to ~73s (#3585). Results are kept in page order, so the report reads the same either way.
*/
const CONCURRENCY = 4;
const perPage = [];
try {
    const context = await browser.newContext();
    /*
    The page a reader gets: served from localhost, the doc browser would start its background test
    runner, whose hidden frames and badges no deployed site has.
    */
    await context.addInitScript(() => localStorage.setItem('tosijs-ui-tests-enabled', 'false'));
    let next = 0;
    const worker = async () => {
        const page = await context.newPage();
        while (next < pages.length) {
            const index = next++;
            const pagePath = pages[index];
            await page.goto(`http://localhost:${server.port}${prefix}${pagePath}`, {
                waitUntil: 'networkidle',
            });
            // Audit the page a reader uses: hydrated when the bundle loads, static if it does not.
            if (await page.$('tosi-doc-system'))
                await page
                    .waitForFunction(() => customElements.get('tosi-doc-system'), null, {
                    timeout: 10_000,
                })
                    .catch(() => undefined);
            /*
            Then until no element has been added or removed for half a second (at most five): live examples render
            after hydration, and a fixed pause audited a busy machine's pages half-built, so the
            findings changed from run to run.
            */
            await page.evaluate(() => new Promise((resolve) => {
                let timer = setTimeout(done, 500);
                const deadline = setTimeout(done, 5000);
                const observer = new MutationObserver(() => {
                    clearTimeout(timer);
                    timer = setTimeout(done, 500);
                });
                function done() {
                    observer.disconnect();
                    clearTimeout(timer);
                    clearTimeout(deadline);
                    resolve();
                }
                // Elements arriving, not attributes: an animation changes a style forever.
                observer.observe(document, { subtree: true, childList: true });
            }));
            await page.addScriptTag({ path: axePath });
            const found = await page.evaluate(async (tags) => {
                const result = await window.axe.run(document, {
                    runOnly: { type: 'tag', values: tags },
                });
                return result.violations.map((v) => ({
                    rule: v.id,
                    impact: v.impact,
                    help: v.help,
                    targets: v.nodes.map((n) => n.target.join(' ')),
                }));
            }, AXE_TAGS);
            perPage[index] = found.map((v) => ({ page: pagePath, ...v }));
        }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pages.length) }, worker));
}
finally {
    await browser.close();
    server.stop(true);
}
const violations = perPage.flat();
console.log(JSON.stringify({ violations }));
