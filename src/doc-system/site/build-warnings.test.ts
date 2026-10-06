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

/*
The 1.16.7 review's blocker, one test per direction. The bundle guard decided "this corpus has
live examples" with a four-language regex that ignored the site's policy, so a `strict` build
could pass with every example inert, or fail on a site with none.
*/
test('REGRESSION: a fence with a mode or an id is live (the regex missed these)', () => {
  for (const info of ['js:iframe', 'js#my-id', 'html', 'css', 'ts:inline']) {
    expect(liveFenceLanguages(doc('```' + info + '\nx\n```\n')).size).toBe(1)
  }
})

test('REGRESSION: a bare js fence on an opt-in or none site is NOT live', () => {
  const text = '```js\nconst a = 1\n```\n'
  expect(liveFenceLanguages(doc(text), 'opt-in').size).toBe(0)
  expect(liveFenceLanguages(doc(text), 'none').size).toBe(0)
  expect(liveFenceLanguages(doc(text), 'auto').size).toBe(1)
})

test('tilde fences and longer backtick fences count, as they do when rendered', () => {
  expect([...liveFenceLanguages(doc('~~~tjs\nx\n~~~\n'))]).toEqual(['tjs'])
  expect([...liveFenceLanguages(doc('````tjs\nx\n````\n'))]).toEqual(['tjs'])
})

test('a fence SHOWN inside a longer block is text, and does not hide the next real one', () => {
  // A four-backtick static block documenting a tjs fence, then a real ts example.
  const text =
    '````md:static\n```tjs\nshown, not run\n```\n````\n\n```ts\nconst real = 1\n```\n'
  expect([...liveFenceLanguages(doc(text))]).toEqual(['ts'])
})

test('a block closes only on a bare fence of its own character', () => {
  // `~~~` inside a backtick block does not close it; the js after it is still inside.
  const text = '```md:static\n~~~\n```\n\n~~~js\nlive\n~~~\n'
  expect([...liveFenceLanguages(doc(text))]).toEqual(['js'])
})
