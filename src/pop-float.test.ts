import { afterEach, describe, expect, test } from 'bun:test'
import { popFloat, roomOnScreen } from './pop-float.js'

afterEach(() => {
  document.body.textContent = ''
})

const box = () => {
  const el = document.createElement('div')
  el.textContent = 'float'
  return el
}

describe('a popped float closes only for a scroll that moves its anchor (#2460)', () => {
  function setup() {
    const scroller = document.createElement('div')
    const target = document.createElement('button')
    scroller.append(target)
    const elsewhere = document.createElement('div')
    document.body.append(scroller, elsewhere)
    const float = popFloat({
      content: box(),
      target,
      remainOnScroll: 'remove',
    })
    return { scroller, target, elsewhere, float }
  }

  test('another scroller on the page leaves it open', () => {
    const { elsewhere, float } = setup()
    elsewhere.dispatchEvent(new Event('scroll'))
    expect(float.isConnected).toBe(true)
  })

  test('a scroller containing the anchor closes it', () => {
    const { scroller, float } = setup()
    scroller.dispatchEvent(new Event('scroll'))
    expect(float.isConnected).toBe(false)
  })

  test('the page scrolling closes it', () => {
    const { float } = setup()
    document.dispatchEvent(new Event('scroll'))
    expect(float.isConnected).toBe(false)
  })

  test('a submenu (anchored inside its parent float) closes with its parent', () => {
    // 1.16.3 review B1: the parent closed and the submenu stayed, orphaned
    const { scroller, float: parent } = setup()
    const item = document.createElement('button')
    parent.append(item)
    const submenu = popFloat({
      content: box(),
      target: item,
      remainOnScroll: 'remove',
    })
    scroller.dispatchEvent(new Event('scroll'))
    expect(parent.isConnected).toBe(false)
    expect(submenu.isConnected).toBe(false)
  })

  test('repositioning a float against a new target re-anchors it', async () => {
    const { positionFloat } = await import('./pop-float.js')
    const { scroller, elsewhere, float } = setup()
    const other = document.createElement('button')
    elsewhere.append(other)
    positionFloat(float, other)
    scroller.dispatchEvent(new Event('scroll')) // the OLD anchor's scroller: no longer relevant
    expect(float.isConnected).toBe(true)
    elsewhere.dispatchEvent(new Event('scroll')) // the new one's
    expect(float.isConnected).toBe(false)
  })

  test('floats anchored inside each other do not loop', () => {
    const { elsewhere, float: a } = setup()
    const inA = document.createElement('button')
    a.append(inA)
    const b = popFloat({
      content: box(),
      target: inA,
      remainOnScroll: 'remove',
    })
    const inB = document.createElement('button')
    b.append(inB)
    a.anchor = inB // a cycle
    elsewhere.dispatchEvent(new Event('scroll')) // must return, and not close either
    expect(a.isConnected).toBe(true)
    expect(b.isConnected).toBe(true)
  })

  test('an anchor inside a shadow root is still moved by a scroller around its host', () => {
    const scroller = document.createElement('div')
    const host = document.createElement('div')
    scroller.append(host)
    document.body.append(scroller)
    const target = document.createElement('button')
    host.attachShadow({ mode: 'open' }).append(target)
    const float = popFloat({ content: box(), target, remainOnScroll: 'remove' })
    scroller.dispatchEvent(new Event('scroll'))
    expect(float.isConnected).toBe(false)
  })
})

describe('roomOnScreen measures against what is VISIBLE (#2460)', () => {
  const realViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport')
  afterEach(() => {
    if (realViewport)
      Object.defineProperty(window, 'visualViewport', realViewport)
    else delete (window as any).visualViewport
  })
  const viewport = (v: {
    offsetTop: number
    height: number
    offsetLeft?: number
    width?: number
  }) =>
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: { offsetLeft: 0, width: 390, ...v },
    })
  const at = (style: Partial<CSSStyleDeclaration>) => {
    const el = document.createElement('div')
    Object.assign(el.style, style)
    return el
  }

  test('a menu below its anchor gets only the visible space under it, not 100vh worth', () => {
    // an iPhone with the URL bar showing: the layout viewport is 844 tall, 750 is visible
    viewport({ offsetTop: 0, height: 750 })
    const { maxHeight } = roomOnScreen(
      at({ top: '600px', left: '10px' }),
      390,
      844
    )
    expect(maxHeight).toBe(150)
  })

  test('a menu above its anchor stops at the top of the visible area', () => {
    viewport({ offsetTop: 40, height: 700 }) // scrolled/zoomed: the visible area starts at 40
    const { maxHeight } = roomOnScreen(
      at({ bottom: '244px', left: '10px' }),
      390,
      844
    )
    expect(maxHeight).toBe(844 - 244 - 40)
  })

  test('a centred float keeps the old geometry (only the visible area replaces 100vw)', () => {
    viewport({ offsetTop: 0, height: 700, width: 390 })
    const el = at({ top: '100px', left: '50px', transform: 'translateX(-50%)' })
    // NOT 2 * 50: narrowing centred tooltips near an edge would be a different change
    expect(roomOnScreen(el, 390, 844).maxWidth).toBe(340)
  })

  test('with no visualViewport (older browsers), the layout viewport is the visible area', () => {
    delete (window as any).visualViewport
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: null,
    })
    expect(
      roomOnScreen(at({ top: '600px', left: '10px' }), 390, 844).maxHeight
    ).toBe(244)
  })

  test('an anchor outside the visible area (zoomed in) falls back to the layout viewport, not 0', () => {
    viewport({ offsetTop: 0, height: 500 }) // the anchor at 600 is below what is visible
    const el = at({ top: '600px', left: '0px' })
    expect(roomOnScreen(el, 390, 844).maxHeight).toBe(844 - 600)
  })
})

describe('open floats stay fitted to the visible viewport (#2460)', () => {
  const realViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport')
  afterEach(() => {
    if (realViewport)
      Object.defineProperty(window, 'visualViewport', realViewport)
    else delete (window as any).visualViewport
  })

  test("when Safari's toolbar shrinks the visible area, an open menu's room shrinks with it", async () => {
    const { refitFloats } = await import('./pop-float.js')
    const viewport = { offsetTop: 0, offsetLeft: 0, width: 390, height: 750 }
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: viewport,
    })
    const target = document.createElement('button')
    document.body.append(target)
    const float = popFloat({ content: box(), target, position: 's' })
    const before = parseFloat(float.style.getPropertyValue('--max-height'))
    viewport.height = 650 // the toolbar came back
    refitFloats()
    const after = parseFloat(float.style.getPropertyValue('--max-height'))
    expect(before - after).toBeCloseTo(100, 1)
  })

  test('a re-fit keeps the float where it was asked to be (1.16.5 review B1)', async () => {
    const { refitFloats } = await import('./pop-float.js')
    const viewport = { offsetTop: 0, offsetLeft: 0, width: 390, height: 750 }
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: viewport,
    })
    const target = document.createElement('button')
    document.body.append(target)
    for (const position of ['s', 'n', 'e', 'w', 'se', 'nw'] as const) {
      const float = popFloat({ content: box(), target, position })
      expect(float.anchorPosition).toBe(position)
      const placed = () => ({
        top: float.style.top,
        left: float.style.left,
        right: float.style.right,
        bottom: float.style.bottom,
        transform: float.style.transform,
      })
      const before = placed()
      expect(Object.values(before).some((v) => v !== '')).toBe(true)
      refitFloats() // nothing changed: nothing moves
      expect(placed()).toEqual(before)
      float.remove()
    }
  })

  test('a draggable float is left where it is', async () => {
    const { refitFloats } = await import('./pop-float.js')
    const target = document.createElement('button')
    document.body.append(target)
    const float = popFloat({
      content: box(),
      target,
      position: 's',
      draggable: true,
    })
    float.style.top = '300px' // moved by the user
    refitFloats()
    expect(float.style.top).toBe('300px')
  })
})
