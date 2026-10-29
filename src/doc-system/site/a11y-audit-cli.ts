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

import * as path from 'path'
import { createRequire } from 'module'
import { existsSync } from 'fs'
import { NOT_RUN_EXIT, AXE_TAGS, type AxeFinding } from './a11y-audit.js'

const payloadPath = process.argv[2]
const { outputDir, basePath, pages } = JSON.parse(
  await Bun.file(payloadPath).text()
) as { outputDir: string; basePath: string; pages: string[] }

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

const violations: AxeFinding[] = []
try {
  const context = await browser.newContext()
  const page = await context.newPage()
  for (const pagePath of pages) {
    await page.goto(`http://localhost:${server.port}${prefix}${pagePath}`, {
      waitUntil: 'load',
    })
    // Audit the page a reader uses: hydrated when the bundle loads, static if it does not.
    if (await page.$('tosi-doc-system'))
      await page
        .waitForFunction(() => customElements.get('tosi-doc-system'), null, {
          timeout: 10_000,
        })
        .catch(() => undefined)
    await page.waitForTimeout(300)
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
    for (const v of found) violations.push({ page: pagePath, ...v })
  }
} finally {
  await browser.close()
  server.stop(true)
}
console.log(JSON.stringify({ violations }))
