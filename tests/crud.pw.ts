import { test, expect } from '@playwright/test'

/*
`<tosi-crud>` edits must survive a render.

The regression this guards against destroyed data with no user action at all: `showSelected()`
compared `form.value !== _selected`, and `setByPath` is immutable, so after the first keystroke
that comparison was permanently true and every render wrote the record as loaded back over the
edit. `save()` then posted the unedited record.

The doc test missed it because it awaited `save()` in the same synchronous stretch as the
edit — no frame ever elapsed. **A frame is the whole test**, which is why these live here,
where inserting real frames and real store latency is natural.
*/

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
  await page.goto('/crud/')
  await page.waitForFunction(
    () => (document.querySelector('tosi-crud') as any)?.rows?.length
  )
})

test('an unsaved edit survives the frames after it', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const crud = document.querySelector('tosi-crud') as any
    await crud.whenIdle()
    crud.select(crud.rows[1])
    await crud.whenIdle()
    const name = crud.form.querySelector(
      '[data-path="name"]'
    ) as HTMLInputElement
    name.value = 'EDITED'
    name.dispatchEvent(new Event('input', { bubbles: true }))
    const immediately = crud.value.name
    for (let i = 0; i < 3; i++) {
      await new Promise((r) => requestAnimationFrame(r))
    }
    return {
      immediately,
      afterFrames: crud.value.name,
      inputShows: name.value,
    }
  })
  expect(result.immediately).toBe('EDITED')
  expect(result.afterFrames).toBe('EDITED')
  // …and the input the user is typing in was not rewritten underneath them.
  expect(result.inputShows).toBe('EDITED')
})

test('an edit survives an unrelated re-render, and save sends it', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const crud = document.querySelector('tosi-crud') as any
    await crud.whenIdle()
    crud.select(crud.rows[1])
    await crud.whenIdle()
    const name = crud.form.querySelector(
      '[data-path="name"]'
    ) as HTMLInputElement
    name.value = 'Grace B. Hopper'
    name.dispatchEvent(new Event('input', { bubbles: true }))

    // Anything that renders the component: typing in the search box does, and so does a
    // bare render() — both used to revert the edit.
    crud.render()
    await new Promise((r) => requestAnimationFrame(r))
    const beforeSave = crud.value.name

    await crud.save()
    await crud.whenIdle()
    const stored = crud.rows.find((r: any) => r.id === 2)?.name
    return { beforeSave, stored }
  })
  expect(result.beforeSave).toBe('Grace B. Hopper')
  // The store received the EDITED record, not the one that was loaded.
  expect(result.stored).toBe('Grace B. Hopper')
})

test('selecting a different record does load it', async ({ page }) => {
  // The guard must not overcorrect: a real selection change still replaces the form.
  const result = await page.evaluate(async () => {
    const crud = document.querySelector('tosi-crud') as any
    await crud.whenIdle()
    crud.select(crud.rows[0])
    await crud.whenIdle()
    const first = crud.value.name
    crud.select(crud.rows[2])
    await crud.whenIdle()
    return { first, second: crud.value.name }
  })
  expect(result.first).toBe('Ada Lovelace')
  expect(result.second).toBe('Katherine Johnson')
})
