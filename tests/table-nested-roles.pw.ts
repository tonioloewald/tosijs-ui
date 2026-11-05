import { test, expect } from './fixtures'

/*
The table puts its own rows back to role=row after tosijs's listBinding marks them list items
(#3570), and only its own: a list inside a cell keeps its list items (1.17.0 review).
*/
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
})

test('a list inside a cell keeps role=listitem; the rows are role=row', async ({
  page,
}) => {
  await page.goto('/data-table/')
  await page.waitForFunction(() => (window as any).xinjsui?.tosiTable)
  const roles = await page.evaluate(async () => {
    const { tosiTable } = (window as any).xinjsui
    const host = document.createElement('div')
    host.id = 'nested-roles'
    host.style.cssText =
      'position:fixed;top:0;left:0;width:600px;height:200px;z-index:9999'
    document.body.append(host)
    // A component that renders its list items once it is connected, as <tosi-tag-list> does.
    if (!customElements.get('nested-roles-list'))
      customElements.define(
        'nested-roles-list',
        class extends HTMLElement {
          connectedCallback() {
            this.setAttribute('role', 'list')
            requestAnimationFrame(() => {
              if (this.childElementCount) return
              for (const text of ['a', 'b']) {
                const li = document.createElement('div')
                li.className = 'tr'
                li.setAttribute('role', 'listitem')
                li.textContent = text
                this.append(li)
              }
            })
          }
        }
      )
    const listCell = () => document.createElement('nested-roles-list')
    host.append(
      tosiTable({
        array: [{ id: 1 }, { id: 2 }],
        columns: [
          { prop: 'id', width: 60 },
          { prop: 'tags', width: 200, dataCell: listCell },
        ],
      })
    )
    for (let i = 0; i < 100 && !host.querySelector('.td'); i++)
      await new Promise((r) => requestAnimationFrame(r))
    await new Promise((r) => setTimeout(r, 200))
    const table = host.querySelector('tosi-table')!
    return {
      rows: [...table.querySelectorAll('.tbody .tr, .scroll-area > .tr')]
        .filter((tr) => !tr.closest('[role="list"]'))
        .map((tr) => tr.getAttribute('role')),
      items: [...table.querySelectorAll('[role="list"] > *')].map((li) =>
        li.getAttribute('role')
      ),
    }
  })
  expect(roles.rows.length).toBeGreaterThan(0)
  expect(new Set(roles.rows)).toEqual(new Set(['row']))
  expect(roles.items).toEqual(['listitem', 'listitem', 'listitem', 'listitem'])
})
