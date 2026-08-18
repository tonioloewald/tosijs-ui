import { test, expect } from '@playwright/test'

/*
A column that is both PINNED and listed in `nonRepeatingGroupedRowCells` (tosijs-ui#83).

`visibility: hidden` suppressed everything the cell paints — including the opaque background
`.col-pinned` exists to provide — so on every row but the first of its group, horizontally
scrolled cells showed through the sticky column AND were clickable there. Two failures from
one rule: a visual hole, and a hit-testing hole.

Driven through a real scrolled table because both halves are layout facts. A unit test on the
styleSpec would assert the rule we wrote, not the rendering it produces.
*/

async function makeGroupedTable(page: any) {
  await page.goto('/')
  await page.waitForFunction(() => !!customElements.get('tosi-table'))
  await page.evaluate(() => {
    const table = document.createElement('tosi-table') as any
    table.id = 'pinned'
    table.array = Array.from({ length: 60 }, (_, i) => ({
      invoice: `INV-${Math.floor(i / 4)}`,
      sku: `sku ${i}`,
      qty: i,
    }))
    table.columns = [
      { prop: 'invoice', width: 140, pinned: 'left' },
      { prop: 'sku', width: 200 },
      { prop: 'qty', width: 100 },
      ...Array.from({ length: 8 }, (_, i) => ({
        prop: 'sku',
        name: `wide${i}`,
        width: 220,
      })),
    ]
    table.rowHeight = 32
    table.nonRepeatingGroupedRowCells = ['invoice']
    Object.assign(table.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: '2000',
      height: '400px',
      width: '700px',
      background: '#fff',
    })
    document.body.appendChild(table)
  })
  await page.waitForFunction(() => {
    const t = document.getElementById('pinned')
    return !!t?.querySelector('.tr:not(.thead .tr) .col-pinned')
  })
  await page.waitForTimeout(400)
}

test('REGRESSION: a repeated cell in a pinned column stays opaque and stays hit-testable', async ({
  page,
}) => {
  await makeGroupedTable(page)

  const probe = await page.evaluate(() => {
    const table = document.getElementById('pinned')!
    const area = table.querySelector('[part="visibleRows"]') as HTMLElement
    area.scrollLeft = 500 // slide the unpinned columns UNDER the pinned one
    // A row that is NOT first of its group — the one whose pinned cell is a "repeat".
    const rows = [...table.querySelectorAll('.tr')].filter(
      (r) => !r.closest('.thead') && !r.classList.contains('row-pinned')
    ) as HTMLElement[]
    const repeat = rows.find(
      (r) => !r.classList.contains('table-cluster-first')
    )!
    const cell = repeat.querySelector('.col-pinned') as HTMLElement
    const style = getComputedStyle(cell)
    const box = cell.getBoundingClientRect()
    const hit = document.elementFromPoint(
      box.left + 8,
      box.top + box.height / 2
    )
    return {
      visibility: style.visibility,
      background: style.backgroundColor,
      // Does a click at the pinned cell land ON it, or fall through to a scrolled cell?
      hitIsSelfOrChild: cell === hit || cell.contains(hit as Node),
      hitClasses: (hit as HTMLElement)?.className ?? 'none',
    }
  })

  // Painting at all is what provides the opaque background.
  expect(probe.visibility).not.toBe('hidden')
  // …and it must not be see-through.
  expect(probe.background).not.toBe('rgba(0, 0, 0, 0)')
  expect(probe.background).not.toBe('transparent')
  // The hit-testing half of #83: the sticky cell owns its own area.
  expect(probe.hitIsSelfOrChild).toBe(true)
})
