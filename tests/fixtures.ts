import {
  test as base,
  type BrowserContext,
  type Page,
  type Request,
} from '@playwright/test'

export * from '@playwright/test'

/*
Every spec imports `test` from here, never from '@playwright/test' (ESLint enforces it).

Pages here carry third-party resources: the README's badges (badge.fury.io,
data.jsdelivr.com) and Google Fonts. `page.goto` waits for `load`, and `load` waits for every
image and stylesheet, so one slow badge server timed out `page-layout.pw.ts`'s `goto('/')` on
WebKit during the 1.16.24 release run. Hanging that badge host reproduces it on every engine
while our own server answers normally. Repeating the test 115 times proved only that the badge
host was answering at the time.

So third-party images, fonts and stylesheets are refused: they only change how a page looks,
and the lane asserts nothing about anyone else's servers. Third-party SCRIPTS still load,
because `ts` live examples fetch the TypeScript compiler from a CDN.

"Third-party" means another host than the document asking, not another host than `baseURL`:
specs that serve their own hostnames (`tunnel.test`, `home.test`) need their own CSS.
*/
const PAINT_ONLY = new Set(['image', 'font', 'stylesheet', 'media'])

function documentHost(request: Request): string | null {
  try {
    return new URL(request.frame().url()).host
  } catch {
    return null // a service worker's request, or a frame already gone
  }
}

/**
 * Refuse third-party paint-only resources in `target`. The fixture below does this for the
 * page Playwright gives a test (its iframes included); a spec that makes its own context
 * (`browser.newContext()`, `chromium.launch()`) must call it too, or it waits on those
 * servers again.
 *
 * In Chromium (Playwright 1.63) ANY route on an opener, page or context, stalls every
 * request from an `about:blank` popup it opens: the Print popup never asked for its cover.
 * A spec that opens one calls `page.unrouteAll()` first (print-cover.pw.ts).
 */
export async function blockThirdPartyPaint<T extends Page | BrowserContext>(
  target: T
): Promise<T> {
  await target.route(/^https?:/, (route) => {
    const request = route.request()
    const host = new URL(request.url()).host
    const asking = documentHost(request)
    const thirdParty =
      PAINT_ONLY.has(request.resourceType()) &&
      // No host to compare with (about:blank, srcdoc): leave it alone.
      !!asking &&
      asking !== host
    return thirdParty ? route.abort('blockedbyclient') : route.fallback()
  })
  return target
}

export const test = base.extend<{ thirdPartyPaintBlocked: void }>({
  thirdPartyPaintBlocked: [
    async ({ page }, use) => {
      await blockThirdPartyPaint(page)
      await use()
    },
    { auto: true },
  ],
})
