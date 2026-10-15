import { test, expect } from '@playwright/test'
import { readdirSync, existsSync } from 'fs'

/*
Every live example must show the reader something. An example whose preview is empty passes
every other gate: it runs without error, and if it has no test there is nothing to fail. The
reader sees a blank box, which reads as a broken component.

Found this way (2026-10-15), all green in every lane: the table's Column Width section had an
`html` fence meant as syntax that rendered an empty `<tosi-table>`; three fences of code to read
(`css`, `js`) ran and showed nothing; and the router page's examples shared the one router, so
the last to run blanked the others.

"Shows something" is judged from what is drawn: text with a size, a media or form element with
a size, or a plain leaf element that draws a box (background, background image, border or
shadow). A component with nothing in it does not count, whatever its own background: the
empty `<tosi-table>` was a grey rectangle, which a reader takes for a broken table. Exempt, by the example's own state rather than by a list:
a test-only example (`-test-only`: its results are its body) and an example whose preview is
empty but which shows its console output instead (`-output-only`). An example that renders in
an iframe has no inline `.preview` and is not checked.

Code meant to be read rather than run belongs in a `:static` fence (` ```js:static `).
*/

const slugs = readdirSync('docs')
  .filter((dir) => existsSync(`docs/${dir}/index.html`))
  .sort()

for (const slug of slugs) {
  test(`every live example on /${slug}/ shows something`, async ({ page }) => {
    await page.goto(`/${slug}/`)
    const blank = async () =>
      page.evaluate(() => {
        const MEDIA =
          'img,svg,canvas,video,iframe,input,button,select,textarea,progress,meter'
        const drawn = (el: Element) => {
          const box = el.getBoundingClientRect()
          return box.width > 0 && box.height > 0
        }
        const showsSomething = (root: Node): boolean => {
          const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
          )
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            if (n.nodeType === Node.TEXT_NODE) {
              if (!(n.textContent ?? '').trim()) continue
              const range = document.createRange()
              range.selectNodeContents(n)
              const box = range.getBoundingClientRect()
              if (box.width > 0 && box.height > 0) return true
              continue
            }
            const el = n as Element
            if (el.shadowRoot && showsSomething(el.shadowRoot)) return true
            if (el.matches(MEDIA) && drawn(el)) return true
            // A plain element that draws a box (editable-rect's rectangles, an icon as a
            // background image) shows something. A component with nothing in it does not,
            // whatever its own background: that is the blank rectangle this spec exists for.
            if (
              el.children.length === 0 &&
              !el.shadowRoot &&
              !el.tagName.includes('-') &&
              drawn(el)
            ) {
              const style = getComputedStyle(el)
              if (
                style.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
                style.backgroundImage !== 'none' ||
                style.boxShadow !== 'none' ||
                parseFloat(style.borderTopWidth) > 0
              ) {
                return true
              }
            }
          }
          return false
        }
        const heading = (example: Element) => {
          for (
            let n: Element | null = example;
            n;
            n = n.previousElementSibling ?? n.parentElement
          ) {
            if (/^H[1-4]$/.test(n.tagName)) return n.textContent?.trim()
          }
          return '(top of page)'
        }
        return [...document.querySelectorAll('tosi-example')]
          .filter(
            (example) =>
              !example.classList.contains('-test-only') &&
              !example.classList.contains('-output-only')
          )
          .filter((example) => {
            const preview = example.querySelector('.preview')
            return preview != null && !showsSomething(preview)
          })
          .map(
            (example) =>
              `example ${[...document.querySelectorAll('tosi-example')].indexOf(
                example
              )} under "${heading(example)}"`
          )
      })
    // Examples fetch, load and render asynchronously: wait until none is blank, or give up.
    let found = await blank()
    for (let i = 0; found.length > 0 && i < 40; i++) {
      await page.waitForTimeout(250)
      found = await blank()
    }
    expect(found, 'live examples that show nothing').toEqual([])
  })
}
