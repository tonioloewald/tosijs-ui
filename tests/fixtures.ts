import {
  test as base,
  type BrowserContext,
  type Page,
  type Request,
  type Route,
} from '@playwright/test'
import { createHash } from 'crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'fs'
import * as path from 'path'

export * from '@playwright/test'

/*
Every spec imports `test` from here, never from '@playwright/test' (ESLint enforces it).

Pages here carry third-party resources: the README's badges (badge.fury.io,
data.jsdelivr.com), Google Fonts, and live examples that load libraries from a CDN at run time
(`via-tag` pulls Quill from jsdelivr). `page.goto` waits for `load`, which waits for every image
and stylesheet, so one slow badge server timed out `page-layout.pw.ts`'s `goto('/')` on WebKit
during the 1.16.24 release run; hanging that host reproduces it on every engine while our own
server answers normally. Repeating the test 115 times proved only that the host was up then.

So the lane does not wait on anyone else's servers:

- Third-party images, stylesheets and fonts are ANSWERED here, not refused: a 1x1 image, an
  empty stylesheet. Refusing them was the first version, and it left `via-tag`'s Quill example
  blank in Chromium, because its `styleSheet()` waits for `onload`, which a refused stylesheet
  never fires. The lane asserts nothing about how a CDN's CSS looks.
- Scripts and fetches from a VERSION-PINNED CDN URL (`…/quill@2.0.2/…` on jsdelivr or unpkg)
  are served from a local cache after the first fetch. Such a URL never changes what it serves.
  esm.sh is left alone: it varies what it serves by browser.
- Everything else goes to the network as before.

"Third-party" means another host than the document asking, not another host than `baseURL`:
specs that serve their own hostnames (`tunnel.test`, `home.test`) need their own CSS.

WebKit does not route every request: the stylesheets Quill's example inserts reached jsdelivr
without passing through here. What WebKit does not route still depends on the network.
*/
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)
const PINNED_CDN = /^https:\/\/(cdn\.jsdelivr\.net|unpkg\.com)\/.*@\d[^/]*\//
const CDN_CACHE = path.resolve('node_modules/.cache/tosijs-e2e-cdn')

function documentHost(request: Request): string | null {
  try {
    return new URL(request.frame().url()).host
  } catch {
    return null // a service worker's request, or a frame already gone
  }
}

async function fromCdnCache(route: Route): Promise<void> {
  const url = route.request().url()
  const file = path.join(
    CDN_CACHE,
    createHash('sha1').update(url).digest('hex')
  )
  if (existsSync(file)) {
    const { contentType } = JSON.parse(readFileSync(file + '.json', 'utf8'))
    return route.fulfill({ body: readFileSync(file), contentType })
  }
  const response = await route.fetch()
  if (response.ok()) {
    mkdirSync(CDN_CACHE, { recursive: true })
    // Through a temporary name: parallel workers may fetch the same URL at once.
    const temp = `${file}.${process.pid}.tmp`
    writeFileSync(temp, await response.body())
    writeFileSync(
      file + '.json',
      JSON.stringify({ url, contentType: response.headers()['content-type'] })
    )
    renameSync(temp, file)
  }
  return route.fulfill({ response })
}

/**
 * Keep third-party servers out of `target`'s page loads (see above). The fixture below does this
 * for the page Playwright gives a test (its iframes included); a spec that makes its own context
 * (`browser.newContext()`, `chromium.launch()`) must call it too.
 *
 * In Chromium (Playwright 1.63) ANY route on an opener, page or context, stalls every request
 * from an `about:blank` popup it opens: the Print popup never asked for its cover. A spec that
 * opens one calls `page.unrouteAll()` first (print-cover.pw.ts; UPSTREAM.md).
 */
export async function isolateThirdParty<T extends Page | BrowserContext>(
  target: T
): Promise<T> {
  await target.route(/^https?:/, (route) => {
    const request = route.request()
    const host = new URL(request.url()).host
    const asking = documentHost(request)
    // No host to compare with (about:blank, srcdoc), or our own: leave it alone.
    if (!asking || asking === host) return route.fallback()
    switch (request.resourceType()) {
      case 'image':
        return route.fulfill({ body: PIXEL, contentType: 'image/gif' })
      case 'stylesheet':
        return route.fulfill({ body: '', contentType: 'text/css' })
      case 'font':
      case 'media':
        return route.abort('blockedbyclient')
    }
    return PINNED_CDN.test(request.url())
      ? fromCdnCache(route)
      : route.fallback()
  })
  return target
}

export const test = base.extend<{ thirdPartyIsolated: void }>({
  thirdPartyIsolated: [
    async ({ page }, use) => {
      await isolateThirdParty(page)
      await use()
    },
    { auto: true },
  ],
})
