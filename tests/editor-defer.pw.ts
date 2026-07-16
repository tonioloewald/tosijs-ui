import { test, expect } from '@playwright/test'

/*
Slice 3 of self-contained examples (self-contained-examples-plan.md): the <tosi-code>
editor panels are built LAZILY on first showCode, not in content(). So a reader who
never opens a code panel never constructs a <tosi-code> and never pulls the CodeMirror
chunk (code-editor-cm-*.js, ~161KB). Opening a panel builds it and the editor works.
*/

const CM = /code-editor-cm/

test.skip(
  ({ browserName }) => browserName === 'webkit',
  'iframe runner parity with the doc-test lane'
)

test('CodeMirror chunk is NOT loaded on first paint, and loads + works on showCode', async ({
  page,
}) => {
  // Reader state (tests off) — the deferral holds regardless, but this is the case
  // we care about most.
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )

  const cmRequests: string[] = []
  page.on('request', (req) => {
    if (CM.test(req.url())) cmRequests.push(req.url())
  })

  await page.goto('/component/')

  // Examples run their previews (no editors needed).
  const firstExample = page.locator('tosi-example').first()
  await expect(firstExample).toBeVisible()
  await expect(firstExample.locator('.preview').first()).toBeVisible({
    timeout: 15_000,
  })
  await page.waitForTimeout(500)

  // The whole point: no editor panel was built, so no CodeMirror.
  expect(
    cmRequests,
    `CodeMirror must not load before a panel opens, got: ${cmRequests.join(', ')}`
  ).toHaveLength(0)
  // And there are no <tosi-code> elements in the DOM yet.
  expect(await page.locator('tosi-example tosi-code').count()).toBe(0)

  // Open the first example's code panel.
  await page.evaluate(() => {
    const ex = document.querySelector('tosi-example') as any
    ex.showCode()
  })

  // Now CodeMirror loads and a real editor mounts with the source text.
  await expect.poll(() => cmRequests.length, { timeout: 15_000 }).toBeGreaterThan(0)
  const editor = firstExample.locator('tosi-code').first()
  await expect(editor).toBeVisible()
  await expect(editor.locator('.cm-content')).toBeVisible({ timeout: 15_000 })
  const editorText = (await editor.locator('.cm-content').textContent()) || ''
  expect(editorText.length).toBeGreaterThan(0)
})
