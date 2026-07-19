import { test, expect } from '@playwright/test'

// Paths are relative to playwright.config.ts's baseURL (the E2E lane's own server).
const BASE = ''

test('static page hydrates and navigates client-side', async ({ page }) => {
  // 1. Static page loads with correct SEO head + pre-rendered content
  await page.goto(`${BASE}/carousel/`)
  await expect(page).toHaveTitle('carousel — tosijs-ui')

  // pre-rendered markdown is present BEFORE any hydration
  await expect(page.locator('article.doc-content h1')).toHaveText('carousel')

  // 2. Component upgrades and mounts the interactive browser
  await page.waitForFunction(() => !!customElements.get('tosi-doc-system'))
  // the doc-browser builds a header + sidenav inside the element
  await expect(page.locator('tosi-doc-system header')).toBeVisible()
  await expect(page.locator('tosi-doc-system tosi-sidenav')).toBeAttached()

  // 3. Live examples hydrated from the pre-rendered code blocks
  await page.waitForFunction(
    () => document.querySelectorAll('tosi-example').length > 0
  )

  // 4. Content was ADOPTED, not re-rendered: the original <article> node survives
  const adopted = await page.evaluate(() => {
    const article = document.querySelector('article.doc-content')
    return {
      stillThere: !!article,
      heading: article?.querySelector('h1')?.textContent,
    }
  })
  expect(adopted).toMatchObject({ stillThere: true, heading: 'carousel' })

  // 5. Client-side navigation: clicking a nav link swaps content without reload
  await page.evaluate(() => ((window as any).__noReload = true))
  const dialogLink = page.locator('a.doc-link', { hasText: 'dialog' }).first()
  await dialogLink.click()

  await page.waitForFunction(() => location.pathname === '/dialog/')
  await expect(page).toHaveTitle('dialog — tosijs-ui')
  await expect(page.locator('article.doc-content h1')).toHaveText('dialog')
  // still the same document — no full reload happened
  expect(await page.evaluate(() => (window as any).__noReload)).toBe(true)

  // 6. Back button restores the previous page
  await page.goBack()
  await page.waitForFunction(() => location.pathname === '/carousel/')
  await expect(page).toHaveTitle('carousel — tosijs-ui')
})

test('internal content links navigate client-side without reload', async ({
  page,
}) => {
  await page.goto(`${BASE}/menu/`)
  await page.waitForFunction(() => !!customElements.get('tosi-doc-system'))

  // The menu doc links to the table example with the legacy `?data-table.ts`
  // form; both the static generator and the hydrated browser rewrite it to the
  // clean `/data-table/` path.
  const contentLink = page
    .locator('article.doc-content a[href="/data-table/"]')
    .first()
  await expect(contentLink).toBeVisible()

  // Clicking it should navigate in-app, not reload the page.
  await page.evaluate(() => ((window as any).__noReload = true))
  await contentLink.click()

  await page.waitForFunction(() => location.pathname === '/data-table/')
  await expect(page).toHaveTitle('table — tosijs-ui')
  await expect(page.locator('article.doc-content h1')).toHaveText('table')
  // same document — no full reload happened
  expect(await page.evaluate(() => (window as any).__noReload)).toBe(true)
})

test('a nested <tosi-doc-system> demo does not hijack the host browser state', async ({
  page,
}) => {
  // The one-source page embeds a live <tosi-doc-system> demo (memory-routed to
  // "data-table"). tosi() registers top-level keys in a GLOBAL registry, so both
  // browsers once collided on `app` — the nested one won, and the OUTER browser's
  // edit-source loaded the nested demo's doc (data-table) instead of this page.
  // Each browser now gets a unique registry key; this guards that isolation.
  await page.goto(`${BASE}/one-source-every-artifact/`)
  await page.waitForFunction(
    () => document.querySelectorAll('tosi-doc-system').length >= 2
  )
  // Open the OUTER browser's Source menu → Edit page source.
  await page.evaluate(() => {
    const outer = document.querySelector('.view-source') as HTMLElement
    outer.click()
  })
  await page.getByText('Edit page source', { exact: true }).last().click()

  // The editor must hold THIS page's markdown, not the nested demo's data-table.
  const editor = page.locator('tosi-code').first()
  await expect(editor).toBeAttached()
  const value = await editor.evaluate((el: any) => el.value as string)
  expect(value).toContain('One Source') // the one-source page's frontmatter title
  expect(value).not.toContain('A virtual data-table') // the nested demo's doc
})
