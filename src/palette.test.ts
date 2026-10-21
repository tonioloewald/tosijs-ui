import { test, expect } from 'bun:test'
import {
  tosiPalette,
  rankResults,
  highlight,
  matchesShortcut,
  describeShortcut,
} from './palette.js'

test('results group by group, groups in the order of their best result, best first', () => {
  const ranked = rankResults([
    { title: 'a', group: 'X', score: 1 },
    { title: 'b', group: 'Y', score: 5 },
    { title: 'c', group: 'X', score: 3 },
    { title: 'd', group: 'Y', score: 2 },
  ])
  expect(ranked.map((r) => r.title)).toEqual(['b', 'd', 'c', 'a'])
})

test('unscored results keep their order', () => {
  expect(
    rankResults([{ title: 'x' }, { title: 'y' }, { title: 'z' }]).map(
      (r) => r.title
    )
  ).toEqual(['x', 'y', 'z'])
})

test('highlight marks every query word, case-insensitively, without parsing HTML', () => {
  const nodes = highlight('Select <b>and</b> SELECTION', 'sel')
  const marked = nodes.filter((n) => (n as Element).tagName === 'MARK')
  expect(marked.map((n) => n.textContent)).toEqual(['Sel', 'SEL'])
  expect(nodes.map((n) => n.textContent).join('')).toBe(
    'Select <b>and</b> SELECTION'
  )
})

test('shortcuts match the key and exactly its modifiers', () => {
  const key = (k: string, mods: Partial<KeyboardEvent> = {}) =>
    ({
      key: k,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      ...mods,
    } as KeyboardEvent)
  expect(matchesShortcut(key('k', { ctrlKey: true }), 'ctrl+k')).toBe(true)
  expect(
    matchesShortcut(key('k', { ctrlKey: true, shiftKey: true }), 'ctrl+k')
  ).toBe(false)
  expect(matchesShortcut(key('j', { ctrlKey: true }), 'ctrl+k')).toBe(false)
  expect(matchesShortcut(key('/'), '/')).toBe(true)
  expect(describeShortcut('shift+p')).toMatch(/P$/)
})

test('a sync source lists at once; quick links before typing; choosing fires action and closes', async () => {
  const chosen: unknown[] = []
  const palette = tosiPalette({
    quickLinks: [{ title: 'Home' }],
    sources: [
      (q: string) =>
        ['Apple', 'Banana']
          .filter((f) => f.toLowerCase().includes(q))
          .map((title) => ({ title })),
    ],
  })
  document.body.append(palette)
  palette.addEventListener('action', (e) =>
    chosen.push((e as CustomEvent).detail.title)
  )
  palette.open()
  expect(palette.results.map((r) => r.title)).toEqual(['Home'])
  palette.search('an')
  expect(palette.results.map((r) => r.title)).toEqual(['Banana'])
  palette.choose(palette.results[0])
  expect(chosen).toEqual(['Banana'])
  expect(palette.querySelector('dialog')!.open).toBe(false)
  palette.remove()
})

test('an async source is waited for, and a stale one never overwrites a newer search', async () => {
  let release: (v: { title: string }[]) => void = () => {}
  const palette = tosiPalette({
    sources: [
      (q: string) =>
        q === 'slow'
          ? new Promise<{ title: string }[]>((r) => (release = r))
          : [{ title: `fast ${q}` }],
    ],
  })
  document.body.append(palette)
  palette.open()
  palette.search('slow')
  expect(palette.querySelector<HTMLElement>('.palette-spinner')!.hidden).toBe(
    false
  )
  palette.search('quick')
  release([{ title: 'too late' }])
  await new Promise((r) => setTimeout(r, 0))
  expect(palette.results.map((r) => r.title)).toEqual(['fast quick'])
  palette.close()
  palette.remove()
})

test('a source that never answers is abandoned after the timeout, and says so', async () => {
  const palette = tosiPalette({
    timeout: 20,
    sources: [() => new Promise(() => {})],
  })
  document.body.append(palette)
  palette.open()
  palette.search('x')
  await new Promise((r) => setTimeout(r, 60))
  expect(palette.querySelector('.palette-status')!.textContent).toContain(
    'too long'
  )
  expect(palette.querySelector<HTMLElement>('.palette-spinner')!.hidden).toBe(
    true
  )
  palette.close()
  palette.remove()
})

test('a result whose action returns false keeps the palette open', () => {
  const palette = tosiPalette({
    sources: [() => [{ title: 'Stay', action: () => false }]],
  })
  document.body.append(palette)
  palette.open()
  palette.search('s')
  palette.choose(palette.results[0])
  expect(palette.querySelector('dialog')!.open).toBe(true)
  palette.close()
  palette.remove()
})

test('trigger="icon" and "none" set the classes that hide the label or the whole trigger; open() works without one', () => {
  const palette = tosiPalette({
    trigger: 'icon',
    sources: [() => [{ title: 'x' }]],
  })
  document.body.append(palette)
  palette.render()
  expect(palette.classList.contains('-icon')).toBe(true)
  palette.trigger = 'none'
  palette.render()
  expect(palette.classList.contains('-no-trigger')).toBe(true)
  expect(palette.classList.contains('-icon')).toBe(false)
  palette.open()
  expect(palette.querySelector('dialog')!.open).toBe(true)
  palette.close()
  palette.remove()
})
