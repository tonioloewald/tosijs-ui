import { test, expect } from '@playwright/test'

/*
Row detail (#220): a row expands to an element under it.

Driven through a real scroll container, because everything that can go wrong here is layout:
the detail has to span the visible width while the columns scroll under it, and a row that
changes height must not move out from under the pointer in a list that places its rows by
interpolation.
*/

const ROWS = 2000
const ROW_HEIGHT = 40

async function makeTable(page: any) {
  await page.goto('/')
  await page.waitForFunction(() => !!customElements.get('tosi-table'))
  await page.evaluate(
    ({ ROWS, ROW_HEIGHT }: any) => {
      const table = document.createElement('tosi-table') as any
      table.id = 'detailed'
      table.array = Array.from({ length: ROWS }, (_, i) => ({
        id: `r${i}`,
        name: `row ${i}`,
      }))
      table.columns = [
        { prop: 'x', width: 40, expander: true, pinned: 'left' },
        { prop: 'name', width: 200 },
        ...Array.from({ length: 8 }, (_, i) => ({
          prop: 'name',
          name: `extra${i}`,
          width: 200,
        })),
      ]
      table.rowHeight = ROW_HEIGHT
      table.select = true
      table.rowId = (row: any) => row.id
      table.rowHasDetail = (row: any) => row.id !== 'r1'
      table.rowDetail = (row: any) => {
        const el = document.createElement('div')
        el.className = 'my-detail'
        el.style.height = '120px'
        const field = document.createElement('input')
        field.value = row.name
        el.append(field)
        return el
      }
      Object.assign(table.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        zIndex: '2000',
        height: '400px',
        width: '500px',
        background: 'white',
      })
      document.body.appendChild(table)
    },
    { ROWS, ROW_HEIGHT }
  )
  await page.waitForFunction(() => {
    const area = document.querySelector('#detailed .scroll-area')
    return !!area && area.scrollHeight > 10_000
  })
}

const rowTop = (page: any, name: string) =>
  page.evaluate((name: string) => {
    const rows = [...document.querySelectorAll('#detailed .scroll-area > .tr')]
    const row = rows.find((r) => r.children[1]?.textContent === name)
    return row ? row.getBoundingClientRect().top : null
  }, name)

test('the toggle expands a row; the detail spans the view and stays put sideways', async ({
  page,
}) => {
  await makeTable(page)
  const toggle = page.locator('#detailed .tr:has-text("row 2") .row-expander')
  await toggle.first().click()
  const detail = page.locator('#detailed .tr-detail')
  await expect(detail).toHaveCount(1)
  await expect(toggle.first()).toHaveAttribute('aria-expanded', 'true')

  const box = async () =>
    page.evaluate(() => {
      const area = document.querySelector('#detailed .scroll-area')!
      const d = document.querySelector('#detailed .tr-detail')!
      const a = area.getBoundingClientRect()
      const r = d.getBoundingClientRect()
      return {
        left: Math.round(r.left - a.left),
        width: Math.round(r.width),
        clientWidth: area.clientWidth,
        height: Math.round(r.height),
      }
    })
  const before = await box()
  expect(before.left).toBe(0)
  expect(before.width).toBe(before.clientWidth)
  expect(before.height).toBeGreaterThanOrEqual(120)

  await page.evaluate(() => {
    document.querySelector('#detailed .scroll-area')!.scrollLeft = 600
  })
  await page.waitForTimeout(100)
  const after = await box()
  expect(after.left).toBe(0)
  expect(after.width).toBe(after.clientWidth)

  // Clicking the toggle or inside the detail selects nothing.
  await page.locator('#detailed .my-detail input').click()
  expect(
    await page.evaluate(
      () => (document.querySelector('#detailed') as any).selectedRows.length
    )
  ).toBe(0)

  // A row `rowHasDetail` rejects has no toggle to press.
  await expect(
    page.locator('#detailed .tr:has-text("row 1") .row-expander').first()
  ).toBeHidden()
})

test('a toggled row keeps its place, wherever the table is scrolled', async ({
  page,
}) => {
  await makeTable(page)
  for (const fraction of [0, 0.5, 0.97]) {
    const name = await page.evaluate(async (fraction: number) => {
      const area = document.querySelector(
        '#detailed .scroll-area'
      ) as HTMLElement
      area.scrollTop = (area.scrollHeight - area.clientHeight) * fraction
      await new Promise((r) => setTimeout(r, 300))
      const top = area.getBoundingClientRect().top
      const rows = [...area.querySelectorAll(':scope > .tr')] as HTMLElement[]
      // a row comfortably inside the view
      const row = rows.find((r) => r.getBoundingClientRect().top > top + 100)!
      return row.children[1].textContent!
    }, fraction)
    const before = await rowTop(page, name)
    await page.evaluate((name: string) => {
      const table = document.querySelector('#detailed') as any
      table.toggleRowDetail(table.array.find((r: any) => r.name === name))
    }, name)
    await page.waitForTimeout(300)
    const open = await rowTop(page, name)
    expect(Math.abs(open! - before!), `expand at ${fraction}`).toBeLessThan(2)
    await page.evaluate((name: string) => {
      const table = document.querySelector('#detailed') as any
      table.toggleRowDetail(table.array.find((r: any) => r.name === name))
    }, name)
    await page.waitForTimeout(300)
    const closed = await rowTop(page, name)
    expect(Math.abs(closed! - before!), `collapse at ${fraction}`).toBeLessThan(
      2
    )
  }
})

test('expansion survives scrolling away, a sort, and new row objects', async ({
  page,
}) => {
  await makeTable(page)
  await page.evaluate(() => {
    const table = document.querySelector('#detailed') as any
    table.expandedRowIds = ['r3']
  })
  const field = page.locator('#detailed .my-detail input')
  await field.fill('typed by the reader')

  // Scroll far away and back: the row is destroyed and re-created, its detail is not.
  // Let a frame pass first. fill() leaves Firefox a pending scroll-the-caret-into-view,
  // which overrides a scrollTop written in the same task and snaps the area back (tosijs
  // #3333). A reader always has frames between typing and scrolling.
  await page.evaluate(async () => {
    const area = document.querySelector('#detailed .scroll-area') as HTMLElement
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r))
    )
    area.scrollTop = 20_000
    await new Promise((r) => setTimeout(r, 300))
  })
  await expect(page.locator('#detailed .tr-detail')).toHaveCount(0)
  await page.evaluate(async () => {
    const area = document.querySelector('#detailed .scroll-area') as HTMLElement
    area.scrollTop = 0
    await new Promise((r) => setTimeout(r, 300))
  })
  await expect(field).toHaveValue('typed by the reader')

  // A re-render (new columns) keeps it open.
  await page.evaluate(() => {
    const table = document.querySelector('#detailed') as any
    table.columns = table.columns.slice(0, 4)
  })
  await expect(page.locator('#detailed .tr-detail')).toHaveCount(1)

  // A sort that keeps the row in view, then a filter that keeps it at all.
  await page.evaluate(() => {
    const table = document.querySelector('#detailed') as any
    table.sort = (a: any, b: any) =>
      Number(a.id.slice(1)) < 10 && Number(b.id.slice(1)) < 10
        ? Number(b.id.slice(1)) - Number(a.id.slice(1))
        : Number(a.id.slice(1)) - Number(b.id.slice(1))
  })
  await expect(page.locator('#detailed .tr-detail')).toHaveCount(1)
  await expect(field).toHaveValue('typed by the reader')
  await page.evaluate(() => {
    const table = document.querySelector('#detailed') as any
    table.filter = (rows: any[]) => rows.filter((r) => r.id.endsWith('3'))
  })
  await expect(page.locator('#detailed .tr-detail')).toHaveCount(1)
  await expect(field).toHaveValue('typed by the reader')
  await page.evaluate(() => {
    const table = document.querySelector('#detailed') as any
    table.filter = (rows: any[]) => rows
    table.sort = undefined
  })
  await expect(page.locator('#detailed .tr-detail')).toHaveCount(1)

  // New row objects with the same ids: still expanded, and rebuilt from the new data.
  await page.evaluate(() => {
    const table = document.querySelector('#detailed') as any
    table.array = table.array.map((r: any) => ({ ...r, name: r.name + '!' }))
  })
  await expect(page.locator('#detailed .my-detail input')).toHaveValue('row 3!')
  expect(
    await page.evaluate(
      () => (document.querySelector('#detailed') as any).expandedRowIds
    )
  ).toEqual(['r3'])
})

test('keyboard: Enter on the toggle cell expands; Tab from the last cell enters the detail', async ({
  page,
}) => {
  await makeTable(page)
  await page.evaluate(() => {
    const table = document.querySelector('#detailed') as any
    table.columns = table.columns.slice(0, 2)
  })
  await page.waitForTimeout(200)
  const cell = page.locator('#detailed .tr:has-text("row 2") .td').first()
  await cell.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#detailed .tr-detail')).toHaveCount(1)
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Tab')
  await expect(page.locator('#detailed .my-detail input')).toBeFocused()
  // Arrow keys inside the detail belong to the input, not to the grid.
  await page.keyboard.press('ArrowDown')
  await expect(page.locator('#detailed .my-detail input')).toBeFocused()
})

test('a press inside a detail at a column edge does not resize the column', async ({
  page,
}) => {
  await makeTable(page)
  await page.evaluate(() => {
    const table = document.querySelector('#detailed') as any
    table.expandedRowIds = ['r2']
  })
  const detail = page.locator('#detailed .tr-detail')
  await expect(detail).toHaveCount(1)
  const box = (await detail.boundingBox())!
  const area = (await page.locator('#detailed .scroll-area').boundingBox())!
  // x = 240 is the edge between the 40px toggle column and the 200px name column
  const x = area.x + 240
  const y = box.y + box.height - 20
  const widths = () =>
    page.evaluate(() =>
      (document.querySelector('#detailed') as any).columns.map(
        (c: any) => c.width
      )
    )
  const before = await widths()
  await page.mouse.move(x, y)
  expect(
    await page.evaluate(
      () => (document.querySelector('#detailed') as HTMLElement).style.cursor
    )
  ).toBe('')
  await page.mouse.down()
  await page.mouse.move(x + 60, y, { steps: 4 })
  await page.mouse.up()
  expect(await widths()).toEqual(before)

  // The same press on a cell row DOES find the edge: the guard is the detail, not the x.
  const row = (await page
    .locator('#detailed .scroll-area > .tr')
    .first()
    .boundingBox())!
  await page.mouse.move(x, row.y + 10)
  expect(
    await page.evaluate(
      () => (document.querySelector('#detailed') as HTMLElement).style.cursor
    )
  ).toBe('col-resize')
})

test('a table inside a detail keeps its own selection', async ({ page }) => {
  await makeTable(page)
  await page.evaluate(() => {
    const outer = document.querySelector('#detailed') as any
    outer.rowDetail = () => {
      const inner = document.createElement('tosi-table') as any
      inner.className = 'inner'
      inner.array = [
        { k: 'a', v: 1 },
        { k: 'b', v: 2 },
      ]
      inner.columns = [
        { prop: 'k', width: 80, pinned: 'left' },
        { prop: 'v', width: 80 },
      ]
      inner.rowHeight = 0
      inner.select = true
      inner.style.height = '100px'
      return inner
    }
    outer.expandedRowIds = ['r2']
  })
  const inner = page.locator('#detailed .inner')
  await expect(inner.locator('.td')).toHaveCount(4)
  const marks = () =>
    page.evaluate(() => {
      const inner = document.querySelector('#detailed .inner')!
      return [...inner.querySelectorAll('.tr')].map((r) =>
        r.hasAttribute('aria-selected')
      )
    })
  await inner.locator('.td', { hasText: 'b' }).click()
  // header, a, b
  expect(await marks()).toEqual([false, false, true])
  // select the owning outer row, then another one
  await page
    .locator('#detailed .scroll-area > .tr > .td', { hasText: 'row 2' })
    .first()
    .click()
  expect(await marks()).toEqual([false, false, true])
  await page
    .locator('#detailed .scroll-area > .tr > .td', { hasText: 'row 0' })
    .first()
    .click()
  expect(await marks()).toEqual([false, false, true])
  expect(
    await page.evaluate(
      () => (document.querySelector('#detailed') as any).selectedRows.length
    )
  ).toBe(1)
  // the inner pinned cell keeps the inner table's sticky offset
  expect(
    await page.evaluate(
      () =>
        (
          document.querySelector(
            '#detailed .inner .td.col-pinned'
          ) as HTMLElement
        ).style.left
    )
  ).toBe('0px')
})

test('pinned rows have no toggle; ids given before rowId still apply', async ({
  page,
}) => {
  await page.goto('/')
  await page.waitForFunction(() => !!customElements.get('tosi-table'))
  await page.evaluate(() => {
    const { tosiTable } = (window as any).xinjsui
    const rows = Array.from({ length: 50 }, (_, i) => ({
      id: `r${i}`,
      name: `row ${i}`,
    }))
    const table = tosiTable({
      id: 'pinned',
      rowHeight: 30,
      // deliberately before rowId: a creator assigns in key order
      expandedRowIds: ['r1', 'r4'],
      rowId: (row: any) => row.id,
      rowDetail: (row: any) => {
        if (row.id === 'r4') return null
        const el = document.createElement('div')
        el.textContent = 'detail of ' + row.name
        return el
      },
      array: rows,
      pinnedTopRows: [{ id: 'top', name: 'totals' }],
      columns: [
        { prop: 'x', width: 40, expander: true },
        { prop: 'name', width: 200 },
      ],
      style: {
        position: 'fixed',
        top: '0',
        left: '0',
        zIndex: '2000',
        height: '300px',
        width: '400px',
        background: 'white',
      },
    })
    document.body.append(table)
  })
  await expect(page.locator('#pinned .tr-detail')).toHaveText('detail of row 1')
  await expect(
    page.locator('#pinned .tbody-pinned-top .row-expander')
  ).toHaveCount(0)
  const state = await page.evaluate(() => {
    const table = document.querySelector('#pinned') as any
    let events = 0
    table.addEventListener('rowexpand', () => (events += 1))
    table.toggleRowDetail(table.pinnedTopRows[0])
    return {
      events,
      pinnedExpanded: table.isRowExpanded(table.pinnedTopRows[0]),
      // r4's detail was null, so it is not left marked as expanded
      ids: table.expandedRowIds,
    }
  })
  expect(state).toEqual({ events: 0, pinnedExpanded: false, ids: ['r1'] })
})

test('without rowId, expansion follows the row object through a new array', async ({
  page,
}) => {
  await makeTable(page)
  const state = await page.evaluate(async () => {
    const table = document.querySelector('#detailed') as any
    const tick = () => new Promise((r) => setTimeout(r, 200))
    table.rowId = null
    await tick()
    const [, , keep, drop] = table.array
    table.toggleRowDetail(keep)
    table.toggleRowDetail(drop)
    // the same objects, less one: the kept row stays open, the dropped one is forgotten
    table.array = table.array.filter((r: any) => r !== drop)
    await tick()
    const afterFilter = {
      keep: table.isRowExpanded(keep),
      drop: table.isRowExpanded(drop),
      shown: table.querySelectorAll('.tr-detail').length,
    }
    // a row rowHasDetail now rules out can still be collapsed
    table.rowHasDetail = () => false
    table.toggleRowDetail(keep)
    const collapsed = table.isRowExpanded(keep)
    table.toggleRowDetail(keep)
    return { afterFilter, collapsed, reopened: table.isRowExpanded(keep) }
  })
  expect(state).toEqual({
    afterFilter: { keep: true, drop: false, shown: 1 },
    collapsed: false,
    reopened: false,
  })
})
