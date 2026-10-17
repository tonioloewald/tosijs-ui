import { test, expect } from './fixtures'
import { execFileSync } from 'child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'fs'
import { tmpdir } from 'os'
import * as path from 'path'

/*
A site whose root is a doc of its own (`home`, #225), as a reader meets it (#3346): `/` is
the chosen page, README has `/readme/`, and both hydrate into the doc browser and navigate by
path. The unit tests check the emitted HTML and the slug map; this checks the page.

The site is generated with `generateSite` (run under Bun, which it needs) and served from a
made-up origin by `page.route`, so it does not touch the dev server the other specs share.
*/

const ORIGIN = 'https://home.test'
let dir = ''

test.beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'tosijs-home-'))
  const script = `
    import { generateSite } from './src/doc-system/site/generate-site.ts'
    await generateSite({
      docs: [
        { filename: 'README.md', title: 'Read me', path: 'README.md', text: '# Read me\\n\\nThe readme page.' },
        { filename: 'app.md', title: 'The App', path: 'app.md', home: true, text: '# The App\\n\\nThe home page. See [the guide](/guide/).' },
        { filename: 'guide.md', title: 'Guide', path: 'guide.md', text: '# Guide\\n\\nThe guide page.' },
      ],
      outputDir: ${JSON.stringify(dir)},
      projectName: 'Home Test',
    })
  `
  execFileSync('bun', ['-e', script], { stdio: 'pipe' })
})

test.afterAll(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
})

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
  await page.route(`${ORIGIN}/**`, (route) => {
    const { pathname } = new URL(route.request().url())
    // The generated pages load the library bundle from the site root.
    let file =
      pathname === '/iife.js'
        ? path.resolve('dist/iife.js')
        : path.join(dir, decodeURIComponent(pathname))
    if (existsSync(file) && statSync(file).isDirectory()) {
      file = path.join(file, 'index.html')
    }
    if (!existsSync(file)) return route.fulfill({ status: 404, body: '' })
    const type = file.endsWith('.html')
      ? 'text/html'
      : file.endsWith('.js')
      ? 'text/javascript'
      : file.endsWith('.json')
      ? 'application/json'
      : file.endsWith('.css')
      ? 'text/css'
      : 'application/octet-stream'
    return route.fulfill({ body: readFileSync(file), contentType: type })
  })
})

const heading = (page: import('@playwright/test').Page) =>
  page.locator('tosi-doc-system h1').first()

test('/ is the home doc, before and after hydration', async ({ page }) => {
  await page.goto(`${ORIGIN}/`)
  await expect(heading(page)).toHaveText('The App')
  await page.waitForFunction(() => !!customElements.get('tosi-doc-system'))
  await expect(heading(page)).toHaveText('The App')
  await expect(page).toHaveURL(`${ORIGIN}/`)
})

test('README has its own page at /readme/', async ({ page }) => {
  await page.goto(`${ORIGIN}/readme/`)
  await page.waitForFunction(() => !!customElements.get('tosi-doc-system'))
  await expect(heading(page)).toHaveText('Read me')
})

test('navigation goes by path, and back to / returns to the home doc', async ({
  page,
}) => {
  await page.goto(`${ORIGIN}/`)
  await page.waitForFunction(() => !!customElements.get('tosi-doc-system'))
  await page.locator('tosi-doc-system a[href="/guide/"]').first().click()
  await expect(page).toHaveURL(`${ORIGIN}/guide/`)
  await expect(heading(page)).toHaveText('Guide')
  await page.goBack()
  await expect(page).toHaveURL(`${ORIGIN}/`)
  await expect(heading(page)).toHaveText('The App')
})
