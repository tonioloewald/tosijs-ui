import { test, expect } from './fixtures'
import { readFileSync } from 'fs'
import { buildSlugMap } from '../src/doc-system/routing'

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

What this cannot see: a control beside an empty view. Controls count as content, because a
button that opens a dialog, a menu or a tooltip IS the demo (sixteen examples here are one);
measured, discounting them flags all sixteen. So an example whose control drives a view that
can be empty needs its own ```test that the view shows something, as the router page has.
*/

// Pages come from the source corpus, not the built folder: a page missing from the build then
// fails here (its examples are not found) instead of silently getting no test.
const docs: { filename: string; hidden?: boolean }[] = JSON.parse(
  readFileSync('demo/docs.json', 'utf8')
)
const slugMap = buildSlugMap(docs)
const slugs = docs
  .filter((doc) => !doc.hidden)
  .map((doc) => slugMap[doc.filename])
  .sort()

for (const slug of slugs) {
  const url = slug ? `/${slug}/` : '/'
  test(`every live example on ${url} shows something`, async ({ page }) => {
    const response = await page.goto(url)
    expect(response?.status(), `${url} is built`).toBe(200)
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
