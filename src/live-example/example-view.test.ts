import { afterEach, expect, test } from 'bun:test'
import { liveExample } from './component.js'
import { setExampleView } from './insert-examples.js'

/*
#252: the view an example opens in comes from the nearest setting: its fence's `view`, then a
container's `data-example-view` (the doc browser stamps a page's `exampleView` there), then the
site's `__TOSI_EXAMPLE_VIEW`. `preview` at any level opts out of the one above it.
*/
afterEach(() => {
  setExampleView(undefined)
  document.body.textContent = ''
})

function mount(options: Record<string, unknown> = {}, pageView?: string) {
  const page = document.createElement('div')
  if (pageView) page.setAttribute('data-example-view', pageView)
  const example: any = liveExample()
  example.options = options
  page.append(example)
  document.body.append(page)
  return example
}

test('with nothing set, an example opens as its preview', () => {
  expect(mount().initialView).toBe('preview')
})

test('the site default applies to every example', () => {
  setExampleView('code')
  expect(mount().initialView).toBe('code')
})

test("a page's view beats the site's, and a fence's beats the page's", () => {
  setExampleView('code')
  expect(mount({}, 'console').initialView).toBe('console')
  expect(mount({ view: 'code' }, 'console').initialView).toBe('code')
})

test('preview opts out of a default above it', () => {
  setExampleView('code')
  expect(mount({}, 'preview').initialView).toBe('preview')
  expect(mount({ view: 'preview' }, 'code').initialView).toBe('preview')
})

test('a value that is not a view is skipped, so the next level decides', () => {
  setExampleView('console')
  expect(mount({ view: 'inline' }, 'nonsense').initialView).toBe('console')
})
