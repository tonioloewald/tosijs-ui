import { test, expect } from 'bun:test'
import { epubMenuItem } from './doc-system'

const legacy = '/my-project.epub'

/*
#218: the menu offered "Download ePub" on every site and derived the URL from the project
name, so a site that built no ePub shipped a link that 404s.
*/
test('a site that builds no ePub offers no download', () => {
  expect(epubMenuItem([], legacy)).toBe(null)
})

test('one volume is one item; several are a submenu, one entry per volume', () => {
  const one = epubMenuItem([{ title: 'B', url: '/docs/b.epub' }], legacy)!
  expect(one.caption).toBe('Download ePub')
  expect(typeof one.action).toBe('function')
  expect(one.menuItems).toBeUndefined()

  const many = epubMenuItem(
    [
      { title: 'B', url: '/b.epub' },
      { title: 'B — appendices', url: '/b-appendices.epub' },
    ],
    legacy
  )!
  expect(many.action).toBeUndefined()
  expect((many.menuItems as any[]).map((item) => item.caption)).toEqual([
    'B',
    'B — appendices',
  ])
})

test('the download goes to the URL the build gave, not the derived one', () => {
  const clicked: string[] = []
  const real = HTMLAnchorElement.prototype.click
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    clicked.push(this.getAttribute('href') ?? '')
  }
  try {
    ;(
      epubMenuItem([{ title: 'B', url: '/docs/b.epub' }], legacy)!.action as any
    )()
    // A config with no list at all (hand-written, older) keeps the old derived link.
    ;(epubMenuItem(undefined, legacy)!.action as any)()
    const many = epubMenuItem(
      [
        { title: 'B', url: '/b.epub' },
        { title: 'Two', url: '/b-two.epub' },
      ],
      legacy
    )!
    ;(many.menuItems as any[])[1].action()
  } finally {
    HTMLAnchorElement.prototype.click = real
  }
  expect(clicked).toEqual(['/docs/b.epub', legacy, '/b-two.epub'])
})
