import { test, expect, settled } from './fixtures'
import { readFileSync } from 'fs'
import * as path from 'path'

/*
The components, as their doc pages show them, pass axe's WCAG 2.2 AA rules (#3570–#3574).

The accessibility mode's audit found 142 failures across this site's 75 pages (2026-10-29), most
of them in components every adopter ships: a table that was a list of list items, a select with
an input inside its button, unnamed icon buttons, tabs pointing at ids across a shadow root.
`doc-site-a11y.pw.ts` holds the FRAME and skips the examples; this holds what is inside them, on
each page where one of those failures was found.
*/
const AXE = readFileSync(
  path.resolve('node_modules/axe-core/axe.min.js'),
  'utf8'
)

const PAGES = [
  '/data-table/',
  '/crud/',
  '/tag-list/',
  '/filter-builder/',
  '/search-field/',
  '/select/',
  '/month/',
  '/tab-selector/',
  '/password-strength/',
  '/header/',
  '/code-editor/',
  '/carousel/',
  '/palette/',
  '/schema-form/',
  '/live-theme/',
  '/rich-text/',
  '/icons/',
  '/icon-composition/',
  '/float/',
  '/ab-test/',
]

for (const route of PAGES) {
  test(`${route} passes axe WCAG 2.2 AA, examples included`, async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'one engine is enough for axe')
    await page.addInitScript(() =>
      localStorage.setItem('tosijs-ui-tests-enabled', 'false')
    )
    await page.setViewportSize({ width: 1200, height: 900 })
    await page.goto(route)
    await page.waitForSelector('tosi-example .preview')
    await settled(page)
    await page.addScriptTag({ content: AXE })
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
        },
      })
      return result.violations.map(
        (v: any) =>
          `${v.id}: ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target} ${
            v.nodes[0]?.any?.[0]?.message ?? ''
          }`
      )
    })
    expect(violations).toEqual([])
  })
}
