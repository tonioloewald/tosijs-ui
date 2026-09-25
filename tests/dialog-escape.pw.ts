import { test, expect, type Page } from '@playwright/test'

/*
Escape must go through `close()` (#183, from snowfox-app).

Escape in a modal `<dialog>` fires `cancel` and the browser closes the element itself, so
before this fix `close()` never ran: `dialogWillClose` was skipped, which is the ONLY way the
static helpers resolve, so `await TosiDialog.confirm(...)` hung forever; the `showModal()`
promise never settled; and `removeOnClose` was skipped, leaking one element per Escape.

This needs a real browser. happy-dom does not implement the Escape → `cancel` → close
sequence, and that sequence is the defect.
*/

async function open(page: Page) {
  await page.goto('/')
  await page.waitForFunction(() => !!(window as any).xinjsui?.TosiDialog)
}

/** Resolve within a deadline, or report that it never settled. */
const settled = (expr: string) => `
  Promise.race([
    ${expr}.then((value) => ({ settled: true, value })),
    new Promise((r) => setTimeout(() => r({ settled: false }), 2000)),
  ])`

for (const helper of ['alert', 'confirm', 'prompt'] as const) {
  test(`Escape settles TosiDialog.${helper} and removes its element`, async ({
    page,
  }) => {
    await open(page)
    const before = await page.evaluate(
      () => document.querySelectorAll('tosi-dialog').length
    )
    await page.evaluate((helper) => {
      const { TosiDialog } = (window as any).xinjsui
      ;(window as any).__pending = TosiDialog[helper]('Escape me')
    }, helper)
    await page.waitForSelector('tosi-dialog dialog[open]')
    await page.keyboard.press('Escape')

    const result = (await page.evaluate(settled('window.__pending'))) as {
      settled: boolean
      value?: unknown
    }
    expect(result.settled).toBe(true)
    // alert resolves undefined, confirm false, prompt null — each helper's "cancelled"
    const expected = { alert: undefined, confirm: false, prompt: null }[helper]
    expect(result.value).toBe(expected)
    expect(
      await page.evaluate(() => document.querySelectorAll('tosi-dialog').length)
    ).toBe(before)
  })
}

test('Escape resolves the showModal() promise with "cancel"', async ({
  page,
}) => {
  await open(page)
  await page.evaluate(() => {
    const { tosiDialog } = (window as any).xinjsui
    const d = tosiDialog({ removeOnClose: true })
    document.body.append(d)
    ;(window as any).__pending = d.showModal()
  })
  await page.waitForSelector('tosi-dialog dialog[open]')
  await page.keyboard.press('Escape')
  const result = await page.evaluate(settled('window.__pending'))
  expect(result).toEqual({ settled: true, value: 'cancel' })
})

test('dialogWillClose returning false vetoes an Escape', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    const { tosiDialog } = (window as any).xinjsui
    const w = window as any
    w.__busy = true
    w.__calls = [] as string[]
    const d = tosiDialog({
      removeOnClose: true,
      dialogWillClose(reason: string) {
        w.__calls.push(reason)
        return w.__busy ? false : undefined
      },
    })
    d.id = 'veto'
    document.body.append(d)
    w.__pending = d.showModal()
  })
  await page.waitForSelector('#veto dialog[open]')
  await page.keyboard.press('Escape')
  // Still open, still attached, promise still pending — and the veto was consulted.
  expect(await page.evaluate(() => (window as any).__calls)).toEqual(['cancel'])
  expect(await page.locator('#veto dialog[open]').count()).toBe(1)

  // Once no longer busy, the explicit close path works.
  await page.evaluate(() => {
    ;(window as any).__busy = false
    ;(document.querySelector('#veto') as any).close('cancel')
  })
  const result = await page.evaluate(settled('window.__pending'))
  expect(result).toEqual({ settled: true, value: 'cancel' })
  expect(await page.locator('#veto').count()).toBe(0)
})
