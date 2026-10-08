import { describe, test, expect } from 'bun:test'
import { pageDepth, relativeUrl, generateSite } from './generate-site.js'
import { tmpdir } from 'os'

describe('pageDepth', () => {
  test('root index is depth 0, every /slug/ page is depth 1', () => {
    expect(pageDepth('')).toBe(0)
    expect(pageDepth('button')).toBe(1)
    expect(pageDepth('value-renderer')).toBe(1)
  })
})

describe('relativeUrl', () => {
  test('passes external and already-relative refs through untouched', () => {
    for (const p of [
      'https://cdn.example.com/x.js',
      '//cdn.example.com/x.js',
      './local.css',
      '../up.css',
      'sibling.js',
      '',
    ]) {
      expect(relativeUrl(0, p)).toBe(p)
      expect(relativeUrl(1, p)).toBe(p)
    }
  })

  test('relativizes a root-relative asset by page depth', () => {
    expect(relativeUrl(0, '/iife.js')).toBe('iife.js')
    expect(relativeUrl(1, '/iife.js')).toBe('../iife.js')
  })

  test('relativizes a page link; the root link is never an empty href', () => {
    expect(relativeUrl(0, '/combat/')).toBe('combat/')
    expect(relativeUrl(1, '/combat/')).toBe('../combat/')
    // Linking to the site root ('/') must not collapse to '' (a self-link).
    expect(relativeUrl(0, '/')).toBe('./')
    expect(relativeUrl(1, '/')).toBe('../')
  })
})

// The whole point of the change (issue #25): ONE build's functional URLs must
// resolve to the SAME served asset at ANY mount — a project page under /repo, a
// custom-domain root, or a deeper mount — with no basePath rebuild. Resolve each
// emitted relative URL against the page's real served location, exactly as a
// browser would, and assert it lands at `<mount>/<asset>`.
describe('mount-agnostic resolution', () => {
  const mounts = ['/', '/repo/', '/deep/nested/']
  const origin = 'https://example.test'

  for (const mount of mounts) {
    test(`assets + links resolve correctly served under ${mount}`, () => {
      // Root doc (slug '', depth 0) is served AT the mount; a /slug/ doc one down.
      const rootPageUrl = origin + mount
      const slugPageUrl = origin + mount + 'combat/'

      const resolve = (pageUrl: string, depth: number, p: string) =>
        new URL(relativeUrl(depth, p), pageUrl).pathname

      // A shared asset (hydrate.js) lands at the mount root from either page.
      expect(resolve(rootPageUrl, 0, '/hydrate.js')).toBe(mount + 'hydrate.js')
      expect(resolve(slugPageUrl, 1, '/hydrate.js')).toBe(mount + 'hydrate.js')
      expect(resolve(slugPageUrl, 1, '/doc-system.css')).toBe(
        mount + 'doc-system.css'
      )

      // A nav/content link to another page lands at <mount>/<slug>/.
      expect(resolve(rootPageUrl, 0, '/magic/')).toBe(mount + 'magic/')
      expect(resolve(slugPageUrl, 1, '/magic/')).toBe(mount + 'magic/')

      // A link back to the site root lands exactly at the mount root.
      expect(resolve(slugPageUrl, 1, '/')).toBe(mount)
      expect(resolve(rootPageUrl, 0, '/')).toBe(mount)
    })
  }
})

/*
The corpus URL must be cache-busted like every other generated URL.

`docs.json` was the one emitted bare. A static host sends no `Cache-Control` for it, so
browsers apply HEURISTIC caching — free to invent a freshness lifetime — and the site renders
a previous deploy's corpus against the current bundle, with nothing in the console to say so.
That cost a maintainer a long debugging session before it was traced to a Chrome cache entry.

Stamped with `docsStamp` (hashed from docs.json's own bytes) rather than `assetStamp` (the
project version): the corpus changes whenever anyone edits a doc, many times within one
version, and a preview host redeployed mid-version is the normal way this project reads its
own site. A version-keyed corpus URL would be stale for exactly that workflow.
*/
describe('docs.json cache-busting', () => {
  const page = async (over: Record<string, unknown> = {}) => {
    const dir = `${tmpdir()}/tosi-gs-${Math.floor(performance.now() * 1000)}`
    await generateSite({
      docs: [
        {
          filename: 'README.md',
          title: 'Home',
          path: 'README.md',
          text: '# Home\n\nHello.',
        },
      ] as any,
      outputDir: dir,
      projectName: 'T',
      ...over,
    } as any)
    const html = await Bun.file(`${dir}/index.html`).text()
    await Bun.$`rm -rf ${dir}`.nothrow().quiet()
    return html
  }

  test('the book cover URL reaches the page config, where Print reads it', async () => {
    expect(await page({ bookCover: '/t-cover.png' })).toContain(
      '&quot;bookCover&quot;:&quot;/t-cover.png&quot;'
    )
    expect(await page()).not.toContain('bookCover')
  })

  test('docsStamp is applied to the corpus URL', async () => {
    const html = await page({ docsStamp: 'deadbeef', assetStamp: '9.9.9' })
    expect(html).toContain('docs.json?v=deadbeef')
  })

  test('it prefers docsStamp over the version stamp', async () => {
    const html = await page({ docsStamp: 'corpus1', assetStamp: '9.9.9' })
    // The bundles still carry the version stamp; only the corpus uses its own.
    expect(html).toContain('docs.json?v=corpus1')
    expect(html).not.toContain('docs.json?v=9.9.9')
  })

  test('with no docsStamp it falls back to the version stamp rather than going bare', async () => {
    const html = await page({ assetStamp: '9.9.9' })
    expect(html).toContain('docs.json?v=9.9.9')
  })

  test('with no stamps at all the URL is unchanged (adopters who set neither)', async () => {
    const html = await page()
    expect(html).toContain('docs.json"')
  })
})

/*
A page's markdown ships beside it, for readers that want the text and not the page.

Prompted by an LLM's URL fetcher reporting "no <body>" for a page whose whole article was in
the static HTML. We cannot fix that fetcher, but we can hand it something it cannot misread.
*/
describe('markdown copies of pages', () => {
  const build = async (
    over: Record<string, unknown> = {},
    docOver: Record<string, unknown> = {}
  ) => {
    const dir = `${tmpdir()}/tosi-md-${Math.floor(performance.now() * 1000)}`
    await generateSite({
      docs: [
        {
          filename: 'README.md',
          title: 'Home',
          path: 'README.md',
          text: '# Home\n\nHello.',
        },
        {
          filename: 'guide.md',
          title: 'Guide',
          path: 'guide.md',
          text: '# Guide\n\nRead **this**.\n\n',
          ...docOver,
        },
      ] as any,
      outputDir: dir,
      projectName: 'T',
      ...over,
    } as any)
    const read = async (f: string) =>
      (await Bun.file(`${dir}/${f}`).exists())
        ? await Bun.file(`${dir}/${f}`).text()
        : null
    const out = {
      rootMd: await read('index.md'),
      guideMd: await read('guide/index.md'),
      guideHtml: (await read('guide/index.html')) as string,
    }
    await Bun.$`rm -rf ${dir}`.nothrow().quiet()
    return out
  }
  const ALTERNATE = '<link rel="alternate" type="text/markdown" href="index.md"'

  test('each page gets its source as index.md, and links to it', async () => {
    const { rootMd, guideMd, guideHtml } = await build()
    expect(rootMd).toBe('# Home\n\nHello.\n')
    expect(guideMd).toBe('# Guide\n\nRead **this**.\n')
    expect(guideHtml).toContain(ALTERNATE)
  })

  test('a noindex page gets neither the file nor the link', async () => {
    const { rootMd, guideMd, guideHtml } = await build({}, { noindex: true })
    expect(guideMd).toBeNull()
    expect(guideHtml).not.toContain(ALTERNATE)
    // …and the rule is per page, not per site.
    expect(rootMd).not.toBeNull()
  })

  test('markdownPages: false ships HTML only', async () => {
    const { rootMd, guideMd, guideHtml } = await build({ markdownPages: false })
    expect(rootMd).toBeNull()
    expect(guideMd).toBeNull()
    expect(guideHtml).not.toContain(ALTERNATE)
  })

  test('charset is declared within the first 1024 bytes, ahead of any script', async () => {
    const { guideHtml } = await build()
    const charset = new TextEncoder().encode(
      guideHtml.slice(0, guideHtml.indexOf('<meta charset'))
    ).length
    expect(guideHtml).toContain('<meta charset="utf-8" />')
    expect(charset).toBeLessThan(1024)
    expect(guideHtml.indexOf('<meta charset')).toBeLessThan(
      guideHtml.indexOf('<script')
    )
  })
})
