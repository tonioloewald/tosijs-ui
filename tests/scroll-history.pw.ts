import { test, expect } from './fixtures'

/*
#256: the content pane is what scrolls, not the page, so the browser's own scroll restoration
has nothing to restore. Navigating used to leave the pane wherever the previous page had it, in
both directions. This walks the issue's own sequence: a new page opens at its top, and Back and
Forward each return to the position that page was left at.
*/

const pane = (page: any) => page.locator('[role="main"]')
const scrollTop = (page: any): Promise<number> =>
  pane(page).evaluate((el: HTMLElement) => Math.round(el.scrollTop))
const scrollTo = (page: any, top: number) =>
  pane(page).evaluate((el: HTMLElement, top: number) => {
    el.scrollTop = top
  }, top)

// An in-content link, which goes through the same click handler a reader's click does.
const follow = (page: any, href: string) =>
  page.evaluate((href: string) => {
    const a = document.createElement('a')
    a.href = href
    a.textContent = 'next'
    document.querySelector('.doc-content')!.append(a)
    a.click()
  }, href)

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
  await page.goto('/doc-site-system/')
  await page.waitForSelector('.doc-content h1')
})

test('a new page opens at its top; Back and Forward restore positions (#256)', async ({
  page,
}) => {
  await scrollTo(page, 2500)
  expect(await scrollTop(page)).toBe(2500)

  await follow(page, '/data-table/')
  await expect(page).toHaveURL(/\/data-table\/$/)
  expect(await scrollTop(page)).toBe(0)

  await scrollTo(page, 800)
  await page.goBack()
  await expect(page).toHaveURL(/\/doc-site-system\/$/)
  await expect.poll(() => scrollTop(page)).toBe(2500)

  await page.goForward()
  await expect(page).toHaveURL(/\/data-table\/$/)
  await expect.poll(() => scrollTop(page)).toBe(800)
})

test('a link with a #heading opens at the heading, not the top', async ({
  page,
}) => {
  await scrollTo(page, 2500)
  const id = await page.evaluate(
    () => document.querySelectorAll('.doc-content h2[id]')[3]?.id
  )
  expect(id).toBeTruthy()
  await follow(page, '/data-table/')
  await follow(page, `/doc-site-system/#${id}`)
  await expect.poll(() => scrollTop(page)).toBeGreaterThan(0)
  const offset = await page.evaluate((id: string) => {
    const heading = document.getElementById(id)!
    const pane = document.querySelector('[role="main"]')!
    return Math.round(
      heading.getBoundingClientRect().top - pane.getBoundingClientRect().top
    )
  }, id!)
  expect(Math.abs(offset)).toBeLessThan(4)
})
