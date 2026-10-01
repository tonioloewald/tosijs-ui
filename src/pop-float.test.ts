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

  test('never negative', () => {
    viewport({ offsetTop: 0, height: 500 })
    expect(
      roomOnScreen(at({ top: '600px', left: '0px' }), 390, 844).maxHeight
    ).toBe(0)
  })
})
