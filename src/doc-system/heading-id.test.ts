import { test, expect } from 'bun:test'
import { marked } from 'marked'
import { HeadingIds, headingSlug, slugOfHeadingText } from './heading-id'
import { renderDocMarkdown } from './render'
import { deadInPageAnchors } from './site/build-warnings'

test('a heading slug is the GitHub one: punctuation dropped, spaces to hyphens', () => {
  expect(slugOfHeadingText('The 1987 Errata')).toBe('the-1987-errata')
  expect(slugOfHeadingText("What's new?")).toBe('whats-new')
  expect(slugOfHeadingText('Foo & Bar')).toBe('foo--bar')
  expect(slugOfHeadingText('snake_case-and-kebab')).toBe('snake_case-and-kebab')
  // Letters are letters in every script; an ASCII-only slug left these headings with no id.
  expect(slugOfHeadingText('Käyttö ja 日本語')).toBe('käyttö-ja-日本語')
  expect(slugOfHeadingText('???')).toBe('')
  // An entity is the character it stands for, never its name: GitHub gives no "amp" or "copy".
  expect(slugOfHeadingText('Fish &amp; Chips &copy; &#169;')).toBe(
    'fish--chips'
  )
})

test('the slug is of the text a reader sees, not the markdown', () => {
  const [token] = marked.lexer(
    '## The `tosi()` *proxy* [docs](https://x.test) <b>x</b>'
  )
  expect(headingSlug(token)).toBe('the-tosi-proxy-docs-x')
})

test('a repeated heading gets -1, -2, and a suffixed id never collides with a literal one', () => {
  const ids = new HeadingIds()
  expect(
    ['usage', 'usage', 'usage-1', 'usage', ''].map((s) => ids.next(s))
  ).toEqual(['usage', 'usage-1', 'usage-1-1', 'usage-2', ''])
})

test('repeats always get an id, whatever the slug: the suffix loop ends', () => {
  // A reservation of `example-N` once made the second "Example" loop forever: every
  // suffix of `example` is `example-N`. Nothing is reserved now; this pins that it ends.
  for (const slug of ['example', 'usage', 'example-1', 'a-1-1']) {
    const ids = new HeadingIds()
    const out = Array.from({ length: 50 }, () => ids.next(slug))
    expect(new Set(out).size).toBe(50)
    expect(out[0]).toBe(slug)
  }
  const ids = new HeadingIds()
  expect(
    ['example', 'example-1', 'example', 'example'].map((s) => ids.next(s))
  ).toEqual(['example', 'example-1', 'example-2', 'example-3'])
  const html = renderDocMarkdown(
    '## Example\n\na\n\n## Example\n\nb\n\n## Example 2\n'
  )
  expect(html).toContain('<h2 id="example">')
  expect(html).toContain('<h2 id="example-1">')
  expect(html).toContain('<h2 id="example-2">')
}, 2000)

test('rendered headings carry ids, fresh for every page', () => {
  const page = '# Title\n\n## Usage\n\n### Usage\n\n## ???\n'
  const html = renderDocMarkdown(page)
  expect(html).toContain('<h1 id="title">Title</h1>')
  expect(html).toContain('<h2 id="usage">Usage</h2>')
  expect(html).toContain('<h3 id="usage-1">Usage</h3>')
  // No slug, no id — never an empty one.
  expect(html).toContain('<h2>???</h2>')
  // The counter is per page: a second render starts again.
  expect(renderDocMarkdown(page)).toBe(html)
})

test('an in-page link that matches no id is reported; one that matches is not', () => {
  const html = renderDocMarkdown(
    [
      '## The 1987 errata',
      '[ok](#the-1987-errata) [dead](#the-1986-errata) [dead again](#the-1986-errata)',
      '[router](#/settings) [top](#top) [bare](#) [example](#example-2) [note][^n]',
      '<a name="legacy"></a> [named](#legacy) [unicode](#k%C3%A4ytt%C3%B6)',
      '## Käyttö',
      '```js#my-demo\nconst x = 1\n```',
      '[fence](#my-demo)',
      '`<a href="#in-code">` is code, not a link',
      '[^n]: a footnote',
    ].join('\n\n')
  )
  expect(deadInPageAnchors(html)).toEqual(['the-1986-errata'])
})

test('raw HTML is read with its attributes in any order and any quoting', () => {
  const html = [
    // a second id-like attribute, single quotes, no quotes, and a `>` inside a value
    '<input name="field" id="bar">',
    "<div id='single'></div>",
    '<div id=bare></div>',
    '<span title="a > b" id="after-gt"></span>',
    '<a name="named"></a>',
    '<a href="#bar">1</a> <a href="#single">2</a> <a href="#bare">3</a>',
    '<a href="#after-gt">4</a> <a href="#named">5</a>',
    // a form field's name is not an anchor, and unquoted or single-quoted links are links
    "<a href='#field'>6</a> <a href=#nowhere>7</a>",
  ].join('\n')
  expect(deadInPageAnchors(html).sort()).toEqual(['field', 'nowhere'])
})
