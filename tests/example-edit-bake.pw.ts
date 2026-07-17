import { test, expect } from '@playwright/test'

/*
Slice 4 of self-contained examples (self-contained-examples-plan.md): the build-time
bake corresponds to the ORIGINAL source, so once a tjs example is edited the bake is
stale and must NOT run — refresh() drops it (compiledJsSource !== this.js) and
transpiles the edit. Without the fix, an edited tjs example on the reader path would
keep running the original baked output.
*/

test.skip(
  ({ browserName }) => browserName === 'webkit',
  'iframe runner parity with the doc-test lane'
)

test('editing a tjs example runs the EDIT, not the stale build bake', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )

  await page.goto('/component/')
  const firstTjs = page.locator('tosi-example').nth(1) // 2nd example is tjs
  await expect(firstTjs).toBeVisible()
  await expect(firstTjs.locator('.preview').first()).toBeVisible({
    timeout: 15_000,
  })

  const MARKER = 'EDITED_SLICE4_MARKER'
  const result = await page.evaluate(async (marker) => {
    const ex: any = [...document.querySelectorAll('tosi-example')].find(
      (e: any) => e.dialect === 'tjs'
    )
    const before = (ex.querySelector('.preview')?.textContent || '').trim()
    // Edit the source to a value whose output is unmistakable, then re-run.
    ex.js = `preview.textContent = '${marker}'`
    await ex.refresh()
    const after = (ex.querySelector('.preview')?.textContent || '').trim()
    return { before, after }
  }, MARKER)

  // The edit ran (not the original bake), and it actually changed the output.
  expect(result.after).toContain(MARKER)
  expect(result.before).not.toContain(MARKER)
})

test('a saved local edit keeps its transpiled code — restores and runs it WITHOUT the transpiler', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )

  let phase = 'setup'
  const transpilerLoadsAfterReload: string[] = []
  page.on('request', (req) => {
    if (phase === 'reload' && /tjs-browser/.test(req.url())) {
      transpilerLoadsAfterReload.push(req.url())
    }
  })

  await page.goto('/component/')
  await expect(page.locator('tosi-example').nth(1)).toBeVisible()
  await expect(
    page.locator('tosi-example').nth(1).locator('.preview').first()
  ).toBeVisible({ timeout: 15_000 })

  const MARKER = 'SAVED_SLICE4_MARKER'
  // Edit the tjs example, refresh (transpiles the edit + caches its bake), and save.
  const keyed = await page.evaluate(async (marker) => {
    const ex: any = [...document.querySelectorAll('tosi-example')].find(
      (e: any) => e.dialect === 'tjs'
    )
    ex.js = `preview.textContent = '${marker}'`
    await ex.refresh()
    ex.saveLocalEdit()
    // Only meaningful if the example has a source-map key (it does on the built site).
    return !!ex.getAttribute('data-source-file')
  }, MARKER)
  expect(keyed).toBe(true)

  // Reload: the saved edit (with its bake) is restored; the reader runs it with NO
  // transpiler load.
  phase = 'reload'
  await page.reload()

  // The reloaded page hydrates + restores the saved edit asynchronously; wait for it.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const ex: any = [
            ...document.querySelectorAll('tosi-example'),
          ].find((e: any) => e.dialect === 'tjs')
          return (ex?.querySelector('.preview')?.textContent || '').trim()
        }),
      { timeout: 15_000 }
    )
    .toContain(MARKER)

  await page.waitForTimeout(500)
  expect(
    transpilerLoadsAfterReload,
    `a saved edit carries its bake, so no transpiler should load on reload, got: ${transpilerLoadsAfterReload.join(', ')}`
  ).toHaveLength(0)
})
