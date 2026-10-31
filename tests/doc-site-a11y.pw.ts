import { test, expect } from './fixtures'
import { readFileSync } from 'fs'
import * as path from 'path'

/*
The doc-site FRAME meets WCAG 2.2 AA, as axe measures it (#3520). An adopter's scan of a
1.16.38 site found four failures, all in the frame, so every doc site had them: the search
trigger at 1.88:1, links inside the nav's <summary> toggles, those toggles under 24px, and
code blocks that scroll sideways with no keyboard access.

Every WCAG 2.2 A and AA rule axe has, against pages with sections, code and both colour
schemes. Content-level judgements (is this alt
text good?) are not the frame's to make.
*/
const AXE = readFileSync(
  path.resolve('node_modules/axe-core/axe.min.js'),
  'utf8'
)

for (const scheme of ['light', 'dark'] as const) {
  for (const route of ['/', '/doc-site-system/']) {
    test(`the doc-site frame passes axe WCAG 2.2 AA (${route}, ${scheme})`, async ({
      page,
      browserName,
    }) => {
      test.skip(browserName !== 'chromium', 'one engine is enough for axe')
      await page.emulateMedia({ colorScheme: scheme })
      await page.addInitScript(() =>
        localStorage.setItem('tosijs-ui-tests-enabled', 'false')
      )
      await page.setViewportSize({ width: 1200, height: 900 })
      await page.goto(route)
      await page.waitForFunction(() => !!customElements.get('tosi-doc-system'))
      await page.waitForTimeout(500)
      await page.addScriptTag({ content: AXE })
      const violations = await page.evaluate(async () => {
        const result = await (window as any).axe.run(document, {
          /*
          Every WCAG 2.0–2.2 A and AA rule, not a hand-picked few: picking rules is how the
          search trigger's name failed label-in-name on every doc site while this passed (#3569).
          Target size is checked over the frame only, below.
          */
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
          },
          rules: { 'target-size': { enabled: false } },
          // Live examples render arbitrary demo content; the frame is what is under test.
          exclude: [['tosi-example']],
        })
        /*
        Target size over the frame only. A content link's size is the author's (the README's
        badges, which the fixtures also answer with 1x1 images), and WCAG exempts inline
        links in running text anyway.
        */
        const frame = await (window as any).axe.run(
          { include: [['header'], ['.doc-nav']] },
          { runOnly: { type: 'rule', values: ['target-size'] } }
        )
        return [...result.violations, ...frame.violations].map(
          (v: any) =>
            `${v.id}: ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target} ${
              v.nodes[0]?.any?.[0]?.message ?? ''
            }`
        )
      })
      expect(violations).toEqual([])
    })
  }
}

/*
A page of plain prose, with no link or control in it, still scrolls by keyboard (#3575). axe
accepts a scrolling region that holds something focusable, and every page of this site does, so
the test strips the content down to text: Learn 3D's chapters are like that, and failed on 71 of
126 pages.
*/
test('the content scroller is keyboard-reachable on a page with no links', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'one engine is enough for axe')
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
  await page.setViewportSize({ width: 1200, height: 600 })
  await page.goto('/doc-site-system/')
  await page.waitForFunction(() => !!customElements.get('tosi-doc-system'))
  await page.waitForTimeout(500)
  await page.evaluate(() => {
    const content = document.querySelector('.doc-content')!
    content.replaceChildren(
      ...Array.from({ length: 80 }, (_, i) => {
        const p = document.createElement('p')
        p.textContent = `Paragraph ${i} of plain prose.`
        return p
      })
    )
  })
  await page.addScriptTag({ content: AXE })
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document, {
      runOnly: { type: 'rule', values: ['scrollable-region-focusable'] },
    })
    return result.violations.map(
      (v: any) => `${v.id}: ${v.nodes.map((n: any) => n.target).join(', ')}`
    )
  })
  expect(violations).toEqual([])
  // ...and it is the page's main landmark, which the frame did not have at all.
  await expect(page.locator('[role="main"]')).toHaveCount(1)
})
