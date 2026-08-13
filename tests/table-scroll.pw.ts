import { test, expect } from '@playwright/test'

/*
Scroll stability across re-render (#67).

`render()` empties the table and builds a brand-new `.scroll-area`, so the element the user
was scrolling stops existing and `scrollTop` resets to 0 — on ANY re-render: a sort, a
`filter` change, a `visibleGroupedRowIds` toggle. In a long table that throws the reader back
to the top every time, and for a sort it is close to the opposite of the intent ("reorder
what I am looking at").

These drive the real thing through a real scroll container rather than unit-testing the
arithmetic, because the failure is entirely about layout: the virtualising `listBinding`
sizes its spacer a frame late, so a restore that looks correct in isolation gets silently
CLAMPED to 0 against a container that is momentarily one viewport tall.
*/

const ROWS = 400
const ROW_HEIGHT = 40

/** Build a tall table pinned above the doc-site's own chrome (see segmented.pw.ts). */
async function makeTable(page: any, opts: { group?: boolean } = {}) {
  await page.goto('/')
  await page.waitForFunction(() => !!customElements.get('tosi-table'))
  await page.evaluate(
    ({ ROWS, ROW_HEIGHT, group }: any) => {
      const table = document.createElement('tosi-table') as any
      table.id = 'scroller'
      table.array = Array.from({ length: ROWS }, (_, i) => ({
        id: i,
        group: `g${Math.floor(i / 10)}`,
        name: `row ${i}`,
      }))
      table.columns = [
        { prop: 'group', width: 120 },
        { prop: 'name', width: 200 },
        { prop: 'id', width: 80 },
      ]
      table.rowHeight = ROW_HEIGHT
      if (group) table.rowGroupId = (row: any) => row.group
      table.style.position = 'fixed'
      table.style.top = '0'
      table.style.left = '0'
      table.style.zIndex = '2000'
      table.style.height = '400px'
      table.style.width = '500px'
      table.style.background = 'white'
      document.body.appendChild(table)
    },
    { ROWS, ROW_HEIGHT, group: opts.group ?? false }
  )
  // Wait for the virtual spacer to exist, i.e. the table is genuinely scrollable.
  await page.waitForFunction(() => {
    const area = document
      .getElementById('scroller')
      ?.querySelector('[part="visibleRows"]') as HTMLElement
    return !!area && area.scrollHeight > area.clientHeight * 2
  })
}

const scrollTo = (page: any, top: number) =>
  page.evaluate((top: number) => {
    const area = document
      .getElementById('scroller')!
      .querySelector('[part="visibleRows"]') as HTMLElement
    area.scrollTop = top
  }, top)

const scrollTop = (page: any) =>
  page.evaluate(
    () =>
      (
        document
          .getElementById('scroller')!
          .querySelector('[part="visibleRows"]') as HTMLElement
      ).scrollTop
  )

/** The `name` of the topmost row intersecting the scroll viewport. */
const topRowName = (page: any) =>
  page.evaluate(() => {
    const table = document.getElementById('scroller')!
    const area = table.querySelector('[part="visibleRows"]') as HTMLElement
    const areaTop = area.getBoundingClientRect().top
    for (const row of [...table.querySelectorAll('.tr')]) {
      // The HEADER is a `.tr` too, and it is sticky — so it always intersects the top of
      // the viewport and would answer this question identically at every scroll position.
      // Four of these tests passed vacuously until it was excluded.
      if (row.closest('.thead') || row.classList.contains('row-pinned'))
        continue
      const rect = row.getBoundingClientRect()
      if (rect.bottom > areaTop + 1 && rect.height > 0) {
        return (row.children[1] as HTMLElement)?.textContent ?? null
      }
    }
    return null
  })

/**
 * Wait for the component's own restore to land.
 *
 * Deliberately a POLL, not a sleep. A fixed delay encodes a guess about how fast the machine
 * is, and under three browser engines in parallel that guess is wrong — which is precisely
 * the flake that `segmented.pw.ts` had. Polling asserts the outcome ("the reader ends up on
 * this row") without asserting how many frames it took to get there.
 */
const expectTopRow = async (page: any, name: string | null) =>
  expect.poll(() => topRowName(page), { timeout: 5000 }).toBe(name)

/** For asserting a NON-event (scroll was not restored), where polling would pass on the
 * transient zero that exists before any restore could run. */
const settle = (page: any) => page.waitForTimeout(1000)

test('a filter change keeps the reader where they were', async ({ page }) => {
  await makeTable(page)
  await scrollTo(page, 4000)
  await settle(page)
  const before = await topRowName(page)
  expect(before).not.toBe(null)

  // A filter that removes nothing: the view has no reason to move at all.
  await page.evaluate(() => {
    ;(document.getElementById('scroller') as any).filter = (rows: any[]) =>
      rows.filter(() => true)
  })
  await settle(page)

  await expectTopRow(page, before)
  expect(await scrollTop(page)).toBeGreaterThan(3000)
})

test('rows removed ABOVE the reader do not shove the view down', async ({
  page,
}) => {
  await makeTable(page)
  await scrollTo(page, 4000)
  await settle(page)
  const before = await topRowName(page)

  // Drop 50 rows from above the viewport. Raw scrollTop preservation would leave the
  // reader looking at completely different rows; anchoring keeps their row in place.
  await page.evaluate(() => {
    ;(document.getElementById('scroller') as any).filter = (rows: any[]) =>
      rows.filter((r: any) => r.id >= 50)
  })
  await expectTopRow(page, before)
})

test('expanding a group above the reader keeps their row put', async ({
  page,
}) => {
  // The motivating case from #67: toggling `visibleGroupedRowIds` re-admits filtered-out
  // members of a group, inserting rows — and the scroll jumped to 0.
  await makeTable(page, { group: true })
  await page.evaluate(() => {
    ;(document.getElementById('scroller') as any).filter = (rows: any[]) =>
      rows.filter((r: any) => r.id % 10 === 0)
  })
  await settle(page)
  await scrollTo(page, 600)
  await settle(page)
  const before = await topRowName(page)
  expect(before).not.toBe(null)

  await page.evaluate(() => {
    ;(document.getElementById('scroller') as any).visibleGroupedRowIds = ['g0']
  })
  await expectTopRow(page, before)
})

test('sorting keeps the reader on the row they were looking at', async ({
  page,
}) => {
  await makeTable(page)
  await scrollTo(page, 4000)
  await settle(page)
  const before = await topRowName(page)

  await page.evaluate(() => {
    ;(document.getElementById('scroller') as any).sort = (a: any, b: any) =>
      b.id - a.id
  })
  // The row is still on screen — a sort reorders what you are looking at, it does not
  // teleport you to row 0.
  await expectTopRow(page, before)
})

test('preserveScroll={false} restores the old reset-to-top behaviour', async ({
  page,
}) => {
  await makeTable(page)
  await page.evaluate(() => {
    ;(document.getElementById('scroller') as any).preserveScroll = false
  })
  await scrollTo(page, 4000)
  await settle(page)

  await page.evaluate(() => {
    ;(document.getElementById('scroller') as any).filter = (rows: any[]) =>
      rows.filter(() => true)
  })
  await settle(page)

  expect(await scrollTop(page)).toBe(0)
})
