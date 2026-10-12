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
  await page.evaluate(async () => {
    const area = document.querySelector('#detailed .scroll-area') as HTMLElement
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
