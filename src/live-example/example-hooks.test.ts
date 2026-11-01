import { afterEach, expect, test } from 'bun:test'
import { sanitizeExampleHtml, setExampleHooks } from './example-hooks.js'

afterEach(() => setExampleHooks({}))

const host = document.createElement('div')

test('no sanitize hook: the markup is untouched', () => {
  expect(sanitizeExampleHtml('<b onclick="x()">hi</b>', host)).toBe(
    '<b onclick="x()">hi</b>'
  )
})

test('the hook cleans the parsed markup in place', () => {
  setExampleHooks({
    sanitize: (fragment) => {
      for (const el of fragment.querySelectorAll('[onclick]'))
        el.removeAttribute('onclick')
    },
  })
  expect(sanitizeExampleHtml('<b onclick="x()">hi</b><i>there</i>', host)).toBe(
    '<b>hi</b><i>there</i>'
  )
})

test('or returns a fragment to use instead, and is told which example', () => {
  let seen: HTMLElement | undefined
  setExampleHooks({
    sanitize: (_fragment, example) => {
      seen = example
      const replacement = document.createDocumentFragment()
      replacement.append(document.createElement('hr'))
      return replacement
    },
  })
  expect(sanitizeExampleHtml('<script>alert(1)</script>', host)).toBe('<hr>')
  expect(seen).toBe(host)
})
