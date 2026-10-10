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
