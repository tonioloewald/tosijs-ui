import { test, expect } from '@playwright/test'

/*
Regression cover for #102 — the header and the body describing different columns.

The invariant every case here asserts is one thing: **the number of tracks in
`--tosi-table-grid-columns` equals the number of cells in the header row and in every body
row.** That is the property, not a proxy for it. When it breaks, CSS Grid auto-places the
surplus cells into IMPLICIT tracks which size to content — header text and body text differ,
so the two rows resolve those tracks to different widths and the columns visibly step apart.
That is what the reporting app saw, and why it reads as "header and body disagree" rather
than as a missing column.
*/

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
  await page.goto('/data-table/')
})

const HARNESS = `
  window.__mk = () => {
    const { tosiTable } = window.xinjsui
    const host = document.createElement('div')
    host.style.width = '800px'
    host.style.height = '200px'
    host.className = 'inflight-host'
    document.body.append(host)
    const table = tosiTable({
      columns: [
        { prop: 'a', width: 100 }, { prop: 'b', width: 100 },
        { prop: 'c', width: 100 }, { prop: 'd', width: 100 },
      ],
      array: Array.from({ length: 50 }, (_, i) => ({ a: i, b: i, c: i, d: i })),
    })
    host.append(table)
    return { host, table }
  }
  window.__settle = async (host) => {
    const deadline = performance.now() + 5000
    while (host.querySelectorAll('.td').length === 0 && performance.now() < deadline) {
      await new Promise((r) => requestAnimationFrame(r))
    }
    for (let i = 0; i < 3; i++) await new Promise((r) => requestAnimationFrame(r))
  }
  window.__shape = (host) => {
    const table = host.firstElementChild
    const grid = getComputedStyle(table)
      .getPropertyValue('--tosi-table-grid-columns').trim()
    const bodyRows = [...table.querySelectorAll('.tr')].filter(r => r.querySelector('.td'))
    return {
      tracks: grid ? grid.split(/\\s+/).length : 0,
      headerCells: table.querySelectorAll('.th').length,
      bodyCellCounts: [...new Set(bodyRows.map(r => r.querySelectorAll('.td').length))],
    }
  }
`

function agrees(shape: {
  tracks: number
  headerCells: number
  bodyCellCounts: number[]
}) {
  return (
    shape.headerCells === shape.tracks &&
    shape.bodyCellCounts.every((n) => n === shape.tracks)
  )
}

test('width recomputation during an in-flight columns change cannot tear the grid', async ({
  page,
}) => {
  const shape = await page.evaluate(async (harness) => {
    // eslint-disable-next-line no-new-func
    new Function(harness)()
    const { host, table } = (window as any).__mk()
    await (window as any).__settle(host)

    /*
    The exact sequence from the report. `set columns` updates the column list synchronously
    and queues the rebuild for the next frame; a resize or scroll handler — or a host reacting
    to a page-size change, which is what snowfox does — recomputes widths inside that window.
    The check runs BEFORE the frame lands, because that gap is the whole defect: afterwards it
    corrects itself and there is nothing to see.
    */
    const cols = table.columns.map((c: any) => ({ ...c }))
    cols[1].visible = false
    table.columns = cols
    table.setColumnWidths()

    return (window as any).__shape(host)
  }, HARNESS)

  expect(
    agrees(shape),
    `grid tracks must match cell counts mid-flight: ${JSON.stringify(shape)}`
  ).toBe(true)
})

test('the grid still agrees after the deferred render lands', async ({
  page,
}) => {
  const shape = await page.evaluate(async (harness) => {
    // eslint-disable-next-line no-new-func
    new Function(harness)()
    const { host, table } = (window as any).__mk()
    await (window as any).__settle(host)
    const cols = table.columns.map((c: any) => ({ ...c }))
    cols[1].visible = false
    table.columns = cols
    table.setColumnWidths()
    await (window as any).__settle(host)
    return (window as any).__shape(host)
  }, HARNESS)

  // Pinning the column set to the DOM must DEFER a change, never drop it.
  expect(shape.tracks).toBe(3)
  expect(
    agrees(shape),
    `grid tracks must match cell counts once settled: ${JSON.stringify(shape)}`
  ).toBe(true)
})

test('a resize still moves widths after the column set is pinned to the DOM', async ({
  page,
}) => {
  const grid = await page.evaluate(async (harness) => {
    // eslint-disable-next-line no-new-func
    new Function(harness)()
    const { host, table } = (window as any).__mk()
    await (window as any).__settle(host)
    /*
    Column objects are shared by reference between `_columns` and the rendered set, so a drag
    that mutates `column.width` must still take effect immediately — it is the SHAPE that is
    pinned to the DOM, not the widths. Without this, the fix for #102 would have broken column
    resizing, which is the obvious way to get it wrong.
    */
    table.columns[0].width = 250
    table.setColumnWidths()
    const table_ = host.firstElementChild as HTMLElement
    return getComputedStyle(table_)
      .getPropertyValue('--tosi-table-grid-columns')
      .trim()
  }, HARNESS)

  expect(grid.split(/\s+/)[0]).toBe('250px')
})
