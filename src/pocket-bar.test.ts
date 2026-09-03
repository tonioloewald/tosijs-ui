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

test('hover-peek ignores touch pointers, and a tap does not flash it open (real element)', () => {
  /*
  Mounts the SHIPPED component and dispatches real PointerEvents. The previous version of this
  test declared `const peeks = (t) => t !== 'touch'` inside the file and asserted on that copy —
  it never mounted anything, and deleting the production guard left it green. That is the exact
  pattern this repo now bans: import the symbol or mount the component, never retype the
  condition.

  The bug: a touch device has no hover, but the browser still fires pointerenter/leave around a
  tap, so the peek opened the bar and the leave closed it before the click could pin it.
  */
  const bar = tosiPocketBar({ direction: 'w' }) as any
  document.body.append(bar)

  /*
  happy-dom has no `PointerEvent`, so synthesise the one property the handler reads. This
  still exercises the SHIPPED handler rather than a retyped condition — and the genuine
  pointer sequence a browser produces around a tap is covered in `tests/pocket-bar.pw.ts`,
  which is where it belongs.
  */
  const fire = (type: string, pointerType: string) => {
    const event = new Event(type, {
      bubbles: true,
      composed: true,
    }) as Event & {
      pointerType?: string
    }
    event.pointerType = pointerType
    bar.dispatchEvent(event)
  }

  fire('pointerenter', 'touch')
  expect(bar.open).toBe(false) // a tap must NOT peek

  fire('pointerenter', 'mouse')
  expect(bar.open).toBe(true) // hover still peeks
  fire('pointerleave', 'mouse')
  expect(bar.open).toBe(false)

  bar.remove()
})

test('close() clears the pin, so the bar does not re-open on the next hover', () => {
  /*
  The regression this misses when `open` is written directly: `pinned` stays true, so
  `handlePointerLeave`'s `!pinned` guard never fires, the bar sticks open over the content, and
  the next handle click is dead. Found by the 1.13.0 review; this is the test that would have
  caught it.
  */
  const bar = tosiPocketBar({ direction: 'w' }) as any
  document.body.append(bar)

  bar.toggle() // as clicking the handle does: pinned = true, open = true
  expect(bar.open).toBe(true)

  bar.close()
  expect(bar.open).toBe(false)

  // With the pin cleared, hover-out closes again instead of leaving it stuck open.
  const mouse = (type: string) => {
    const event = new Event(type, { bubbles: true }) as Event & {
      pointerType?: string
    }
    event.pointerType = 'mouse'
    bar.dispatchEvent(event)
  }
  mouse('pointerenter')
  expect(bar.open).toBe(true)
  mouse('pointerleave')
  expect(bar.open).toBe(false)

  bar.remove()
})
