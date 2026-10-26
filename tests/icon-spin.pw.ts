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
        icon.querySelector('tosi-icon-spin')!
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
      const spin = icon.querySelector('tosi-icon-spin')!
      return {
        name: getComputedStyle(spin).animationName,
        running: spin.getAnimations().length,
        svgAnimations: icon.querySelector('svg')!.getAnimations().length,
        offset: (spin.parentElement as HTMLElement).style.transform,
        angle: angle(icon),
      }
    }
    const before = [read(light), read(shadow)]
    const started = [light, shadow].map(
      (icon) => icon.querySelector('tosi-icon-spin')!.getAnimations()[0]
    )
    const t0 = started.map((a: Animation) => Number(a.currentTime))
    await new Promise((r) => setTimeout(r, 250))
    // Advancing, then read at a fixed quarter turn: sampling the angle off the wall clock
    // flaked in WebKit on a loaded machine.
    const advanced = started.map(
      (a: Animation, i: number) => Number(a.currentTime) > t0[i]
    )
    for (const a of started) {
      a.pause()
      a.currentTime = 250
    }
    return { before, advanced, quarter: [angle(light), angle(shadow)] }
  })
  for (const [i, state] of result.before.entries()) {
    expect(state.name).toBe('tosi-icon-spin')
    expect(state.running).toBe(1)
    expect(state.svgAnimations).toBe(0)
    expect(state.offset).toContain('translateX(-30%)')
    expect(result.advanced[i]).toBe(true)
    expect(result.quarter[i]).toBe(90)
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
    const spin = icon.querySelector('tosi-icon-spin')!
    return {
      name: getComputedStyle(spin).animationName,
      running: spin.getAnimations().length,
    }
  })
  expect(state).toEqual({ name: 'none', running: 0 })
})

// The correctness review of 1.16.34: in a flex container taller than the icon, the spinning
// box stretched while the svg did not, so the svg orbited the box's centre.
test('a spin icon in a tall flex row turns in place, and so does a clone', async ({
  page,
}) => {
  await page.goto('/component/')
  await page.waitForFunction(() => !!(window as any).xinjsui?.icons)
  const centres = await page.evaluate(async () => {
    const { icons } = (window as any).xinjsui
    // a div, not a button: a button centres its content, so nothing stretches the icon
    const button = document.createElement('div')
    button.style.cssText = 'display:flex;height:48px'
    button.append(icons.spin360Loader(), 'Loading')
    const clone = button.cloneNode(true) as HTMLElement
    document.body.append(button, clone)
    const at = (el: HTMLElement, turn: number) => {
      for (const a of el.querySelector('tosi-icon-spin')!.getAnimations()) {
        a.pause()
        a.currentTime = turn * 1000
      }
      const r = el.querySelector('svg')!.getBoundingClientRect()
      return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)]
    }
    return {
      text: button.textContent,
      button: [0, 0.25, 0.5].map((t) => at(button, t)),
      clone: [0, 0.25, 0.5].map((t) => at(clone, t)),
    }
  })
  expect(centres.text).toBe('Loading')
  for (const path of [centres.button, centres.clone]) {
    for (const point of path) expect(point).toEqual(path[0])
  }
})
