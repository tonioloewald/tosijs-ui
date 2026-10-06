import { test, expect, spyOn } from 'bun:test'
import {
  liveFenceLanguages,
  misconfigured,
  SiteMisconfiguredError,
} from './build-warnings.js'

const doc = (text: string) => [{ text }]

test('liveFenceLanguages finds the languages that will actually run', () => {
  const langs = liveFenceLanguages(
    doc('# x\n\n```tjs\nlet a = 1\n```\n\ntext\n\n```css\n.a{}\n```\n')
  )
  expect([...langs].sort()).toEqual(['css', 'tjs'])
})

test('a :static fence and a display-only language are not live', () => {
  const langs = liveFenceLanguages(
    doc('```tjs:static\nx\n```\n\n```typescript\ny\n```\n\n```js\nz\n```\n')
  )
  expect([...langs]).toEqual(['js'])
})

test('under opt-in a fence must ask; a bare one does not count', () => {
  const text = '```ts\na\n```\n\n```tjs:inline\nb\n```\n'
  expect([...liveFenceLanguages(doc(text), 'opt-in')]).toEqual(['tjs'])
  expect([...liveFenceLanguages(doc(text), 'none')]).toEqual([])
})

test('fenced code is not read as fences: a ``` line inside a block closes it', () => {
  // The body of a `js` block that mentions "tjs" must not register tjs.
  const langs = liveFenceLanguages(doc('```js\nconst s = "tjs"\n```\n'))
  expect([...langs]).toEqual(['js'])
})

test('misconfigured warns by default and throws under strict', () => {
  const warn = spyOn(console, 'warn').mockImplementation(() => {})
  try {
    misconfigured(undefined, 'something is off')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(() => misconfigured(true, 'something is off')).toThrow(
      SiteMisconfiguredError
    )
    expect(() => misconfigured(true, 'something is off')).toThrow(/strict/)
    // Under strict it does not ALSO warn: one report, in the error.
    expect(warn).toHaveBeenCalledTimes(1)
  } finally {
    warn.mockRestore()
  }
})
