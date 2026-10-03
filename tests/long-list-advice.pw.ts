import { test, expect } from '@playwright/test'

/*
tosijs 1.10.7 warns once per list binding of more than 10 items with neither `virtual` nor a
`nonVirtualReason` (virta #2842). <tosi-table>'s pinned bodies, and its body under
`rowHeight: 0`, are lists the table's author can't reach, so the table gives the reason itself.
Browser-only: a table doesn't lay out rows in happy-dom.
*/
test("a table's internal lists never trigger tosijs's long-list advice", async ({
  page,
}) => {
  const advice: string[] = []
  page.on('console', (message) => {
    if (message.text().includes('nonVirtualReason')) advice.push(message.text())
  })
  await page.goto('/data-table/')
  await page.waitForFunction(() => (window as any).xinjsui?.tosiTable)
  const rendered = await page.evaluate(async () => {
    const ui: any = (window as any).xinjsui
    const rows = (prefix: string, n: number) =>
      Array.from({ length: n }, (_, i) => ({
        id: `${prefix}${i}`,
        name: `${prefix} ${i}`,
      }))
    // a visible, sized box: a table that can't lay out doesn't render rows
    const box = document.createElement('div')
    box.style.cssText =
      'position: fixed; inset: 0; z-index: 10000; background: white'
    document.body.append(box)
    // pinned rows passed to the creator: that used to be silently ignored (see data-table.ts)
    const table = ui.tosiTable({
      rowHeight: 0,
      array: rows('row', 20),
      pinnedTopRows: rows('top', 12),
      pinnedBottomRows: rows('bottom', 12),
    })
    table.style.height = '100%'
    box.append(table)
    await new Promise((resolve) => setTimeout(resolve, 800))
    const count = (selector: string) => table.querySelectorAll(selector).length
    const result = {
      top: count('.tbody-pinned-top > .tr'),
      bottom: count('.tbody-pinned-bottom > .tr'),
      body: count('.scroll-area > .tr'),
    }
    box.remove()
    return result
  })
  // the lists really rendered past the threshold, so the absence of advice means something
  expect(rendered.top).toBe(12)
  expect(rendered.bottom).toBe(12)
  expect(rendered.body).toBeGreaterThan(10)
  expect(advice).toEqual([])
})

test("the doc browser's flat nav (query routing) doesn't trigger it either", async ({
  page,
}) => {
  const advice: string[] = []
  page.on('console', (message) => {
    if (message.text().includes('nonVirtualReason')) advice.push(message.text())
  })
  await page.goto('/data-table/')
  await page.waitForFunction(() => (window as any).xinjsui?.createDocBrowser)
  const links = await page.evaluate(async () => {
    const ui: any = (window as any).xinjsui
    const docs = Array.from({ length: 15 }, (_, i) => ({
      filename: `doc${i}.md`,
      title: `Doc ${i}`,
      text: `# Doc ${i}\n\nText ${i}.`,
      path: `doc${i}.md`,
    }))
    const box = document.createElement('div')
    box.style.cssText =
      'position: fixed; inset: 0; z-index: 10000; background: white'
    document.body.append(box)
    box.append(
      ui.createDocBrowser({ docs, routing: 'query', projectName: 'probe' })
    )
    await new Promise((resolve) => setTimeout(resolve, 800))
    return box.querySelectorAll('a.doc-link').length
  })
  expect(links).toBeGreaterThan(10) // the flat nav really listed them
  expect(advice).toEqual([])
})
