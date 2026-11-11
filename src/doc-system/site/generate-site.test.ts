import { describe, test, expect } from 'bun:test'
import {
  pageDepth,
  relativeUrl,
  generateSite,
  rebaseRelativeRefs,
  siteLogo,
} from './generate-site.js'
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

  test('the volume manifest URL reaches the page config, where Print reads it', async () => {
    expect(await page({ bookVolumes: '/epub-volumes.json' })).toContain(
      '&quot;bookVolumes&quot;:&quot;/epub-volumes.json&quot;'
    )
    expect(await page()).not.toContain('bookVolumes')
  })

  test('the list of ePubs reaches the page config, an empty list included', async () => {
    // `[]` is how a page says "this site makes no ePub", so it must not be dropped.
    expect(await page({ ebooks: [] })).toContain('&quot;ebooks&quot;:[]')
    expect(await page({ ebooks: [{ title: 'T', url: '/t.epub' }] })).toContain(
      '&quot;url&quot;:&quot;/t.epub&quot;'
    )
    expect(await page()).not.toContain('ebooks')
  })

  test('a dead in-page link warns, and fails the build under strict', async () => {
    const docs = [
      {
        filename: 'README.md',
        title: 'Home',
        path: 'README.md',
        text: '# Home\n\n## Real\n\n[ok](#real) [dead](#unreal)',
      },
    ]
    const warned: string[] = []
    const warn = console.warn
    console.warn = (...args: unknown[]) => void warned.push(args.join(' '))
    try {
      await page({ docs })
    } finally {
      console.warn = warn
    }
    expect(warned.join('\n')).toContain('README.md: #unreal')
    expect(warned.join('\n')).not.toContain('#real')
    await expect(page({ docs, strict: true })).rejects.toThrow(/#unreal/)
  })

  test('the accessibility mode renders figures and one <h1>, and reaches the page config', async () => {
    const docs = [
      {
        filename: 'README.md',
        title: 'Lighting',
        path: 'README.md',
        text: '## Three lights\n\n![](key.png)\n\n*The key light.*',
      },
    ]
    const html = await page({ docs, accessibility: 'wcag22-aa' })
    expect(html).toContain('<h1 id="lighting">Lighting</h1>')
    expect(html).toContain('<figcaption>The key light.</figcaption>')
    // the hydrated browser renders the same way, so it must be told
    expect(html).toContain('&quot;accessibility&quot;:&quot;wcag22-aa&quot;')
    const off = await page({ docs })
    expect(off).not.toContain('<figure>')
    expect(off).not.toContain('accessibility')
  })

  test('accessibility findings warn with file and line, and fail the build under strict', async () => {
    const docs = [
      {
        filename: 'README.md',
        title: 'Home',
        path: 'README.md',
        text: '# Home\n\n![](bare.png)',
      },
    ]
    const warned: string[] = []
    const warn = console.warn
    console.warn = (...args: unknown[]) => void warned.push(args.join(' '))
    try {
      await page({ docs, accessibility: 'wcag22-aa' })
      await page({ docs })
    } finally {
      console.warn = warn
    }
    const said = warned.join('\n')
    // README.md is read for the line; this repo's README has no such image, so file only
    expect(said).toContain(
      'README.md  ![](bare.png) has no alt text and no caption'
    )
    expect(said.match(/Accessibility/g)).toHaveLength(1) // off: no report
    await expect(
      page({ docs, accessibility: 'wcag22-aa', strict: true })
    ).rejects.toThrow(/bare\.png/)
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

describe('bare-name links under strict', () => {
  const build = async (docs: any[]) => {
    const dir = `${tmpdir()}/tosi-bare-${Math.floor(performance.now() * 1000)}`
    try {
      await generateSite({
        docs,
        outputDir: dir,
        projectName: 'T',
        strict: true,
      } as any)
    } finally {
      await Bun.$`rm -rf ${dir}`.nothrow().quiet()
    }
  }
  const doc = (filename: string, text: string) => ({
    filename,
    title: filename,
    path: filename,
    text,
  })

  test('on the root page a bare name resolves (/name), so it does not fail the build', async () => {
    await build([
      doc('README.md', '# Home\n\nSee [the table](table).'),
      doc('table.md', '# Table\n\ntext'),
    ])
  })

  test('a wikilink that reaches no page fails a strict build; one by title does not (#234)', async () => {
    await build([
      doc('README.md', '# Home\n\nSee [[The feature registry]].'),
      {
        ...doc('registry.md', '# The feature registry\n\ntext'),
        title: 'The feature registry',
      },
    ])
    await expect(
      build([
        doc('README.md', '# Home\n\nSee [[presets-combat]].'),
        doc('registry.md', '# Registry\n\ntext'),
      ])
    ).rejects.toThrow('[[presets-combat]]')
  })

  test('on any other page it fails a strict build', async () => {
    await expect(
      build([
        doc('README.md', '# Home\n\ntext'),
        doc('guide.md', '# Guide\n\nSee [the table](table).'),
        doc('table.md', '# Table\n\ntext'),
      ])
    ).rejects.toThrow('bare page name')
  })
})

// virta serves its README at /readme/ as well as at the root (board #3513). A host rewrite to
// the root page 404'd the bundle, the stylesheet and docs.json, so the page never hydrated.
describe('aliases', () => {
  const docs = [
    {
      filename: 'README.md',
      title: 'Home',
      path: 'README.md',
      text: '# Home\n\nHi. ![logo](img/logo.png)',
    },
    {
      filename: 'guide.md',
      title: 'Guide',
      path: 'guide.md',
      text: '# Guide\n',
    },
  ]
  const build = async (
    aliases: Record<string, string>,
    extra: Record<string, unknown> = {}
  ) => {
    const dir = `${tmpdir()}/tosi-alias-${Math.floor(performance.now() * 1000)}`
    try {
      await generateSite({
        docs: docs as any,
        aliases,
        ...extra,
        outputDir: dir,
        projectName: 'T',
        baseUrl: 'https://t.test',
        hydrateUrl: '/hydrate-abc.js',
      } as any)
      const read = async (f: string) =>
        (await Bun.file(`${dir}/${f}`).exists())
          ? await Bun.file(`${dir}/${f}`).text()
          : null
      return {
        root: (await read('index.html')) as string,
        alias: await read('readme/index.html'),
        aliasMd: await read('readme/index.md'),
        sitemap: (await read('sitemap.xml')) as string,
        slashless: await read('guide.html'),
        aliasSlashless: await read('readme.html'),
        rootSlashless: await read('.html'),
        notFound: (await read('404.html')) as string,
      }
    } finally {
      await Bun.$`rm -rf ${dir}`.nothrow().quiet()
    }
  }

  test('an alias page is the page again, with every reference resolving from where it sits', async () => {
    const { alias, aliasMd, sitemap } = await build({ readme: '' })
    const page = 'https://t.test/readme/'
    const at = (re: RegExp) => new URL(alias!.match(re)![1], page).pathname
    expect(at(/<link rel="stylesheet" href="([^"?]+)/)).toBe('/doc-system.css')
    expect(at(/<script type="module" src="([^"]+)"/)).toBe('/hydrate-abc.js')
    expect(at(/docs="([^"?]+)/)).toBe('/docs.json')
    expect(at(/href="([^"]+)">Guide</)).toBe('/guide/')
    expect(alias).toContain('data-doc="README.md"')
    // one canonical page: the alias names the root, and stays out of the sitemap
    expect(alias).toContain('<link rel="canonical" href="https://t.test/" />')
    expect(sitemap).not.toContain('/readme/')
    expect(aliasMd).toBe('# Home\n\nHi. ![logo](img/logo.png)\n')
    expect(at(/<img src="([^"]+)"/)).toBe('/img/logo.png')
    // the browser is told, so it opens the README there and not the first doc
    expect(alias).toContain(
      '&quot;aliases&quot;:{&quot;readme&quot;:&quot;&quot;}'
    )
  })

  test('/guide with no slash is the page again, written for that URL', async () => {
    const { slashless, aliasSlashless, rootSlashless } = await build({
      readme: '',
    })
    // mounted under a subpath, where a reference written for /guide/ would miss
    const page = 'https://t.test/sub/guide'
    const at = (re: RegExp) => new URL(slashless!.match(re)![1], page).pathname
    expect(at(/<link rel="stylesheet" href="([^"?]+)/)).toBe(
      '/sub/doc-system.css'
    )
    expect(at(/<script type="module" src="([^"]+)"/)).toBe(
      '/sub/hydrate-abc.js'
    )
    expect(at(/docs="([^"?]+)/)).toBe('/sub/docs.json')
    expect(at(/href="([^"]+)">Home</)).toBe('/sub/')
    expect(slashless).toContain('data-doc="guide.md"')
    expect(slashless).toContain(
      '<link rel="canonical" href="https://t.test/guide/" />'
    )
    // an alias gets one too; the root page has no slashless form
    expect(aliasSlashless).toContain('data-doc="README.md"')
    expect(
      new URL(
        aliasSlashless!.match(/<img src="([^"]+)"/)![1],
        'https://t.test/sub/readme'
      ).pathname
    ).toBe('/sub/img/logo.png')
    expect(rootSlashless).toBeNull()
  })

  test('the 404 page is the home page with a note, and resolves from any depth (#3631)', async () => {
    const { notFound } = await build({})
    // the home page, site chrome and all (the nav lists every page)
    expect(notFound).toContain('data-doc="README.md"')
    expect(notFound).toContain('<tosi-doc-system')
    expect(notFound).toContain('Guide')
    expect(notFound).toContain('<title>Page not found — T</title>')
    expect(notFound).toContain("404: there's nothing at")
    // not the home page's URL: noindex, once, and no canonical
    expect(notFound.match(/name="robots"/g)).toEqual(['name="robots"'])
    expect(notFound).toContain('<meta name="robots" content="noindex" />')
    expect(notFound).not.toContain('rel="canonical"')
    // served at whatever URL was asked for: every reference resolves through the <base>
    const base = notFound.match(/<base href="([^"]*)"/)![1]
    expect(base).toBe('/')
    const servedAt = 'https://t.test/a/b/c/'
    const refs = [...notFound.matchAll(/(?:href|src)="([^"#][^"]*)"/g)]
      .map((m) => m[1])
      .filter((r) => !/^(https?:)?\/\//.test(r) && r !== base)
    expect(refs.length).toBeGreaterThan(3)
    for (const ref of refs)
      expect(new URL(ref, new URL(base, servedAt)).pathname).not.toStartWith(
        '/a/'
      )
    expect(new URL('img/logo.png', new URL(base, servedAt)).pathname).toBe(
      '/img/logo.png'
    )
    // its script is a template-literal string: an escaping slip there is a syntax error
    // nothing else reports, and the note silently loses its path and suggestion
    const script = [...notFound.matchAll(/<script>([\s\S]*?)<\/script>/g)]
      .map((m) => m[1])
      .find((code) => code.includes('not-found-path'))!
    expect(() => new Function(script)).not.toThrow()
  })

  test('under a basePath the 404 page resolves from the base', async () => {
    const { notFound } = await build({}, { basePath: '/repo' })
    expect(notFound).toContain('<base href="/repo/" />')
  })

  test('with no aliases the config attribute does not mention them', async () => {
    const { root, alias } = await build({})
    expect(alias).toBeNull()
    expect(root).not.toContain('aliases')
  })

  test('a wrong alias fails the build and says which', async () => {
    await expect(build({ readme: 'nope' })).rejects.toThrow(
      '"nope", which is no page'
    )
    await expect(build({ guide: '' })).rejects.toThrow(
      "already a page's own path"
    )
    await expect(build({ 'a/b': '' })).rejects.toThrow(
      'not one lowercase path segment'
    )
    // the correctness review of 1.16.36: on macOS, Guide/ IS guide/, and replaced the page
    await expect(build({ Guide: '' })).rejects.toThrow(
      'not one lowercase path segment'
    )
    // every root file the build writes has a dot: sitemap.xml was written over the alias folder
    await expect(build({ 'sitemap.xml': '' })).rejects.toThrow(
      'not one lowercase path segment'
    )
  })

  test('an alias over a static folder already in the output fails the build', async () => {
    const dir = `${tmpdir()}/tosi-alias-static-${Math.floor(
      performance.now() * 1000
    )}`
    await Bun.write(`${dir}/og/card.webp`, 'x')
    try {
      await expect(
        generateSite({
          docs: docs as any,
          aliases: { og: '' },
          outputDir: dir,
        } as any)
      ).rejects.toThrow('the alias "og" names /og/, which the site already has')
      expect(await Bun.file(`${dir}/og/index.html`).exists()).toBe(false)
    } finally {
      await Bun.$`rm -rf ${dir}`.nothrow().quiet()
    }
  })
})

describe('rebaseRelativeRefs', () => {
  test('a reference written for the page reaches the same file from its alias', () => {
    const html =
      '<img src="img/logo.png"> <a href="docs/spec.pdf#p2">s</a> <a href="guide">g</a>' +
      ' <a href="/abs/">a</a> <a href="https://x.test/">x</a> <a href="#h">h</a>' +
      ' <img src="data:image/png;base64,AA"> <a href="mailto:a@b">m</a>'
    const out = rebaseRelativeRefs(html, '/', 1)
    expect(out).toContain('src="../img/logo.png"')
    expect(out).toContain('href="../docs/spec.pdf#p2"')
    expect(out).toContain('href="../guide"')
    for (const kept of [
      'href="/abs/"',
      'href="https://x.test/"',
      'href="#h"',
      'src="data:',
      'href="mailto:',
    ])
      expect(out).toContain(kept)
    // from one page's folder to another's at the same depth
    expect(rebaseRelativeRefs('<img src="a.png">', '/guide/', 1)).toContain(
      'src="../guide/a.png"'
    )
  })
})

/*
#3565: the sitemap says when a page last changed, and the structured data names the page, its
dates, its author and its place in the nav. A book's pages are chapters in reading order.
*/
describe("#3565: lastmod, structured data, and a book's reading order", () => {
  const docs = [
    {
      filename: 'README.md',
      title: 'Home',
      path: 'README.md',
      pin: 'top',
      text: '# Home\n\nThe home page of a site.',
    },
    {
      filename: 'one.md',
      title: 'One',
      path: 'one.md',
      order: 1,
      text: '# One\n\nChapter one.',
    },
    {
      filename: 'two.md',
      title: 'Two',
      headTitle: 'Chapter two — T',
      path: 'two.md',
      order: 2,
      author: 'A. Writer',
      date: '2026-01-02',
      text: '# Two\n\nChapter two.',
    },
    {
      filename: 'part.md',
      title: 'Part',
      path: 'part.md',
      order: 3,
      text: '# Part\n\nA part.',
    },
    {
      filename: 'three.md',
      title: 'Three',
      path: 'three.md',
      parent: 'Part',
      text: '# Three\n\nIn the part.',
    },
  ]
  const build = async (extra: Record<string, unknown> = {}) => {
    const dir = `${tmpdir()}/tosi-ld-${Math.floor(performance.now() * 1000)}`
    try {
      await generateSite({
        docs: docs as any,
        outputDir: dir,
        projectName: 'T',
        baseUrl: 'https://t.test',
        hydrateUrl: '/hydrate-abc.js',
        modified: new Map([['two.md', '2026-02-03T04:05:06Z']]),
        ...extra,
      } as any)
      const read = (f: string) => Bun.file(`${dir}/${f}`).text()
      const ld = (html: string) =>
        [
          ...html.matchAll(
            /<script type="application\/ld\+json">(.*?)<\/script>/g
          ),
        ].map((m) => JSON.parse(m[1]))
      return {
        sitemap: await read('sitemap.xml'),
        home: ld(await read('index.html')),
        two: await read('two/index.html'),
        twoLd: ld(await read('two/index.html')),
        threeLd: ld(await read('three/index.html')),
        one: await read('one/index.html'),
      }
    } finally {
      await Bun.$`rm -rf ${dir}`.nothrow().quiet()
    }
  }

  test('the sitemap carries lastmod where the date is known, and invents none', async () => {
    const { sitemap } = await build()
    expect(sitemap).toContain(
      '<loc>https://t.test/two/</loc><lastmod>2026-02-03T04:05:06Z</lastmod>'
    )
    expect(sitemap).toContain('<loc>https://t.test/one/</loc></url>')
  })

  test('a page is a TechArticle with its headline, dates and author; the home page is the WebSite', async () => {
    const { home, twoLd, two } = await build({ author: 'Site Author' })
    expect(home).toEqual([
      expect.objectContaining({
        '@type': 'WebSite',
        name: 'T',
        url: 'https://t.test/',
      }),
    ])
    expect(twoLd[0]).toMatchObject({
      '@type': 'TechArticle',
      // the headTitle, without the suffix the <title> carries
      headline: 'Chapter two',
      datePublished: '2026-01-02',
      dateModified: '2026-02-03T04:05:06Z',
      // the page's own author wins over the site's
      author: { '@type': 'Person', name: 'A. Writer' },
      isPartOf: { '@type': 'WebSite', name: 'T' },
    })
    // reading order is for books
    expect(two).not.toContain('rel="prev"')
  })

  test('a page in a nav section has a BreadcrumbList of its own', async () => {
    const { threeLd, twoLd } = await build()
    expect(threeLd[1]).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Part',
          item: 'https://t.test/part/',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Three',
          item: 'https://t.test/three/',
        },
      ],
    })
    // a top-level page has no trail to give
    expect(twoLd).toHaveLength(1)
  })

  test("a book's pages are Chapters of the Book, linked in reading order", async () => {
    const { twoLd, two, one } = await build({
      kind: 'book',
      author: 'Site Author',
    })
    expect(twoLd[0]).toMatchObject({
      '@type': 'Chapter',
      name: 'Two',
      isPartOf: { '@type': 'Book', name: 'T', author: { name: 'Site Author' } },
    })
    // reading order: Home, One, Two, Part, Three
    expect(twoLd[0].position).toBe(3)
    expect(two).toContain('<link rel="prev" href="../one/" />')
    expect(two).toContain('<link rel="next" href="../part/" />')
    expect(one).toContain('<link rel="prev" href="../" />')
  })
})

/*
#3562: `bun run og` wrote a card per page that no page linked, so every share unfurled with no
image. A page now shows its own card, else the site's image, else the home page's card.
*/
describe('#3562: share images', () => {
  const png = (w: number, h: number) => {
    const b = new Uint8Array(24)
    b.set([
      0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10, 0, 0, 0, 13, 0x49, 0x48, 0x44,
      0x52,
    ])
    new DataView(b.buffer).setUint32(16, w)
    new DataView(b.buffer).setUint32(20, h)
    return b
  }
  const docs = [
    {
      filename: 'README.md',
      title: 'Home',
      path: 'README.md',
      text: '# Home\n\nHome.',
    },
    {
      filename: 'carded.md',
      title: 'Carded',
      path: 'carded.md',
      text: '# Carded\n\nHas a card.',
    },
    {
      filename: 'plain.md',
      title: 'Plain',
      path: 'plain.md',
      text: '# Plain\n\nNo card.',
    },
    {
      filename: 'own.md',
      title: 'Own',
      path: 'own.md',
      image: 'https://cdn.test/own.jpg',
      text: '# Own\n\nOwn image.',
    },
  ]
  const build = async (extra: Record<string, unknown> = {}) => {
    const dir = `${tmpdir()}/tosi-og-${Math.floor(performance.now() * 1000)}`
    try {
      await Bun.write(`${dir}/og/carded.png`, png(1200, 630))
      await Bun.write(`${dir}/og/index.png`, png(800, 400))
      await generateSite({
        docs: docs as any,
        outputDir: dir,
        projectName: 'T',
        baseUrl: 'https://t.test',
        hydrateUrl: '/hydrate-abc.js',
        ...extra,
      } as any)
      const meta = async (page: string) => {
        const html = await Bun.file(`${dir}/${page}`).text()
        const get = (key: string) =>
          html.match(
            new RegExp(`(?:property|name)="${key}" content="([^"]*)"`)
          )?.[1]
        return {
          image: get('og:image'),
          width: get('og:image:width'),
          height: get('og:image:height'),
          alt: get('og:image:alt'),
          twitter: get('twitter:image'),
        }
      }
      return {
        carded: await meta('carded/index.html'),
        plain: await meta('plain/index.html'),
        own: await meta('own/index.html'),
      }
    } finally {
      await Bun.$`rm -rf ${dir}`.nothrow().quiet()
    }
  }

  test('a page with a card shows it, with its size and an alt', async () => {
    const { carded } = await build()
    expect(carded).toEqual({
      image: 'https://t.test/og/carded.png',
      width: '1200',
      height: '630',
      alt: 'Carded — T',
      twitter: 'https://t.test/og/carded.png',
    })
  })

  test("a page without one gets the site's image, else the home page's card", async () => {
    expect((await build({ ogImage: '/brand.png' })).plain.image).toBe(
      'https://t.test/brand.png'
    )
    const { plain } = await build()
    expect(plain.image).toBe('https://t.test/og/index.png')
    expect([plain.width, plain.height]).toEqual(['800', '400'])
  })

  test("a page's own image wins, and a remote one gets no guessed size", async () => {
    const { own } = await build()
    expect(own.image).toBe('https://cdn.test/own.jpg')
    expect(own.width).toBeUndefined()
  })
})

describe('#3926: a relative logo path', () => {
  test('names a file at the site root, with basePath; everything else passes through', () => {
    expect(siteLogo('favicon.svg')).toBe('/favicon.svg')
    expect(siteLogo('img/mark.png?v=2')).toBe('/img/mark.png?v=2')
    expect(siteLogo('./mark.png')).toBe('/mark.png')
    expect(siteLogo('favicon.svg', '/repo')).toBe('/repo/favicon.svg')
    for (const kept of [
      undefined,
      'tosiFavicon', // an icon name
      '/mark.png',
      '//cdn.test/mark.png',
      'https://cdn.test/mark.png',
      'data:image/svg+xml,<svg/>',
      '<svg viewBox="0 0 1 1"></svg>',
    ])
      expect(siteLogo(kept)).toBe(kept)
  })

  test('every page, nested ones included, hands the client the root path', async () => {
    const dir = `${tmpdir()}/tosi-logo-${Math.floor(performance.now() * 1000)}`
    try {
      await generateSite({
        docs: [
          {
            filename: 'README.md',
            title: 'Home',
            path: 'README.md',
            text: '# Home',
          },
          {
            filename: 'guide.md',
            title: 'Guide',
            path: 'guide.md',
            text: '# Guide',
          },
        ],
        outputDir: dir,
        projectName: 'T',
        baseUrl: 'https://t.test',
        hydrateUrl: '/hydrate-abc.js',
        logo: 'favicon.svg',
      } as any)
      const html = await Bun.file(`${dir}/guide/index.html`).text()
      expect(html).toContain('&quot;logo&quot;:&quot;/favicon.svg&quot;')
    } finally {
      await Bun.$`rm -rf ${dir}`.nothrow().quiet()
    }
  })
})

describe('#3631: web fonts are linked, not imported', () => {
  test('each page links the fonts beside its stylesheet, and the URL loads both families', async () => {
    /*
    The burned-in stylesheet used to @import them, which cannot start until that stylesheet has
    arrived: two blocking requests in series. The URL also read `&famiSpline+Sans+Mono`, a
    missing `ly=`, so the code font never loaded on any site.
    */
    const dir = `${tmpdir()}/tosi-fonts-${Math.floor(performance.now() * 1000)}`
    try {
      await generateSite({
        docs: [
          {
            filename: 'README.md',
            title: 'Home',
            path: 'README.md',
            text: '# Home',
          },
        ],
        outputDir: dir,
        projectName: 'T',
        hydrateUrl: '/hydrate-abc.js',
      } as any)
      const html = await Bun.file(`${dir}/index.html`).text()
      const fonts = html.match(
        /<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com[^"]+)"/
      )
      expect(fonts).not.toBeNull()
      const url = new URL(fonts![1].replaceAll('&amp;', '&'))
      expect(
        url.searchParams.getAll('family').map((f) => f.split(':')[0])
      ).toEqual(['Aleo', 'Spline Sans Mono'])
      expect(url.searchParams.get('display')).toBe('swap')
    } finally {
      await Bun.$`rm -rf ${dir}`.nothrow().quiet()
    }
  })
})

/*
#255: a page in a section read in order ends its article with a link to the next page, in the
static HTML, so a reader without JavaScript has it too.
*/
describe('#255: the Continue link', () => {
  const docs = [
    { filename: 'README.md', title: 'Home', path: 'README.md', text: '# Home' },
    {
      filename: 'learn.md',
      title: 'Learn',
      path: 'learn.md',
      continue: true,
      text: '# Learn',
    },
    {
      filename: 'one.md',
      title: 'One',
      path: 'one.md',
      parent: 'Learn',
      order: 1,
      text: '# One',
    },
    {
      filename: 'two.md',
      title: 'Two',
      path: 'two.md',
      parent: 'Learn',
      order: 2,
      text: '# Two',
    },
  ]

  test('each page links the next, inside the article; the last and the rest get none', async () => {
    const dir = `${tmpdir()}/tosi-continue-${Math.floor(performance.now() * 1000)}`
    try {
      await generateSite({ docs, outputDir: dir, projectName: 'T' } as any)
      const article = async (f: string) =>
        (await Bun.file(`${dir}/${f}`).text()).match(
          /<article class="doc-content"[^>]*>([\s\S]*?)<\/article>/
        )![1]
      expect(await article('learn/index.html')).toContain(
        '<p class="doc-continue"><a href="../one/" rel="next">' +
          '<tosi-localized>Continue</tosi-localized>: One'
      )
      expect(await article('one/index.html')).toContain(
        'href="../two/" rel="next"'
      )
      expect(await article('two/index.html')).not.toContain('doc-continue')
      expect(await article('index.html')).not.toContain('doc-continue')
    } finally {
      await Bun.$`rm -rf ${dir}`.nothrow().quiet()
    }
  })
})

describe('#3914: a saved theme', () => {
  test('its web fonts are linked from every page, and only from font hosts', async () => {
    const dir = `${tmpdir()}/tosi-theme-fonts-${Math.floor(performance.now() * 1000)}`
    const lora = 'https://fonts.googleapis.com/css2?family=Lora&display=swap'
    try {
      await generateSite({
        docs: [
          {
            filename: 'README.md',
            title: 'Home',
            path: 'README.md',
            text: '# Home',
          },
        ],
        outputDir: dir,
        projectName: 'T',
        themeFile: 'theme.json',
        themeFonts: [lora, 'https://evil.example/x.css?family=Nope'],
      } as any)
      const html = await Bun.file(`${dir}/index.html`).text()
      expect(html).toContain(
        `<link rel="stylesheet" href="${lora.replace(/&/g, '&amp;')}" data-tosi-theme-font />`
      )
      expect(html).not.toContain('evil.example')
      // The browser learns where the theme lives, for the editor.
      expect(html).toContain('&quot;themeFile&quot;:&quot;theme.json&quot;')
    } finally {
      await Bun.$`rm -rf ${dir}`.nothrow().quiet()
    }
  })
})
