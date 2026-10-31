/*
The accessibility mode's axe audit, run in a child process (#3521, item 6).

Serves the built site, opens every page in Chromium, waits for it to hydrate, and runs axe-core
with the WCAG 2.0–2.2 A and AA rules. A child for the same reason as the ePub: a browser and
everything it strands go back to the OS on exit, and a build process may live for days.

Playwright and axe-core are the ADOPTER's: resolved from the project, never dependencies of
tosijs-ui. When either is missing, or Chromium is not installed, it says which and exits
NOT_RUN_EXIT, so the build can say the audit did not run instead of reporting a pass.

  bun a11y-audit-cli.ts <payload.json>   # payload = { outputDir, basePath, pages }
  stdout: one JSON line, { violations: AxeFinding[], unsettled: { page, reason }[] }

Build-time only. Never import this from browser code.
*/

import * as path from 'path'
import { createRequire } from 'module'
import { existsSync } from 'fs'
import { NOT_RUN_EXIT, AXE_TAGS, type AxeFinding } from './a11y-audit.js'

const payloadPath = process.argv[2]
const { outputDir, basePath, pages, slowPageMs } = JSON.parse(
  await Bun.file(payloadPath).text()
) as {
  outputDir: string
  basePath: string
  pages: string[]
  slowPageMs?: number
}

const notRun = (why: string): never => {
  console.error(why)
  process.exit(NOT_RUN_EXIT)
}

// Resolve from the project, where an adopter installs them, not from this package.
const projectRequire = createRequire(path.resolve('package.json'))
let axePath = ''
let playwright: any
try {
  axePath = projectRequire.resolve('axe-core/axe.min.js')
} catch {
  notRun('axe-core is not installed in this project (bun add -d axe-core)')
}
try {
  playwright = await import(projectRequire.resolve('playwright'))
} catch {
  notRun('playwright is not installed in this project (bun add -d playwright)')
}

const root = path.resolve(outputDir)
const prefix = (basePath || '').replace(/\/$/, '')
const server = Bun.serve({
  port: 0,
  fetch(request: Request) {
    let pathname = decodeURIComponent(new URL(request.url).pathname)
    if (prefix && pathname.startsWith(prefix))
      pathname = pathname.slice(prefix.length) || '/'
    if (pathname.endsWith('/')) pathname += 'index.html'
    const file = path.join(root, pathname)
    if (!file.startsWith(root) || !existsSync(file))
      return new Response('not found', { status: 404 })
    return new Response(Bun.file(file))
  },
})

let browser: any
try {
  browser = await playwright.chromium.launch()
} catch (error) {
  server.stop(true)
  notRun(
    `Chromium could not be launched (bunx playwright install chromium): ${
      (error as Error).message.split('\n')[0]
    }`
  )
}

/*
Pages are audited a few at a time, each in its own tab: one at a time took Learn 3D's 126 pages
to ~73s (#3585). Results are kept in page order, so the report reads the same either way.
*/
const CONCURRENCY = 4
/** How long a page may take to fire `load`, and to finish being `aria-busy`. */
const SLOW_PAGE_MS = slowPageMs ?? 30_000
/** How long an un-busy page may keep adding elements before it is audited as it stands. */
const QUIET_CAP_MS = 5_000

const perPage: AxeFinding[][] = []
const unsettled: Array<{ page: string; reason: string }> = []
try {
  const context = await browser.newContext()
  /*
  The page a reader gets: served from localhost, the doc browser would start its background test
  runner, whose hidden frames and badges no deployed site has.
  */
  await context.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
  let next = 0
  const worker = async () => {
    const page = await context.newPage()
    while (next < pages.length) {
      const index = next++
      const pagePath = pages[index]
      /*
      One slow or broken page must not end the audit of every other page, and must not pass
      unremarked either: it is listed as not fully checked.
      */
      try {
        await page.goto(`http://localhost:${server.port}${prefix}${pagePath}`, {
          waitUntil: 'load',
          timeout: SLOW_PAGE_MS,
        })
      } catch (error) {
        const message = (error as Error).message.split('\n')[0]
        if (!/timeout/i.test(message)) {
          unsettled.push({ page: pagePath, reason: `not audited: ${message}` })
          perPage[index] = []
          continue
        }
        unsettled.push({
          page: pagePath,
          reason: `did not finish loading in ${
            SLOW_PAGE_MS / 1000
          }s; audited as it stood`,
        })
      }
      // Best effort: a page that polls or streams never goes idle, and that is not a defect.
      await page
        .waitForLoadState('networkidle', { timeout: 10_000 })
        .catch(() => undefined)
      // Audit the page a reader uses: hydrated when the bundle loads, static if it does not.
      if (await page.$('tosi-doc-system'))
        await page
          .waitForFunction(() => customElements.get('tosi-doc-system'), null, {
            timeout: 10_000,
          })
          .catch(() => undefined)
      /*
      Then until the page has settled: no element added or removed for half a second, and
      nothing marked `aria-busy="true"`. A fixed pause audited a busy machine's pages
      half-built. A page that is still loading (a 3D scene fetching its models, say) says so with
      aria-busy, which screen readers also announce, and is waited for up to SLOW_PAGE_MS; one
      that merely keeps changing is audited after QUIET_CAP_MS.
      */
      const settled = await page.evaluate(
        ({ quietCap, busyCap }: { quietCap: number; busyCap: number }) =>
          new Promise<string>((resolve) => {
            const start = performance.now()
            let last = start
            const observer = new MutationObserver(() => {
              last = performance.now()
            })
            // Elements arriving, not attributes: an animation changes a style forever.
            observer.observe(document, { subtree: true, childList: true })
            const tick = () => {
              const now = performance.now()
              const busy = !!document.querySelector('[aria-busy="true"]')
              const outcome =
                now - last >= 500 && !busy
                  ? 'settled'
                  : !busy && now - start >= quietCap
                  ? 'changing'
                  : now - start >= busyCap
                  ? 'busy'
                  : ''
              if (!outcome) return void setTimeout(tick, 100)
              observer.disconnect()
              resolve(outcome)
            }
            tick()
          }),
        { quietCap: QUIET_CAP_MS, busyCap: SLOW_PAGE_MS }
      )
      if (settled === 'busy')
        unsettled.push({
          page: pagePath,
          reason: `still aria-busy after ${
            SLOW_PAGE_MS / 1000
          }s; audited as it stood`,
        })
      await page.addScriptTag({ path: axePath })
      const found = await page.evaluate(async (tags: string[]) => {
        const result = await (window as any).axe.run(document, {
          runOnly: { type: 'tag', values: tags },
        })
        return result.violations.map((v: any) => ({
          rule: v.id,
          impact: v.impact,
          help: v.help,
          targets: v.nodes.map((n: any) => n.target.join(' ')),
        }))
      }, AXE_TAGS)
      perPage[index] = found.map((v: any) => ({ page: pagePath, ...v }))
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, pages.length) }, worker)
  )
} finally {
  await browser.close()
  server.stop(true)
}
const violations = perPage.flat()
console.log(JSON.stringify({ violations, unsettled }))
