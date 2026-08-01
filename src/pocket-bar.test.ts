import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { TosiPocketBar, tosiPocketBar } from './pocket-bar.js'

describe('TosiPocketBar', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
    document.querySelectorAll('tosi-pocket-bar').forEach((el) => el.remove())
  })

  const mount = (props: Record<string, unknown> = {}): TosiPocketBar => {
    const el = tosiPocketBar(props) as TosiPocketBar
    container.appendChild(el)
    return el
  }

  test('registers as <tosi-pocket-bar>', () => {
    const el = mount()
    expect(el).toBeInstanceOf(TosiPocketBar)
    expect(el.tagName.toLowerCase()).toBe('tosi-pocket-bar')
  })

  test('has a handle and a bar part', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="handle"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="bar"]')).not.toBeNull()
    // The bar hosts a slot so any light-DOM controls project into it.
    expect(el.shadowRoot!.querySelector('[part="bar"] slot')).not.toBeNull()
  })

  describe('default handle icon hints the growth axis', () => {
    const iconOf = (el: TosiPocketBar) =>
      el.shadowRoot!.querySelector('[part="handleIcon"]')!.getAttribute('icon')

    test('horizontal directions → moreHorizontal', () => {
      expect(iconOf(mount())).toBe('moreHorizontal') // auto
      expect(iconOf(mount({ direction: 'e' }))).toBe('moreHorizontal')
      expect(iconOf(mount({ direction: 'ws' }))).toBe('moreHorizontal')
    })

    test('vertical directions (n/s) → moreVertical', () => {
      expect(iconOf(mount({ direction: 'n' }))).toBe('moreVertical')
      expect(iconOf(mount({ direction: 'se' }))).toBe('moreVertical')
    })

    test('an explicit icon always wins', () => {
      expect(iconOf(mount({ icon: 'settings', direction: 'n' }))).toBe(
        'settings'
      )
    })
  })

  describe('bar orientation follows direction', () => {
    const flexOf = (el: TosiPocketBar) =>
      (el.shadowRoot!.querySelector('[part="bar"]') as HTMLElement).style
        .flexDirection

    test('auto / e / w lay out a row', () => {
      expect(flexOf(mount())).toBe('row')
      expect(flexOf(mount({ direction: 'e' }))).toBe('row')
      expect(flexOf(mount({ direction: 'w' }))).toBe('row')
    })

    test('n / s lay out a column', () => {
      expect(flexOf(mount({ direction: 'n' }))).toBe('column')
      expect(flexOf(mount({ direction: 's' }))).toBe('column')
    })
  })

  describe('the handle toggles the pinned-open state', () => {
    test('toggle() flips `open`', () => {
      const el = mount()
      expect(el.open).toBe(false)
      el.toggle()
      expect(el.open).toBe(true)
      el.toggle()
      expect(el.open).toBe(false)
    })

    test('clicking the handle toggles open', () => {
      const el = mount()
      const handle = el.shadowRoot!.querySelector(
        '[part="handle"]'
      ) as HTMLButtonElement
      handle.click()
      expect(el.open).toBe(true)
    })
  })
})
