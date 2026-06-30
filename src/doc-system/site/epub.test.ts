import { test, expect } from 'bun:test'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { toXhtml, escapeXml, stripDocMeta, DEFAULT_BOOK_CSS, buildEpub } from './epub'

// ── pure helpers ────────────────────────────────────────────────────────────

test('escapeXml escapes the five XML entities', () => {
  expect(escapeXml(`a<b>&"'`)).toBe('a&lt;b&gt;&amp;&quot;&#39;')
})

test('toXhtml self-closes void elements (and leaves already-closed ones)', () => {
  expect(toXhtml('<img src="x.png"><br><hr>')).toBe(
    '<img src="x.png"/><br/><hr/>'
  )
  expect(toXhtml('<img src="x"/>')).toBe('<img src="x"/>')
})

test('toXhtml escapes stray ampersands but keeps real entities', () => {
  expect(toXhtml('Tom & Jerry &amp; &#160; &nbsp;')).toBe(
    'Tom &amp; Jerry &amp; &#160; &nbsp;'
  )
})

test('stripDocMeta removes <!--{ … }--> directives', () => {
  expect(stripDocMeta('# Title\n\n<!--{ "pin": "top" }-->\n\nbody')).toBe(
    '# Title\n\nbody'
  )
})

test('default book stylesheet force-wraps code listings', () => {
  expect(DEFAULT_BOOK_CSS).toContain('white-space: pre-wrap')
})

// ── end-to-end: build a tiny ePub and verify the critical zip invariant ──────

test('buildEpub emits a mimetype-first, STORED zip with well-formed chapters', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'epub-test-'))
  try {
    const corpus = path.join(dir, 'docs.json')
    fs.writeFileSync(
      corpus,
      JSON.stringify([
        { filename: 'README.md', title: 'Home', text: '# Home\n\nHello & welcome.', path: 'README.md' },
        { filename: 'a.ts', title: 'A', text: '# A\n\n```js\nconst x = 1\n```', path: 'a.ts' },
        { filename: 'b.ts', title: 'B', text: '# B\n\n```js#cool\nconst y = 2\n```', path: 'b.ts' },
      ])
    )
    const out = path.join(dir, 'book.epub')
    await buildEpub(
      {
        name: 'Test Book',
        outputDir: dir,
        docsJson: corpus,
        baseUrl: 'https://example.test',
      } as any,
      { output: out, author: 'Tester' }
    )

    const buf = fs.readFileSync(out)
    // Local file header of the FIRST entry: PK\x03\x04, method=STORED(0), name="mimetype".
    expect([...buf.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04])
    expect(buf.readUInt16LE(8)).toBe(0) // compression method 0 = STORED
    const nameLen = buf.readUInt16LE(26)
    expect(buf.subarray(30, 30 + nameLen).toString()).toBe('mimetype')

    // Unzip and confirm structure + chapter well-formedness.
    Bun.spawnSync(['unzip', '-o', '-q', out, '-d', dir])
    for (const f of ['META-INF/container.xml', 'OEBPS/package.opf', 'OEBPS/nav.xhtml', 'OEBPS/index.xhtml', 'OEBPS/a.xhtml']) {
      expect(fs.existsSync(path.join(dir, f))).toBe(true)
    }
    // chapters parse as XML (the build-time DOMParser would reject malformed XHTML)
    const home = fs.readFileSync(path.join(dir, 'OEBPS/index.xhtml'), 'utf8')
    expect(home).toContain('Hello &amp; welcome.') // ampersand escaped
    expect(home).toContain('<?xml')

    // a cover was generated (no cover image provided) and registered as cover-image
    expect(fs.existsSync(path.join(dir, 'OEBPS/cover.png'))).toBe(true)
    const opf = fs.readFileSync(path.join(dir, 'OEBPS/package.opf'), 'utf8')
    expect(opf).toContain('properties="cover-image"')
    expect(opf).toMatch(/<itemref idref="cover-page"\/>\s*<itemref/) // cover first in spine

    // a readable Contents page sits in the spine right after the cover
    expect(fs.existsSync(path.join(dir, 'OEBPS/contents.xhtml'))).toBe(true)
    expect(opf).toMatch(
      /<itemref idref="cover-page"\/>\s*<itemref idref="toc-page"\/>/
    )
    const contents = fs.readFileSync(path.join(dir, 'OEBPS/contents.xhtml'), 'utf8')
    expect(contents).toContain('<ol class="toc">')
    expect(contents).toContain('>Home</a>') // links to a chapter

    // each example links back to its anchor on the live site
    const chA = fs.readFileSync(path.join(dir, 'OEBPS/a.xhtml'), 'utf8')
    expect(chA).toContain('class="example-live-link"')
    expect(chA).toContain('href="https://example.test/a/#example-1"') // auto id
    const chB = fs.readFileSync(path.join(dir, 'OEBPS/b.xhtml'), 'utf8')
    expect(chB).toContain('href="https://example.test/b/#cool"') // ```js#cool override
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
