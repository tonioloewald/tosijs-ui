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
