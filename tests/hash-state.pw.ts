import { test, expect } from '@playwright/test'

/*
`hashState`'s whole subject is the URL, so it is tested against a real one.

happy-dom's `history.replaceState()` leaves `window.location.hash` untouched, so the unit lane
can only cover memory mode — testing the URL half there would test a shim. These run on the
component's own doc page, which loads the iife and therefore exposes `xinjsui`.
*/

const setup = async (page: any) => {
  await page.goto('/hash-state/')
  await page.waitForFunction(() => (window as any).xinjsui?.hashState)
  // Start from a known hash; the doc-browser routes on the path, not the hash.
  await page.evaluate(() =>
    window.history.replaceState({}, '', window.location.pathname)
  )
}

test('values round-trip through the URL, namespaced', async ({ page }) => {
  await setup(page)
  const result = await page.evaluate(() => {
    const { hashState } = (window as any).xinjsui
    const filters = hashState({ namespace: 'a' })
    filters.set('q', 'widget')
    return {
      hash: window.location.hash,
      values: filters.values,
      // Read on the very next line: `replaceState` is synchronous where assigning
      // `location.hash` would fire `hashchange` a tick later and hand back the old values.
      immediate: filters.get('q'),
    }
  })
  expect(result.hash).toBe('#?a.q=widget')
  // The namespace is a detail of the URL, never of the API.
  expect(result.values).toEqual({ q: 'widget' })
  expect(result.immediate).toBe('widget')
})

test('two instances share one URL without deleting each other', async ({
  page,
}) => {
  await setup(page)
  const result = await page.evaluate(() => {
    const { hashState } = (window as any).xinjsui
    const outer = hashState({ namespace: 'outer' })
    const inner = hashState({ namespace: 'inner' })
    outer.set('q', 'one')
    inner.set('q', 'two')
    const both = { outer: outer.values, inner: inner.values }
    inner.set('q', undefined)
    return { ...both, afterInnerCleared: outer.get('q') }
  })
  expect(result.outer).toEqual({ q: 'one' })
  expect(result.inner).toEqual({ q: 'two' })
  // The reason namespacing exists: the doc-browser needed a whole 'memory' routing mode
  // because a nested instance hijacked its host page's URL.
  expect(result.afterInnerCleared).toBe('one')
})

test('a foreign key and the router path both survive a write', async ({
  page,
}) => {
  await setup(page)
  const hash = await page.evaluate(() => {
    const { hashState } = (window as any).xinjsui
    window.history.replaceState(
      {},
      '',
      window.location.pathname + '#/invoices/42?theirs=keep'
    )
    hashState({ namespace: 'f' }).set('sort', 'date')
    return window.location.hash
  })
  // Path before the `?` belongs to a hash router; keys it did not write are not its to delete.
  expect(hash).toBe('#/invoices/42?theirs=keep&f.sort=date')
})

test('clearing the last key leaves no dangling ?', async ({ page }) => {
  await setup(page)
  const hash = await page.evaluate(() => {
    const { hashState } = (window as any).xinjsui
    window.history.replaceState({}, '', window.location.pathname + '#/list')
    const filters = hashState({ namespace: 'f' })
    filters.set('q', 'x')
    filters.set('q', undefined)
    return window.location.hash
  })
  expect(hash).toBe('#/list')
})

test('set replaces history, push adds an entry, and back works', async ({
  page,
}) => {
  await setup(page)
  const before = await page.evaluate(() => window.history.length)
  await page.evaluate(() => {
    const { hashState } = (window as any).xinjsui
    const filters = hashState({ namespace: 'h' })
    ;(window as any).__filters = filters
    filters.set('q', 'a')
    filters.set('q', 'b')
    filters.set('q', 'c')
  })
  // Typing must not fill the back stack — thirty presses to undo one word.
  expect(await page.evaluate(() => window.history.length)).toBe(before)

  await page.evaluate(() =>
    (window as any).__filters.set('editing', '7', { push: true })
  )
  expect(await page.evaluate(() => window.history.length)).toBe(before + 1)

  await page.goBack()
  // Back is a real navigation, so the state follows the URL and listeners hear about it.
  expect(
    await page.evaluate(() => (window as any).__filters.get('editing'))
  ).toBeUndefined()
  expect(await page.evaluate(() => (window as any).__filters.get('q'))).toBe(
    'c'
  )
})

test('the back button notifies observers', async ({ page }) => {
  await setup(page)
  await page.evaluate(() => {
    const { hashState } = (window as any).xinjsui
    const filters = hashState({ namespace: 'b' })
    const seen: any[] = []
    ;(window as any).__seen = seen
    filters.observe((values: any) => seen.push(values))
    filters.set('page', '1', { push: true })
    filters.set('page', '2', { push: true })
  })
  await page.goBack()
  await page.waitForFunction(() => (window as any).__seen.length >= 3)
  const seen = await page.evaluate(() => (window as any).__seen)
  expect(seen[seen.length - 1]).toEqual({ page: '1' })
})

test('values are URL-encoded both ways', async ({ page }) => {
  await setup(page)
  const value = await page.evaluate(() => {
    const { hashState } = (window as any).xinjsui
    const filters = hashState({ namespace: 'e' })
    filters.set('q', 'a b&c=d#e')
    return filters.get('q')
  })
  expect(value).toBe('a b&c=d#e')
})
