import { test, expect } from 'bun:test'
import { buildBookHtml } from './book-html'

const docs = [{ filename: 'README.md', title: 'Home', text: '# Home\n\nHi.' }]

test('Print opens with the cover when the build made one', () => {
  const html = buildBookHtml(docs as any, {
    title: 'My "Book"',
    cover: '/my-book-cover.png',
  })
  const cover = html.indexOf('<img class="book-cover" src="/my-book-cover.png"')
  expect(cover).toBeGreaterThan(-1)
  // First thing in the body, ahead of the title page and the contents.
  expect(cover).toBeLessThan(html.indexOf('class="book-title"'))
  // A cover that fails to load must not leave a blank first page.
  expect(html).toContain('onerror="this.remove()"')
  expect(html).toContain('alt="My &quot;Book&quot; cover"')
})

test('no cover configured means no cover element', () => {
  expect(buildBookHtml(docs as any, { title: 'B' })).not.toContain(
    '<img class="book-cover"'
  )
})
