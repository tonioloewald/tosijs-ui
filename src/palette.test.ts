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
  // aliases name real modifiers
  expect(matchesShortcut(key('k', { metaKey: true }), 'cmd+k')).toBe(true)
  expect(matchesShortcut(key('k', { altKey: true }), 'option+k')).toBe(true)
})

test('an unknown modifier never binds the bare key, and says so once', () => {
  const warn = console.warn
  const warnings: string[] = []
  console.warn = (message: string) => warnings.push(message)
  try {
    const plain = { key: 'k' } as KeyboardEvent
    expect(matchesShortcut(plain, 'hyper+k')).toBe(false)
    expect(matchesShortcut(plain, 'hyper+k')).toBe(false)
    expect(warnings.length).toBe(1)
    expect(warnings[0]).toContain('hyper')
  } finally {
    console.warn = warn
  }
})

test('a keydown with no key matches nothing and does not throw', () => {
  expect(matchesShortcut({} as KeyboardEvent, 'mod+k')).toBe(false)
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

test('the clear button shows only when there is something to clear', () => {
  const palette = tosiPalette({ sources: [() => []] })
  document.body.append(palette)
  palette.open()
  const clear = palette.querySelector<HTMLElement>('.palette-clear')!
  expect(clear.hidden).toBe(true)
  palette.search('x')
  expect(clear.hidden).toBe(false)
  palette.search('')
  expect(clear.hidden).toBe(true)
  palette.close()
  palette.remove()
})

test('an unknown trigger falls back to the field, and says so once', () => {
  const warn = console.warn
  const warnings: string[] = []
  console.warn = (message: string) => warnings.push(message)
  try {
    const palette = tosiPalette({ trigger: 'button' })
    document.body.append(palette)
    palette.render()
    palette.render()
    expect(palette.classList.contains('-no-trigger')).toBe(false)
    expect(warnings.length).toBe(1)
    expect(warnings[0]).toContain('"button"')
    expect(warnings[0]).toContain('"field"')
    palette.remove()
  } finally {
    console.warn = warn
  }
})

test('setting value from code updates the field, closed or open', () => {
  const palette = tosiPalette({
    sources: [(q: string) => [{ title: `hit ${q}` }]],
  })
  document.body.append(palette)
  palette.open()
  palette.close()
  const field = palette.querySelector<HTMLInputElement>('.palette-input')!
  // closed: the field holds it, and open() searches for it
  palette.value = 'apple'
  expect(field.value).toBe('apple')
  palette.open()
  expect(palette.results.map((r) => r.title)).toEqual(['hit apple'])
  // open: the field and the results follow
  palette.value = 'pear'
  expect(field.value).toBe('pear')
  expect(palette.results.map((r) => r.title)).toEqual(['hit pear'])
  expect(palette.value).toBe('pear')
  palette.close()
  palette.remove()
})

test('a value given to the creator is the query the field opens with', () => {
  const palette = tosiPalette({ value: 'fig', sources: [() => []] })
  document.body.append(palette)
  palette.open()
  expect(palette.querySelector<HTMLInputElement>('.palette-input')!.value).toBe(
    'fig'
  )
  palette.close()
  palette.remove()
})

/*
The doc header's hint ("Search", now a site option) is localized like the rest of the doc
system's text, through a `localizer` the palette is handed: it does not import the
localization module itself, which would bring `<tosi-select>` and a body-wide observer with
it. A queued render after a locale change shows the new language.
*/
test('a palette with a localizer shows its hint localized, and re-renders to follow it', async () => {
  let locale = 'fr'
  const strings: Record<string, string> = { Search: 'Rechercher' }
  const localizer = (text: string) =>
    locale === 'fr' ? strings[text] ?? text : text
  const palette = tosiPalette({ placeholder: 'Search', localizer })
  const plain = tosiPalette({ placeholder: 'Search' })
  document.body.append(palette, plain)
  const label = (p: HTMLElement) =>
    p.querySelector('.palette-trigger-label')?.textContent
  const nextFrame = () =>
    new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
  try {
    palette.queueRender()
    await nextFrame()
    expect(label(palette)).toBe('Rechercher')
    expect(label(plain)).toBe('Search')
    locale = 'en'
    palette.queueRender()
    await nextFrame()
    expect(label(palette)).toBe('Search')
  } finally {
    palette.remove()
    plain.remove()
  }
})
