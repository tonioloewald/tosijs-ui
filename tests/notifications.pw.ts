import { test, expect, type Page } from './fixtures'

/*
Notification layout: a long message cannot push the close button out of the note, and past
`maxVisible` notes the bottom one becomes a stack instead of the list scrolling. Both are
geometry, which happy-dom does not compute.
*/

async function open(page: Page) {
  // The page's own inline tests would post notifications of their own.
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
  await page.goto('/')
  await page.waitForFunction(() => !!(window as any).xinjsui?.postNotification)
}

/** Post `count` notifications, oldest first, and wait for their transitions to settle. */
async function post(
  page: Page,
  count: number,
  message = (i: number) => `note ${i}`
) {
  const messages = Array.from({ length: count }, (_, i) => message(i))
  await page.evaluate((messages) => {
    const w = window as any
    w.__closed = []
    for (const m of messages)
      w.xinjsui.postNotification({
        message: m,
        close: () => w.__closed.push(m),
      })
  }, messages)
  await page.waitForTimeout(700)
}

/** Each open note's message, classes and box, in DOM order (oldest first). */
function notes(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector('tosi-notification')!.shadowRoot!
    return [...root.querySelectorAll<HTMLElement>('.note:not(.closing)')].map(
      (note) => {
        const r = note.getBoundingClientRect()
        const close = note.querySelector('.close')!.getBoundingClientRect()
        const text = note.querySelector<HTMLElement>('.text')!
        return {
          message: text.textContent,
          stacked: note.classList.contains('stacked'),
          visible: getComputedStyle(note).visibility !== 'hidden',
          inert: note.inert,
          top: r.top,
          bottom: r.bottom,
          left: r.left,
          right: r.right,
          close: { left: close.left, right: close.right },
          clipped: text.scrollHeight > text.clientHeight,
        }
      }
    )
  })
}

test('a long message is clamped and the close button stays inside the note', async ({
  page,
}) => {
  await open(page)
  await post(page, 1, () => 'x'.repeat(400) + ' ' + 'word '.repeat(300))
  const [note] = await notes(page)
  expect(note.close.left).toBeGreaterThanOrEqual(note.left)
  expect(note.close.right).toBeLessThanOrEqual(note.right)
  expect(note.clipped).toBe(true)
  const viewport = page.viewportSize()!
  expect(note.top).toBeGreaterThan(0)
  expect(note.bottom).toBeLessThanOrEqual(viewport.height)
})

test('up to three notes sit in a column, newest on top', async ({ page }) => {
  await open(page)
  await post(page, 3)
  const shown = await notes(page)
  expect(shown.map((n) => n.stacked)).toEqual([false, false, false])
  // oldest (first) at the bottom, each above the one before, no overlap
  expect(shown[1].bottom).toBeLessThanOrEqual(shown[0].top)
  expect(shown[2].bottom).toBeLessThanOrEqual(shown[1].top)
})

test('past three, the bottom note becomes a receding stack', async ({
  page,
}) => {
  await open(page)
  await post(page, 8)
  const shown = await notes(page)
  const [front, ...rest] = shown
  const behind = rest.slice(0, 5)
  const column = rest.slice(5)
  // the oldest stays in front at the bottom, the two newest stay in the column above it
  expect(front.message).toBe('note 0')
  expect(front.stacked).toBe(false)
  expect(column.map((n) => n.message)).toEqual(['note 6', 'note 7'])
  expect(column.every((n) => !n.stacked && n.visible)).toBe(true)
  expect(column[0].bottom).toBeLessThanOrEqual(front.top)
  // four peek out, each further up and right by less than the last; the fifth is hidden
  expect(behind.map((n) => n.stacked)).toEqual([true, true, true, true, true])
  expect(behind.map((n) => n.visible)).toEqual([true, true, true, true, false])
  expect(behind.every((n) => n.inert)).toBe(true)
  const rises = behind.slice(0, 4).map((n) => Math.round(front.top - n.top))
  expect(rises).toEqual([8, 14, 18, 20])
  for (const n of behind.slice(0, 4)) expect(n.left).toBeGreaterThan(front.left)
  // the column clears the peeking cards
  expect(column[0].bottom).toBeLessThanOrEqual(behind[3].top)
})

test('closing the front card brings the next one forward', async ({ page }) => {
  await open(page)
  await post(page, 5)
  await page.evaluate(() => {
    const root = document.querySelector('tosi-notification')!.shadowRoot!
    root.querySelector<HTMLElement>('.note .close')!.click()
  })
  await page.waitForTimeout(1100)
  const shown = await notes(page)
  expect(shown.map((n) => n.message)).toEqual([
    'note 1',
    'note 2',
    'note 3',
    'note 4',
  ])
  expect(shown.map((n) => n.stacked)).toEqual([false, true, false, false])
})

test('Dismiss all closes every note and fires each close callback', async ({
  page,
}) => {
  await open(page)
  const dismiss = page.locator('tosi-notification .dismiss-all')
  await post(page, 1)
  await expect(dismiss).toBeHidden()
  await post(page, 6)
  await expect(dismiss).toBeVisible()
  const front = (await notes(page))[0]
  const box = (await dismiss.boundingBox())!
  // centred below the bottom note
  expect(box.y).toBeGreaterThanOrEqual(front.bottom)
  expect(
    Math.abs(box.x + box.width / 2 - (front.left + front.right) / 2)
  ).toBeLessThan(2)
  await dismiss.click()
  await page.waitForTimeout(1100)
  expect(await notes(page)).toEqual([])
  const closed = await page.evaluate(() => (window as any).__closed.length)
  // all seven: each callback pushes onto whichever list is current when it fires
  expect(closed).toBe(7)
  await expect(dismiss).toBeHidden()
})
