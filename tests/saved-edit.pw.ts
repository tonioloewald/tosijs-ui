import { test, expect } from './fixtures'

/*
#3276: an edit saved in one browser kept running long after the page's source had changed. The
page looked like the source, the error read like a library defect, and other browsers were
clean. A saved edit now carries a fingerprint of the source it was made against: a matching one
runs (and says so in the console), a stale one is set aside, kept, and the source runs.
*/
test('a saved edit runs only against the source it was made from, and says so', async ({
  page,
}) => {
  const warnings: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'warning') warnings.push(msg.text())
  })
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
  await page.goto('/rating/')
  const first = page.locator('.doc-content tosi-example').first()
  await expect(first).toBeAttached()
  // The example's key and source, and the fingerprint a save made against it would carry.
  const { key, source, base } = await first.evaluate(async (el: any) => {
    await el.whenHydrated
    const save = JSON.parse(JSON.stringify(localStorage))
    el.saveLocalEdit()
    const key = Object.keys(localStorage).find(
      (k) => k.startsWith('tosi-example-edit:') && !(k in save)
    )!
    const stored = JSON.parse(localStorage.getItem(key)!)
    localStorage.removeItem(key)
    return { key, source: el.js, base: stored.base }
  })
  expect(base).toMatch(/^[0-9a-f]{8}$/)

  const edited = source + '\n// edited'
  const runAfterReload = async (saved: object) => {
    await page.evaluate(
      ([k, v]) => localStorage.setItem(k, v),
      [key, JSON.stringify(saved)]
    )
    warnings.length = 0
    await page.reload()
    await expect(first).toBeAttached()
    return first.evaluate(async (el: any) => {
      await el.whenHydrated
      return el.js
    })
  }

  // Made against this source: it runs, and the console says so.
  expect(await runAfterReload({ js: edited, base })).toBe(edited)
  await expect
    .poll(() => warnings.some((w) => w.includes('is running an edit saved')))
    .toBe(true)

  // Made against an older source: the source runs, the edit is kept, and the console says why.
  expect(await runAfterReload({ js: edited, base: '00000000' })).toBe(source)
  await expect
    .poll(() =>
      warnings.some((w) => w.includes('older version of this example'))
    )
    .toBe(true)
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toContain(
    'edited'
  )
  await page.evaluate((k) => localStorage.removeItem(k), key)
})
