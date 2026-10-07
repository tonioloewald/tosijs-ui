import { test, expect, chromium } from '@playwright/test'

/*
Off localhost, tests are off until the reader turns them on from the menu, and then only the
page showing runs. That is how every tunnel visitor meets them, and no lane ran it: every other
spec loads the site as `localhost`.

The 1.16.8 re-review found this path judging the page the browser was CONSTRUCTED on rather than
the one on screen, so a reader who navigated and then turned tests on got "reported no tests"
for a page that never ran. So: arrive on a page with no tests, navigate in-app to one that has
them, turn tests on, and require that page's real results.

A hostname is all that separates the two paths, so map a made-up one to the loopback address
rather than standing up a tunnel.
*/
const HOST = 'tunnel.test'

test('off localhost, turning tests on runs the page showing now', async ({
  baseURL,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'host mapping is a Chromium flag')
  test.setTimeout(120_000)
  const origin = baseURL!.replace('localhost', HOST)
  const browser = await chromium.launch({
    args: [
      `--host-resolver-rules=MAP ${HOST} 127.0.0.1`,
      '--ignore-certificate-errors',
    ],
  })
  try {
    const page = await browser.newPage({
      ignoreHTTPSErrors: true,
      viewport: { width: 1400, height: 900 },
    })
    await page.goto(`${origin}/`)
    await page.waitForFunction(() => !!(window as any).__docTestResults)
    expect(
      await page.evaluate(() =>
        document.body.classList.contains('tests-enabled')
      ),
      'tests must start OFF off localhost, or this proves nothing'
    ).toBe(false)

    // In-app navigation, so the doc browser is the one constructed on `/`.
    // The link may sit in a collapsed nav section; the app's own click handler is what matters.
    await page.evaluate(() =>
      (
        document.querySelector(
          'a.doc-link[href$="/data-table/"]'
        ) as HTMLElement
      ).click()
    )
    await page.waitForFunction(
      () =>
        location.pathname.includes('data-table') &&
        document.querySelectorAll('tosi-example').length > 0
    )

    await page.evaluate(() => {
      const header = [...document.querySelectorAll('button')].filter((b) => {
        const r = b.getBoundingClientRect()
        return r.top < 60 && r.width > 0
      })
      header[header.length - 1].click()
    })
    await page
      .locator('.tosi-menu')
      .getByText(/^Tests \(\d+ not run\)$/)
      .click()

    const results = await page.evaluate(
      () => (window as any).__docTestResults as Promise<any>
    )
    const entry = results.pages['data-table.ts']
    expect(
      entry,
      `no results for the page on screen; recorded: ${Object.keys(
        results.pages
      ).join(', ')}`
    ).toBeTruthy()
    expect(entry.tests.length).toBeGreaterThan(3)
    expect(entry.totalFailed).toBe(0)
    expect(results.failed).toBe(0)
  } finally {
    await browser.close()
  }
})
