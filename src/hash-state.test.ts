import { test, expect } from 'bun:test'
import { hashState } from './hash-state'

/*
These cover MEMORY mode only.

happy-dom's `history.replaceState()` does not update `window.location.hash` (verified: `href`
stays `about:blank` after a replaceState that names a hash), so the URL half of this module
cannot be exercised here without testing a shim instead of the real thing. It is covered in a
real browser by `tests/hash-state.pw.ts` — URL semantics is exactly the thing that deserves a
real URL.
*/

test('memory mode round-trips values and never touches the URL', () => {
  const embedded = hashState({ namespace: 'inner', mode: 'memory' })
  embedded.set('q', 'widget')
  expect(embedded.get('q')).toBe('widget')
  expect(embedded.values).toEqual({ q: 'widget' })
  expect(window.location.hash).toBe('')
})

test('setting undefined removes a key', () => {
  const state = hashState({ mode: 'memory' })
  state.set('q', 'x')
  state.set('q', undefined)
  expect(state.get('q')).toBeUndefined()
  expect(state.values).toEqual({})
})

test('update is one notification for the whole patch', () => {
  // A listener that re-queries a server must not do it four times because four filters moved.
  const state = hashState({ mode: 'memory' })
  let calls = 0
  state.observe(() => calls++)
  state.update({ q: 'x', sort: 'date', page: '2' })
  expect(calls).toBe(1)
  expect(state.values).toEqual({ q: 'x', sort: 'date', page: '2' })
})

test('observe reports the new values and can be unsubscribed', () => {
  const state = hashState({ mode: 'memory' })
  const seen: Array<Record<string, string>> = []
  const stop = state.observe((values) => seen.push(values))
  state.set('q', 'x')
  stop()
  state.set('q', 'y')
  expect(seen).toEqual([{ q: 'x' }])
})

test('values is a snapshot, not a live handle on the state', () => {
  const state = hashState({ mode: 'memory' })
  state.set('q', 'x')
  const snapshot = state.values
  state.set('q', 'y')
  expect(snapshot).toEqual({ q: 'x' })
})

test('two memory instances are independent', () => {
  const a = hashState({ namespace: 'a', mode: 'memory' })
  const b = hashState({ namespace: 'b', mode: 'memory' })
  a.set('q', 'one')
  b.set('q', 'two')
  expect(a.get('q')).toBe('one')
  expect(b.get('q')).toBe('two')
})

test('stop keeps the values', () => {
  // A component being torn down (or moved into an embedded context) should not silently
  // forget its state as well.
  const state = hashState({ mode: 'memory' })
  state.set('q', 'kept')
  state.stop()
  expect(state.get('q')).toBe('kept')
})
