import { test, expect } from '@playwright/test'

/*
The pages' own inline doc tests are OFF for this file — a doc page under test is also a page
RUNNING tests, and that work competes with whatever the spec is waiting for.
*/
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
})

const build = `
  const { tosiTable } = window.xinjsui
  const host = document.createElement('div')
  host.style.width = WIDTH
  host.id = 'fw-host'
  document.body.append(host)
  const table = tosiTable({
    columns: COLUMNS,
    array: [{ a: 'one', b: 'two', c: 'three' }],
  })
  if (FULL) table.setAttribute('full-width-header', '')
  host.append(table)
`

async function measure(
  page: any,
  { width, full, columns }: { width: string; full: boolean; columns: string }
) {
  return page.evaluate(
    async ({ width, full, columns, build }: any) => {
      document.querySelector('#fw-host')?.remove()
      // eslint-disable-next-line no-new-func
      new Function(
        build
          .replace('WIDTH', JSON.stringify(width))
          .replace('COLUMNS', columns)
          .replace('FULL', String(full))
      )()
      /*
      Wait for the ROWS, not for two frames. Two rAFs is a proxy for "the virtual list has
      stamped its rows", and on firefox it is the wrong proxy — every assertion here came back
      an empty array while chromium and webkit passed. Poll the condition the test actually
      depends on.
      */
      const host = document.querySelector('#fw-host') as HTMLElement
      const deadline = performance.now() + 5000
      while (
        host.querySelectorAll('.td').length === 0 &&
        performance.now() < deadline
      ) {
        await new Promise((r) => requestAnimationFrame(r))
      }
      await new Promise((r) => requestAnimationFrame(r))
      const table = host.firstElementChild as HTMLElement
      const cells = [...table.querySelectorAll('.td')] as HTMLElement[]
      if (cells.length === 0) throw new Error('no rows stamped within 5s')
      const headCells = [...table.querySelectorAll('.th')] as HTMLElement[]
      const row = cells[0]?.parentElement as HTMLElement
      const headRow = headCells[0]?.parentElement as HTMLElement
      const w = (el: HTMLElement | null) =>
        el ? el.getBoundingClientRect().width : 0
      return {
        hostWidth: w(host),
        rowWidth: w(row),
        headRowWidth: w(headRow),
        cellWidths: cells.map((c) => Math.round(w(c))),
        headWidths: headCells.map((c) => Math.round(w(c))),
      }
    },
    { width, full, columns, build }
  )
}

const THREE_100 = `[{prop:'a',width:100},{prop:'b',width:100},{prop:'c',width:100}]`

test('without the attribute a narrow table leaves the leftover space blank', async ({
  page,
}) => {
  await page.goto('/data-table/')
  const m = await measure(page, {
    width: '600px',
    full: false,
    columns: THREE_100,
  })
  // 300px of columns in a 600px box: the row stops short, which is the blank strip.
  expect(m.cellWidths).toEqual([100, 100, 100])
  expect(m.rowWidth).toBeLessThan(m.hostWidth - 100)
  expect(m.headWidths).toEqual(m.cellWidths)
})

test('full-width-header gives the leftover space to the last unpinned column', async ({
  page,
}) => {
  await page.goto('/data-table/')
  const m = await measure(page, {
    width: '600px',
    full: true,
    columns: THREE_100,
  })
  // The first two keep their widths; the last absorbs the rest and the row fills the box.
  expect(m.cellWidths.slice(0, 2)).toEqual([100, 100])
  expect(m.cellWidths[2]).toBeGreaterThan(300)
  expect(Math.round(m.rowWidth)).toBe(Math.round(m.hostWidth))
  // The name says header: it has to stretch WITH the body, not next to it. A header and a
  // body describing different columns is the failure class of #102.
  expect(m.headWidths).toEqual(m.cellWidths)
  expect(Math.round(m.headRowWidth)).toBe(Math.round(m.rowWidth))
})

test('a column never shrinks below its set width when the columns overflow', async ({
  page,
}) => {
  await page.goto('/data-table/')
  const m = await measure(page, {
    width: '200px',
    full: true,
    columns: THREE_100,
  })
  /*
  The regression a bare `1fr` would cause: 300px of columns in a 200px box, and the flexible
  column collapses — silently undoing a width the user set by dragging. `minmax(100px, 1fr)`
  keeps the set width as a floor, so the table overflows and scrolls instead.
  */
  expect(m.cellWidths).toEqual([100, 100, 100])
  expect(m.rowWidth).toBeGreaterThan(m.hostWidth)
  expect(m.headWidths).toEqual(m.cellWidths)
})

test('a right-pinned column is not the one that stretches', async ({
  page,
}) => {
  await page.goto('/data-table/')
  const m = await measure(page, {
    width: '600px',
    full: true,
    columns: `[{prop:'a',width:100},{prop:'b',width:100},{prop:'c',width:100,pinned:'right'}]`,
  })
  /*
  Right-pinned columns sit against the right edge by definition, so growing one would push the
  leftover space back into the MIDDLE of the table. The last unpinned column takes it instead.
  */
  expect(m.cellWidths[0]).toBe(100)
  expect(m.cellWidths[1]).toBeGreaterThan(300)
  expect(m.cellWidths[2]).toBe(100)
  expect(m.headWidths).toEqual(m.cellWidths)
})
