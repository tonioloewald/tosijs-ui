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
  const named = (m: string) => shown.find((n) => n.message === m)!
  // the three newest stay in view, newest on top; the third newest fronts the stack
  const [front, middle, top] = ['note 5', 'note 6', 'note 7'].map(named)
  expect([front, middle, top].every((n) => !n.stacked && n.visible)).toBe(true)
  expect(middle.bottom).toBeLessThanOrEqual(front.top)
  expect(top.bottom).toBeLessThanOrEqual(middle.top)
  // older ones sit behind it, newest first
  const behind = ['note 4', 'note 3', 'note 2', 'note 1', 'note 0'].map(named)
  // three peek out underneath, straight down, each half as far as the last; the rest hidden
  expect(behind.map((n) => n.stacked)).toEqual([true, true, true, true, true])
  expect(behind.map((n) => n.visible)).toEqual([true, true, true, false, false])
  expect(behind.every((n) => n.inert)).toBe(true)
  const drops = behind
    .slice(0, 3)
    .map((n) => Math.round(n.bottom - front.bottom))
  expect(drops).toEqual([16, 24, 28])
  for (const n of behind.slice(0, 3)) expect(n.left).toBe(front.left)
  // Dismiss all rides over the edges peeking out under the front card
  const button = (await page
    .locator('tosi-notification .dismiss-all')
    .boundingBox())!
  expect(button.y).toBeGreaterThanOrEqual(front.bottom)
  expect(button.y).toBeLessThan(behind[2].bottom)
  const onTop = await page.evaluate(
    ({ x, y }) => {
      const root = document.querySelector('tosi-notification')!.shadowRoot!
      return root.elementFromPoint(x, y)?.className
    },
    { x: button.x + button.width / 2, y: button.y + button.height / 2 }
  )
  expect(onTop).toBe('dismiss-all')
})

test("Dismiss all is outlined in the most severe notification's colour", async ({
  page,
}) => {
  await open(page)
  const accent = () =>
    page.evaluate(() =>
      getComputedStyle(
        document
          .querySelector('tosi-notification')!
          .shadowRoot!.querySelector('.dismiss-all')!
      )
        .getPropertyValue('--notification-accent-color')
        .trim()
    )
  await page.evaluate(() => {
    const { postNotification } = (window as any).xinjsui
    postNotification({ message: 'a', type: 'log' })
    postNotification({ message: 'b', type: 'success' })
  })
  expect(await accent()).toBe('green')
  // red once an error is open, even buried in the stack where it cannot be seen
  await page.evaluate(() => {
    const { postNotification } = (window as any).xinjsui
    for (const m of ['x0', 'x1', 'x2']) postNotification({ message: m })
    postNotification({ message: 'boom', type: 'error' })
    // three in view and three ahead of it in the stack, so the error is hidden
    for (const m of ['y0', 'y1', 'y2', 'y3', 'y4', 'y5'])
      postNotification({ message: m })
  })
  const buried = await page.evaluate(() =>
    document
      .querySelector('tosi-notification')!
      .shadowRoot!.querySelector('.note.error')!
      .classList.contains('buried')
  )
  expect(buried).toBe(true)
  expect(await accent()).toBe('red')
})

test('closing the front card brings the next one forward', async ({ page }) => {
  await open(page)
  await post(page, 5)
  // notes 2–4 are in view, note 2 fronting the stack with notes 1 and 0 behind it
  await page.evaluate(() => {
    const root = document.querySelector('tosi-notification')!.shadowRoot!
    const front = [...root.querySelectorAll<HTMLElement>('.note')].find(
      (n) => n.querySelector('.text')!.textContent === 'note 2'
    )!
    front.querySelector<HTMLElement>('.close')!.click()
  })
  await page.waitForTimeout(1100)
  const shown = await notes(page)
  expect(shown.map((n) => n.message)).toEqual([
    'note 0',
    'note 1',
    'note 3',
    'note 4',
  ])
  // note 1, the newest behind it, came forward
  expect(shown.map((n) => n.stacked)).toEqual([true, false, false, false])
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
  const front = (await notes(page)).find((n) => !n.stacked)!
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
