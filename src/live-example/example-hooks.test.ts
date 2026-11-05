import { afterEach, expect, test } from 'bun:test'
import { sanitizeExampleHtml, setExampleHooks } from './example-hooks.js'

afterEach(() => setExampleHooks({}))

const host = document.createElement('div')

// What the preview would hold: a hook's result is a fragment, inserted as it is.
const markup = (result: string | DocumentFragment): string => {
  if (typeof result === 'string') return result
  const holder = document.createElement('div')
  holder.append(result)
  return holder.innerHTML
}

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
  expect(
    markup(sanitizeExampleHtml('<b onclick="x()">hi</b><i>there</i>', host))
  ).toBe('<b>hi</b><i>there</i>')
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
  expect(markup(sanitizeExampleHtml('<script>alert(1)</script>', host))).toBe(
    '<hr>'
  )
  expect(seen).toBe(host)
})

test("the hook's fragment is returned as nodes, never re-serialized (mXSS, 1.17.0 review)", () => {
  let seen: DocumentFragment | undefined
  setExampleHooks({
    sanitize: (fragment) => {
      seen = fragment
    },
  })
  expect(sanitizeExampleHtml('<b>hi</b>', host)).toBe(seen!)
})
