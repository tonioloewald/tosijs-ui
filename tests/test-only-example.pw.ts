import { test, expect } from '@playwright/test'

/*
A ` ```test ` fence with nothing beside it must SHOW ITS RESULTS, not an empty box.

Before this, the preview rendered empty and the results panel stayed hidden unless a test
FAILED — so a passing suite looked like a broken example and hid the only thing the block was
there to show.

The corpus had NO test-only example when this was written; a first version of this test looked
for one on `/diff/` and found nothing, because that example has a `js` block too. One now lives
in the `example` docs, both to demonstrate the behaviour and to give this test something real
to assert against.
*/
test('a test-only example renders its results as the body', async ({
  page,
}) => {
  await page.goto('/component/')
  const example = page.locator('tosi-example.-test-only').first()
  await expect(example, 'no test-only example found on this page').toBeAttached(
    {
      timeout: 15_000,
    }
  )

  const results = example.locator('[part="testResults"]')
  await expect(results).toBeVisible({ timeout: 15_000 })
  // It ran, and it says so.
  await expect(results).toContainText(/pass|✓|✗|fail/i)

  /*
  The empty preview must not be reserving space beside it.

  Assert the COUNT first. `if (await preview.count()) await expect(...)` passes vacuously the
  day the selector stops matching — a renamed class turns this from a real check into a no-op
  and nothing goes red. Naming the expected count means a rename fails loudly instead.
  */
  const preview = example.locator('.preview')
  expect(await preview.count()).toBe(1)
  await expect(preview).toBeHidden()
})

test('an ordinary example is UNCHANGED — results stay an overlay', async ({
  page,
}) => {
  // The class must not leak onto examples that have something to render; those keep the
  // floating panel, shown on the test tab or on failure.
  await page.goto('/component/')
  const ordinary = page.locator('tosi-example:not(.-test-only)').first()
  await expect(ordinary).toBeAttached({ timeout: 15_000 })
  await expect(ordinary.locator('[part="testResults"]')).toBeHidden()
})
