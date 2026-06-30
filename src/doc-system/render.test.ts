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
