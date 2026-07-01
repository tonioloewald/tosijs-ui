import { test, expect } from 'bun:test'
import { renderDocMarkdown } from './render'

test('a ```lang#id fence stamps data-example-id and keeps the language clean', () => {
  const html = renderDocMarkdown('```js#my-demo\nconst x = 1\n```')
  expect(html).toContain('data-example-id="my-demo"')
  expect(html).toContain('class="language-js"')
  expect(html).not.toContain('language-js#') // id stripped from the class
})

test('a plain fence renders unchanged (no data-example-id)', () => {
  const html = renderDocMarkdown('```js\nconst y = 2\n```')
  expect(html).toContain('class="language-js"')
  expect(html).not.toContain('data-example-id')
})

test('a bare trailing # (no id) falls back to default rendering', () => {
  const html = renderDocMarkdown('```js#\nconst z = 3\n```')
  expect(html).not.toContain('data-example-id')
})

test('wikilinks: [[slug]] and [[slug|label]] resolve to /slug/', () => {
  const html = renderDocMarkdown('See [[the-coast]] and [[note-42|the map]].')
  expect(html).toContain('<a href="/the-coast/" class="wikilink">the-coast</a>')
  expect(html).toContain('<a href="/note-42/" class="wikilink">the map</a>')
})

test('wikilinks are NOT resolved inside code spans', () => {
  const html = renderDocMarkdown('Literal `[[in code]]` stays.')
  expect(html).toContain('<code>[[in code]]</code>')
  expect(html).not.toContain('wikilink')
})

test('footnotes: refs number by appearance and render as endnotes', () => {
  const html = renderDocMarkdown(
    'A note[^1] and another[^b].\n\n[^1]: First with *emphasis*.\n[^b]: Second.'
  )
  // ref superscripts, numbered 1,2 by first appearance
  expect(html).toContain('<sup class="footnote-ref"><a href="#fn-1" id="fnref-1">1</a></sup>')
  expect(html).toContain('<sup class="footnote-ref"><a href="#fn-b" id="fnref-b">2</a></sup>')
  // endnotes section with rendered definition markdown + backref
  expect(html).toContain('<section class="footnotes"')
  expect(html).toContain('<li id="fn-1"><p>First with <em>emphasis</em>.')
  expect(html).toContain('href="#fnref-1"')
})

test('a doc using neither footnotes nor wikilinks is unaffected', () => {
  const html = renderDocMarkdown('# T\n\nJust `code` and a [link](/x/).')
  expect(html).not.toContain('footnotes')
  expect(html).not.toContain('wikilink')
})
