import { test, expect, chromium, isolateThirdParty } from './fixtures'

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
    await isolateThirdParty(page.context())
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
    expect(
      entry.totalFailed,
      // name what failed: a bare count is no use for a failure that comes and goes
      JSON.stringify(entry.tests.filter((t: any) => !t.passed))
    ).toBe(0)
    expect(results.failed).toBe(0)
  } finally {
    await browser.close()
  }
})

/*
Save to source off localhost follows the dev server, not the hostname (#3346). A made-up
hostname still reaches the server from loopback, which it admits, so a live example must offer
Save to source here, as it would to a LAN device under trustLan or a tunnel edit session. This
covers the server half too: the page marker, the HEAD route and its header.
*/
test('off localhost, a live example offers Save to source when the server admits the page', async ({
  baseURL,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'host mapping is a Chromium flag')
  const origin = baseURL!.replace('localhost', HOST)
  const browser = await chromium.launch({
    args: [
      `--host-resolver-rules=MAP ${HOST} 127.0.0.1`,
      '--ignore-certificate-errors',
    ],
  })
  try {
    const page = await browser.newPage({ ignoreHTTPSErrors: true })
    await isolateThirdParty(page.context())
    await page.goto(`${origin}/rating/`)
    const example = page.locator('tosi-example[data-source-file]').first()
    await example.waitFor({ state: 'attached', timeout: 10_000 })
    expect(
      await page.evaluate(() => (window as any).__tosiSourceEndpoint)
    ).toBe(true)
    const file = await example.getAttribute('data-source-file')
    const head = await page.evaluate(async (f) => {
      const r = await fetch(
        `/__docstore/source?file=${encodeURIComponent(f!)}`,
        { method: 'HEAD' }
      )
      return { status: r.status, header: r.headers.get('x-tosijs-source') }
    }, file)
    expect(head).toEqual({ status: 200, header: 'editable' })

    await example.evaluate((e: any) => e.showCode())
    await page.locator('button.source-menu').first().click({ timeout: 10_000 })
    await expect(
      page.locator('tosi-menu, .tosi-menu').getByText('Save to source')
    ).toBeVisible()
  } finally {
    await browser.close()
  }
})
