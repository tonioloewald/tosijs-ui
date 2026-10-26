import { test, expect } from './fixtures'
import { execFileSync } from 'child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'fs'
import { tmpdir } from 'os'
import * as path from 'path'

/*
A page served at a second path (`aliases`, board #3513), as a reader meets it. virta serves its
README at /readme/ too; a host rewrite to the root page served the same bytes one level down, so
the bundle, stylesheet and docs.json 404'd and the page never hydrated.

The corpus lists the guide FIRST on purpose: a browser that did not know the aliases fell back to
the first doc, and with README first that fallback would hide the defect.

Generated and served the same way as home-page.pw.ts.
*/

const ORIGIN = 'https://alias.test'
let dir = ''

test.beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'tosijs-alias-'))
  const script = `
    import { generateSite } from './src/doc-system/site/generate-site.ts'
    await generateSite({
      docs: [
        { filename: 'guide.md', title: 'Guide', path: 'guide.md', text: '# Guide\\n\\nThe guide page.' },
        { filename: 'README.md', title: 'Read me', path: 'README.md', text: '# Read me\\n\\nThe readme page.' },
      ],
      aliases: { readme: '', start: 'guide' },
      outputDir: ${JSON.stringify(dir)},
      projectName: 'Alias Test',
    })
  `
  execFileSync('bun', ['-e', script], { stdio: 'pipe' })
})

test.afterAll(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
})

/*
What was asked for and not found, one level down: the defect asked for /readme/docs.json and the
rest under the alias. Root-level misses (/doc-system.css, /favicon.svg) are files this scratch
build does not write (generate-css.ts and the static copy do), asked for at the right place.
*/
const missing: string[] = []
const missingBelowRoot = () => missing.filter((p) => /^\/[^/]+\/./.test(p))

test.beforeEach(async ({ page }) => {
  missing.length = 0
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
  await page.route(`${ORIGIN}/**`, (route) => {
    const { pathname } = new URL(route.request().url())
    let file =
      pathname === '/iife.js'
        ? path.resolve('dist/iife.js')
        : path.join(dir, decodeURIComponent(pathname))
    if (existsSync(file) && statSync(file).isDirectory()) {
      file = path.join(file, 'index.html')
    }
    if (!existsSync(file)) {
      missing.push(pathname)
      return route.fulfill({ status: 404, body: '' })
    }
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

for (const [alias, title] of [
  ['readme', 'Read me'],
  ['start', 'Guide'],
]) {
  test(`/${alias}/ hydrates as "${title}", with nothing missing`, async ({
    page,
  }) => {
    await page.goto(`${ORIGIN}/${alias}/`)
    await page.waitForFunction(() => !!customElements.get('tosi-doc-system'))
    // hydrated: the reactive nav replaced the static list
    await expect(
      page.locator('tosi-doc-system .doc-link.current').first()
    ).toHaveText(title)
    await expect(heading(page)).toHaveText(title)
    expect(missingBelowRoot()).toEqual([])
  })
}

test('from an alias page, navigation goes to the pages’ own paths', async ({
  page,
}) => {
  await page.goto(`${ORIGIN}/readme/`)
  await page.waitForFunction(() => !!customElements.get('tosi-doc-system'))
  await page
    .locator('tosi-doc-system .doc-link', { hasText: 'Guide' })
    .first()
    .click()
  await expect(page).toHaveURL(`${ORIGIN}/guide/`)
  await expect(heading(page)).toHaveText('Guide')
  await page.goBack()
  await expect(page).toHaveURL(`${ORIGIN}/readme/`)
  await expect(heading(page)).toHaveText('Read me')
  expect(missingBelowRoot()).toEqual([])
})
