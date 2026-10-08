import { test, expect } from '@playwright/test'

/*
Print as PDF opens with the book cover.

The unit test proves the markup; this proves the things only a browser can: that the URL the
site build baked into the page resolves from the popup (an about:blank document), and that the
image the ePub build wrote beside the book actually loads there.
*/
test('Print as PDF opens with the cover the build wrote', async ({
  page,
  context,
}) => {
  // The print dialog is not what is under test, and it blocks a headed run.
  await context.addInitScript(() => {
    window.print = () => {}
  })
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/')
  await page.waitForFunction(() => !!(window as any).__docTestResults)

  await page.evaluate(() => {
    const header = [...document.querySelectorAll('button')].filter((b) => {
      const r = b.getBoundingClientRect()
      return r.top < 60 && r.width > 0
    })
    header[header.length - 1].click()
  })
  const [popup] = await Promise.all([
    context.waitForEvent('page'),
    page.locator('.tosi-menu').getByText('Print as PDF').click(),
  ])
  await popup.waitForFunction(
    () =>
      (document.querySelector('img.book-cover') as HTMLImageElement)?.complete
  )
  const cover = await popup.evaluate(() => {
    const img = document.querySelector('img.book-cover') as HTMLImageElement
    return {
      first: document.body.firstElementChild === img,
      width: img.naturalWidth,
      src: new URL(img.src).pathname,
    }
  })
  // The manifest lists the cover it names only because the build wrote that file.
  const listed = await page.evaluate(async () =>
    (
      await (await fetch('/epub-volumes.json')).json()
    ).find((v: { book: string }) => v.book === '')
  )
  expect(cover.src).toBe(listed.coverUrl)
  expect(cover.width, 'the cover image must load, not 404').toBeGreaterThan(0)
  expect(cover.first, 'the cover is the first page').toBe(true)
})
