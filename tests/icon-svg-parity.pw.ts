import { test, expect } from '@playwright/test'

/*
`iconSvg()` builds markup for icons that rotate or flip another (`chevronDown` is
`chevronRight90r`) by wrapping the drawing in an SVG `<g transform>`. The DOM renderer
draws the same icon with a CSS transform on the element. The claim is that the two draw
the same pixels, and it is only worth anything checked in a browser: both sides are drawn
here, through the same renderer, and compared.

1.16.19's first cut had its own copy of the suffix grammar and rotated `edit2_90r` the
wrong way, producing valid, plausible markup. A pixel comparison is what notices that.
*/

declare const xinjsui: any

test('iconSvg markup draws the same pixels as the DOM renderer', async ({
  page,
}) => {
  await page.goto('/icon-svg/')
  await page.waitForFunction(() => typeof (window as any).xinjsui === 'object')
  const names = await page.evaluate(() => {
    const { icons, iconSvg, iconNames, defineIcons } = xinjsui
    defineIcons({ parityEdit: 'edit2_90r' })
    const transformed: string[] = iconNames().filter((name: string) =>
      iconSvg(name).includes('<g transform=')
    )
    // Written inline, and the control pair that MUST differ (an unrotated chevron).
    const pairs: Array<[string, string]> = [
      ...transformed.map((name): [string, string] => [name, name]),
      ['chevronRight90r', 'chevronRight90r'],
      ['control', 'chevronRight'],
    ]
    const grid = document.createElement('div')
    grid.style.cssText =
      'position:fixed;inset:0;z-index:99999;background:white;color:black;' +
      '--tosi-icon-size:96px;display:flex;flex-wrap:wrap;align-content:start'
    for (const [label, rendered] of pairs) {
      const markupName = `parity_${label}`
      defineIcons({
        [markupName]: iconSvg(label === 'control' ? 'chevronDown' : label),
      })
      for (const [side, icon] of [
        ['dom', icons[rendered]()],
        ['markup', icons[markupName]()],
      ]) {
        const cell = document.createElement('div')
        cell.dataset.parity = `${label}:${side}`
        cell.style.cssText = 'width:96px;height:96px;overflow:hidden'
        cell.append(icon)
        grid.append(cell)
      }
    }
    document.body.append(grid)
    return pairs.map(([label]) => label)
  })
  expect(names.length).toBe(30) // 27 built-ins, parityEdit, the inline name, the control

  const shot = async (label: string, side: string) =>
    (
      await page.locator(`[data-parity="${label}:${side}"]`).screenshot()
    ).toString('base64')
  /*
  Pixels that differ by more than an antialiasing shade. Chromium rasterises a CSS-transformed
  element and an SVG `<g transform>` with slightly different edge coverage, so byte equality
  fails on drawings that are geometrically identical; a wrong rotation moves whole strokes.
  */
  const differingPixels = (a: string, b: string) =>
    page.evaluate(
      async ([a, b]) => {
        const decode = async (png: string) => {
          const bitmap = await createImageBitmap(
            await (await fetch(`data:image/png;base64,${png}`)).blob()
          )
          const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
          const context = canvas.getContext('2d')!
          context.drawImage(bitmap, 0, 0)
          return context.getImageData(0, 0, bitmap.width, bitmap.height).data
        }
        const [x, y] = await Promise.all([decode(a), decode(b)])
        let count = 0
        for (let i = 0; i < x.length; i += 4) {
          const delta = Math.max(
            Math.abs(x[i] - y[i]),
            Math.abs(x[i + 1] - y[i + 1]),
            Math.abs(x[i + 2] - y[i + 2])
          )
          if (delta > 96) count++
        }
        return count
      },
      [a, b]
    )
  const counts: Record<string, number> = {}
  for (const label of names) {
    counts[label] = await differingPixels(
      await shot(label, 'dom'),
      await shot(label, 'markup')
    )
  }
  // The control shows the instrument can see a rotation: measured 684 pixels and more.
  expect(counts.control).toBeGreaterThan(100)
  delete counts.control
  expect(Object.entries(counts).filter(([, count]) => count > 0)).toEqual([])
})
