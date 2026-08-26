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

test('an in-progress column drag survives the columns being reassigned under it', async ({
  page,
  browserName,
}) => {
  /*
  Skipped on firefox because column resizing does not work there AT ALL — see #107. A plain
  drag with no reassignment anywhere near it applies one step and then freezes (+60px -> 162,
  +120px -> still 162, against 210 then 270 on the other two engines), because firefox stops
  delivering mousemove after the first event. Asserting the mid-drag behaviour there would
  fail on a defect this test is not about, and skipping is honest where a lowered expectation
  would quietly bless it.
  */
  test.skip(
    browserName === 'firefox',
    'column resize is broken on firefox independently of this — #107'
  )
  /*
  The OTHER half of the reporting app's "resize funkiness", and a different defect from the
  torn grid above — this one is not a mismatch at all, it is a drag that silently stops working.

  `resizeColumn` used to capture the `ColumnOptions` object and mutate it for the whole drag.
  That object stops being the table's the instant a caller assigns a new `columns` array, and a
  page-size change — which is exactly what the reporting app reacts to — is a very likely thing
  to happen while someone is dragging a column edge. From then on the drag wrote widths into an
  orphan: pointer moving, column not moving, nothing reported anywhere.

  Verified pre-existing rather than assumed: with the `_renderedCols` fix reverted the drag is
  equally dead, so the two defects are independent and this one predates that change.
  */
  await page.evaluate(() => {
    const { tosiTable } = (window as any).xinjsui
    const host = document.createElement('div')
    host.id = 'rz'
    host.style.cssText =
      'width:800px;height:200px;position:fixed;top:0;left:0;z-index:9999;background:#fff'
    document.body.append(host)
    const table = tosiTable({
      columns: [
        { prop: 'a', width: 150 },
        { prop: 'b', width: 150 },
        { prop: 'c', width: 150 },
        { prop: 'd', width: 150 },
      ],
      array: Array.from({ length: 12 }, (_, i) => ({ a: i, b: i, c: i, d: i })),
    })
    host.append(table)
    ;(window as any).__rzTable = table
  })
  await page.waitForFunction(
    () => !!document.querySelector('#rz .th'),
    undefined,
    { timeout: 5000 }
  )

  const headerWidths = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('#rz .th')].map((e) =>
        Math.round(e.getBoundingClientRect().width)
      )
    )
  const edge = await page.evaluate(() => {
    const th = document.querySelector('#rz .th') as HTMLElement
    const r = th.getBoundingClientRect()
    return { x: r.right, y: r.top + r.height / 2 }
  })

  await page.mouse.move(edge.x, edge.y)
  await page.mouse.down()
  await page.mouse.move(edge.x + 60, edge.y, { steps: 5 })
  /*
  "It moved", not "it moved 60px". The pointer travels the same distance on every engine and
  they still disagree about the result: chromium reaches 210 where firefox reaches 162, because
  the resize hotspot is hit-tested with an epsilon and the two pick the drag up at slightly
  different points. Pinning the pixel pins that difference rather than the behaviour — which is
  what the comment below already says about the second assertion, and was no less true here.
  */
  const during = (await headerWidths())[0]
  expect(during, 'the drag moves the column at all').toBeGreaterThan(150)

  // The host reassigns columns MID-DRAG, as a page-size handler would.
  await page.evaluate(() => {
    ;(window as any).__rzTable.columns = [
      { prop: 'a', width: 150 },
      { prop: 'b', width: 150 },
      { prop: 'c', width: 150, visible: false },
      { prop: 'd', width: 150 },
    ]
  })
  await page.waitForFunction(
    () => document.querySelectorAll('#rz .th').length === 3,
    undefined,
    { timeout: 5000 }
  )

  await page.mouse.move(edge.x + 120, edge.y, { steps: 5 })
  const after = await headerWidths()
  await page.mouse.up()

  /*
  The assertion is that the drag is ALIVE, not that it reaches a particular pixel. The
  reassignment legitimately reset the width to 150, so the drag rebases and grows from there —
  pinning an exact total would be pinning the rebase arithmetic rather than the property that
  matters, which is simply that the pointer still moves the column.
  */
  expect(
    after[0],
    `the drag must keep working after the reassignment: ${JSON.stringify(
      after
    )}`
  ).toBeGreaterThan(150)
  /*
  And it must keep TRACKING, not merely be non-zero. The reassignment resets the width to 150,
  so a drag that died at that exact moment would also read 150 — the failing state and a
  "barely moved" state are only one pixel apart, and this is the assertion that separates them.
  */
  expect(
    after[0],
    `the drag froze at the width the reassignment set: ${JSON.stringify(after)}`
  ).toBeGreaterThan(151)
})
