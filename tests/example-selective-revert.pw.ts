import { test, expect } from '@playwright/test'

/*
"View changes" is also how you undo SOME of them.

Revert was all-or-nothing, which is the wrong shape for the common case: you tried four
things and three worked. The diff overlay in each editor is now resolvable, defaulting to
keeping your edit, so a hunk you flip to "Source" is reverted and everything else survives.

Driven through the real component — edit the editor, open the diff, click a button, close the
diff — because that is the only path that exercises the piece that was broken twice already:
a click crossing the shadow boundary.
*/

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
  await page.goto('/diff/')
  await page.waitForFunction(
    () => (document.querySelectorAll('tosi-example').length ?? 0) > 0,
    undefined,
    { timeout: 15000 }
  )
})

test('a hunk flipped to Source reverts only that hunk', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const ex: any = document.querySelector('tosi-example')
    await ex.whenHydrated
    ex.ensureEditors?.()
    await new Promise((r) => requestAnimationFrame(r))

    const editor = ex.parts.js
    await editor.whenHydrated
    const source: string = editor.value
    const lines = source.split('\n')
    if (lines.length < 4) return { skipped: 'source too short' }

    // Two independent edits, far enough apart to be separate change blocks.
    lines[0] = '// EDIT ONE'
    lines[lines.length - 1] = '// EDIT TWO'
    const edited = lines.join('\n')
    editor.value = edited
    editor.original = source

    // Open the resolvable diff exactly as "View changes" does.
    editor.diffResolvable = true
    editor.showDiff(true)
    await new Promise((r) => requestAnimationFrame(r))

    const overlay = editor.shadowRoot.querySelector('tosi-diff')
    const buttons = [
      ...overlay.shadowRoot.querySelectorAll('button[data-choice="original"]'),
    ]
    if (buttons.length < 2) return { skipped: `only ${buttons.length} hunks` }

    // Revert the FIRST change only, then close the diff to apply.
    buttons[0].click()
    await new Promise((r) => requestAnimationFrame(r))
    editor.showDiff(false)
    await new Promise((r) => requestAnimationFrame(r))

    return {
      value: editor.value as string,
      firstLineOfSource: source.split('\n')[0],
    }
  })

  if ('skipped' in result && result.skipped) {
    test.skip(true, String(result.skipped))
    return
  }

  // The reverted hunk is gone...
  expect(result.value).not.toContain('// EDIT ONE')
  expect(result.value).toContain(result.firstLineOfSource)
  // ...and the one left alone survived. Keeping is the default; that is the point.
  expect(result.value).toContain('// EDIT TWO')
})

test('closing the diff without touching anything changes nothing', async ({
  page,
}) => {
  /*
  The feature has to cost nothing to ignore. If merely opening and closing "view changes"
  rewrote the editor — through a stray resolution, a normalised line ending, anything — it
  would be a trap rather than a tool.
  */
  const same = await page.evaluate(async () => {
    const ex: any = document.querySelector('tosi-example')
    await ex.whenHydrated
    ex.ensureEditors?.()
    await new Promise((r) => requestAnimationFrame(r))
    const editor = ex.parts.js
    await editor.whenHydrated
    const source = editor.value
    editor.value = source + '\n// tail edit'
    editor.original = source
    const before = editor.value
    editor.diffResolvable = true
    editor.showDiff(true)
    await new Promise((r) => requestAnimationFrame(r))
    editor.showDiff(false)
    await new Promise((r) => requestAnimationFrame(r))
    return editor.value === before
  })
  expect(same).toBe(true)
})
