import { afterEach, describe, expect, test } from 'bun:test'
import { tosiCarousel, TosiCarousel } from './carousel.js'

const realMatchMedia = globalThis.matchMedia

afterEach(() => {
  globalThis.matchMedia = realMatchMedia
  document.body.textContent = ''
})

async function mount(): Promise<TosiCarousel> {
  const carousel = tosiCarousel(
    { auto: 1 },
    ...[1, 2, 3].map((n) => {
      const slide = document.createElement('div')
      slide.textContent = `slide ${n}`
      return slide
    })
  )
  document.body.append(carousel)
  await carousel.whenHydrated
  return carousel
}

// happy-dom has no PointerEvent; the handlers read only `pointerType`
const pointer = (type: string, pointerType: string) =>
  Object.assign(new Event(type, { bubbles: true }), { pointerType })

describe('auto-advance holds still while someone is looking (#204)', () => {
  test('a mouse hover pauses it; leaving resumes it', async () => {
    const carousel = await mount()
    expect(carousel.autoPaused).toBe(false)
    carousel.dispatchEvent(pointer('pointerenter', 'mouse'))
    expect(carousel.autoPaused).toBe(true)
    carousel.dispatchEvent(pointer('pointerleave', 'mouse'))
    expect(carousel.autoPaused).toBe(false)
  })

  test('a touch is not a hover (nothing would ever un-hover it)', async () => {
    const carousel = await mount()
    carousel.dispatchEvent(pointer('pointerenter', 'touch'))
    expect(carousel.autoPaused).toBe(false)
  })

  test('prefers-reduced-motion: reduce stops it', async () => {
    const carousel = await mount()
    globalThis.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
    })) as any
    expect(carousel.autoPaused).toBe(true)
  })

  test('leaving the page clears a hover that never got its pointerleave', async () => {
    const carousel = await mount()
    carousel.dispatchEvent(pointer('pointerenter', 'mouse'))
    carousel.remove()
    document.body.append(carousel)
    expect(carousel.autoPaused).toBe(false)
  })
})
