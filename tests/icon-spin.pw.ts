import { test, expect } from './fixtures'

/*
`spinN<Icon>` (board #3508), checked where it turns: a real engine. The rotation must be a CSS
animation on an HTML element, never on the svg (WebKit animates an svg transform on the main
thread, so a loader froze while the page worked), and it must turn in a shadow root too,
where a document-level @keyframes does not reach in Chromium or Firefox.
*/
test('a spin icon turns, in the light DOM and in a shadow root', async ({
  page,
}) => {
  await page.goto('/component/')
  await page.waitForFunction(
    // a boolean: `icons` is a Proxy whose `then` is a function, so returning it hangs
    () => !!(window as any).xinjsui?.icons
  )
  const result = await page.evaluate(async () => {
    const { icons } = (window as any).xinjsui
    const host = document.createElement('div')
    document.body.append(host)
    const root = host.attachShadow({ mode: 'open' })
    const light = icons['spin360Loader40s_30x']()
    const shadow = icons['spin360Loader40s_30x']()
    document.body.append(light)
    root.append(shadow)
    const angle = (icon: Element) => {
      const m = getComputedStyle(
        icon.querySelector('.tosi-icon-spin')!
      ).transform
      const [a, b] = m
        .slice(m.indexOf('(') + 1)
        .split(',')
        .map(Number)
      return m === 'none'
        ? null
        : Math.round((Math.atan2(b, a) * 180) / Math.PI)
    }
    const read = (icon: Element) => {
      const spin = icon.querySelector('.tosi-icon-spin')!
      return {
        name: getComputedStyle(spin).animationName,
        running: spin.getAnimations().length,
        svgAnimations: icon.querySelector('svg')!.getAnimations().length,
        offset: (spin.parentElement as HTMLElement).style.transform,
        angle: angle(icon),
      }
    }
    const before = [read(light), read(shadow)]
    await new Promise((r) => setTimeout(r, 250))
    return { before, after: [angle(light), angle(shadow)] }
  })
  for (const [i, state] of result.before.entries()) {
    expect(state.name).toBe('tosi-icon-spin')
    expect(state.running).toBe(1)
    expect(state.svgAnimations).toBe(0)
    expect(state.offset).toContain('translateX(-30%)')
    expect(state.angle).not.toBeNull()
    expect(result.after[i]).not.toBe(state.angle)
  }
})

test('under prefers-reduced-motion a spin icon holds still', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/component/')
  await page.waitForFunction(() => !!(window as any).xinjsui?.icons)
  const state = await page.evaluate(() => {
    const icon = (window as any).xinjsui.icons.spin360Loader()
    document.body.append(icon)
    const spin = icon.querySelector('.tosi-icon-spin')!
    return {
      name: getComputedStyle(spin).animationName,
      running: spin.getAnimations().length,
    }
  })
  expect(state).toEqual({ name: 'none', running: 0 })
})
