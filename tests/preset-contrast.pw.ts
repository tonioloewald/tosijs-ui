import { test, expect, settled } from './fixtures'
import { readFileSync } from 'fs'
import * as path from 'path'

/*
Every style preset's text meets WCAG AA contrast, measured on the RENDERED page.

axe cannot do this for a translucent preset. Glass draws its surfaces as veils over a gradient
backdrop, and axe reports every one of its text nodes "incomplete: background is a gradient"
rather than measuring it, so the axe lane passed Glass with 59 of 59 nodes unmeasured while its
headings, links, inline code and search label sat at 1.4–3.9:1.

So this measures what a reader sees. axe still picks the nodes (every one its colour-contrast
rule considers, passed, failed or unmeasured); then the page is screenshotted twice, with text
and with every glyph made transparent. Pixels that differ are a node's glyphs, minus the glyphs
of nodes inside it (a paragraph is not judged by its links), and the second screenshot gives the
background under each of them. The 2nd-percentile ratio is the node's contrast: a single stray
pixel is not a failure, a run of them is.
*/
const AXE = readFileSync(
  path.resolve('node_modules/axe-core/axe.min.js'),
  'utf8'
)

// A pixel this different between the two screenshots is under a glyph (summed over RGB).
const GLYPH_DIFF = 60

for (const style of ['original', 'glass', 'material']) {
  for (const scheme of ['light', 'dark'] as const) {
    for (const highContrast of [false, true]) {
      for (const route of ['/', '/doc-site-system/']) {
        test(`${style} text meets AA contrast as rendered (${route}, ${scheme}${highContrast ? ', high contrast' : ''})`, async ({
          page,
          browserName,
        }) => {
          test.skip(
            browserName !== 'chromium',
            'one engine is enough for contrast'
          )
          await page.emulateMedia({ colorScheme: scheme })
          await page.addInitScript(
            ({ style, highContrast }) => {
              localStorage.setItem('tosijs-ui-tests-enabled', 'false')
              localStorage.setItem(
                'tosi-doc-system-prefs',
                JSON.stringify({ style, highContrast })
              )
            },
            { style, highContrast }
          )
          await page.setViewportSize({ width: 1200, height: 900 })
          await page.goto(route)
          await page.waitForFunction(
            () => !!customElements.get('tosi-doc-system')
          )
          await settled(page)
          expect(
            await page.evaluate(() => document.documentElement.className)
          ).toContain(`tosi-style-${style}`)
          expect(
            await page.evaluate(() =>
              document.documentElement.classList.contains('high-contrast')
            )
          ).toBe(highContrast)
          await page.addScriptTag({ content: AXE })
          const nodes = await page.evaluate(async () => {
            const result = await (window as any).axe.run(document, {
              runOnly: { type: 'rule', values: ['color-contrast'] },
              exclude: [['tosi-example']],
            })
            return [
              ...result.passes,
              ...result.incomplete,
              ...result.violations,
            ]
              .flatMap((rule: any) => rule.nodes)
              .map((node: any) => {
                const el = document.querySelector(node.target[0]) as HTMLElement
                if (!el) return null
                const r = el.getBoundingClientRect()
                const cs = getComputedStyle(el)
                const px = parseFloat(cs.fontSize)
                const bold = parseInt(cs.fontWeight) >= 700
                return {
                  target: node.target.join(' '),
                  text: el.textContent!.trim().slice(0, 30),
                  color: cs.color,
                  large: px >= 24 || (bold && px >= 18.66),
                  box: [r.left, r.top, r.width, r.height].map(Math.round),
                }
              })
              .filter(
                (n): n is NonNullable<typeof n> =>
                  !!n &&
                  n.box[2] > 0 &&
                  n.box[3] > 0 &&
                  n.box[1] < innerHeight &&
                  n.box[1] + n.box[3] > 0
              )
          })
          expect(nodes.length).toBeGreaterThan(20)

          // Transitions off, or a screenshot catches colours mid-change.
          await page.addStyleTag({
            content:
              '*, *::before, *::after { transition: none !important; animation: none !important }',
          })
          await page.waitForTimeout(300)
          const withText = (await page.screenshot()).toString('base64')
          await page.addStyleTag({
            content:
              '*, *::before, *::after { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; caret-color: transparent !important } svg, img { visibility: hidden !important }',
          })
          await page.waitForTimeout(300)
          const withoutText = (await page.screenshot()).toString('base64')

          const failures = await page.evaluate(
            async ({ withText, withoutText, nodes, GLYPH_DIFF }) => {
              const pixels = async (png: string) => {
                const img = new Image()
                img.src = 'data:image/png;base64,' + png
                await img.decode()
                const canvas = document.createElement('canvas')
                canvas.width = img.width
                canvas.height = img.height
                const g = canvas.getContext('2d', { willReadFrequently: true })!
                g.drawImage(img, 0, 0)
                return g
              }
              const glyphs = await pixels(withText)
              const ground = await pixels(withoutText)
              const { width, height } = ground.canvas
              // A computed colour may be color(srgb …) or color(xyz-d65 …): let canvas resolve it.
              const probe = document
                .createElement('canvas')
                .getContext('2d', { willReadFrequently: true })!
              const rgb = (css: string) => {
                probe.clearRect(0, 0, 1, 1)
                probe.fillStyle = css
                probe.fillRect(0, 0, 1, 1)
                return [...probe.getImageData(0, 0, 1, 1).data]
              }
              const channel = (v: number) => {
                v /= 255
                return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
              }
              const luminance = (r: number, g: number, b: number) =>
                0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
              const ratio = (a: number, b: number) =>
                (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
              const contains = (a: number[], b: number[]) =>
                b.join() !== a.join() &&
                b[0] >= a[0] &&
                b[1] >= a[1] &&
                b[0] + b[2] <= a[0] + a[2] &&
                b[1] + b[3] <= a[1] + a[3]

              const out: string[] = []
              for (const node of nodes) {
                const [r, g, b] = rgb(node.color)
                const text = luminance(r, g, b)
                const [x, y, w, h] = node.box
                const x0 = Math.max(0, x)
                const y0 = Math.max(0, y)
                const x1 = Math.min(width, x + w)
                const y1 = Math.min(height, y + h)
                if (x1 <= x0 || y1 <= y0) continue
                const span = x1 - x0
                const on = glyphs.getImageData(x0, y0, span, y1 - y0).data
                const off = ground.getImageData(x0, y0, span, y1 - y0).data
                const inner = nodes
                  .filter(
                    (other) => other !== node && contains(node.box, other.box)
                  )
                  .map((other) => other.box)
                const ratios: number[] = []
                for (let i = 0; i < off.length; i += 4) {
                  const diff =
                    Math.abs(on[i] - off[i]) +
                    Math.abs(on[i + 1] - off[i + 1]) +
                    Math.abs(on[i + 2] - off[i + 2])
                  if (diff < GLYPH_DIFF) continue
                  const px = x0 + ((i / 4) % span)
                  const py = y0 + Math.floor(i / 4 / span)
                  if (
                    inner.some(
                      (k) =>
                        px >= k[0] &&
                        py >= k[1] &&
                        px < k[0] + k[2] &&
                        py < k[1] + k[3]
                    )
                  )
                    continue
                  ratios.push(
                    ratio(text, luminance(off[i], off[i + 1], off[i + 2]))
                  )
                }
                if (!ratios.length) continue
                ratios.sort((a, b) => a - b)
                const measured = ratios[Math.floor(ratios.length * 0.02)]
                const needed = node.large ? 3 : 4.5
                if (measured < needed)
                  out.push(
                    `${measured.toFixed(2)}:1 < ${needed}:1 "${node.text}" ${node.target} (${node.color})`
                  )
              }
              return out
            },
            { withText, withoutText, nodes, GLYPH_DIFF }
          )
          expect(failures).toEqual([])
        })
      }
    }
  }
}
