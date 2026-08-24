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

/*
The destructive paths. These executed in NO lane before the 1.11.0 review, and that gap was
hiding two real defects: `createNew()` followed by `remove()` sent `store.delete({})` — for a
REST adapter, `DELETE /records/undefined` — and the Delete button's `void this.remove()`
raised an unhandled rejection on a rejecting store, on top of the error the component had
already reported properly.
*/

test('a record with no id is not deletable — by button OR by method', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const crud = document.querySelector('tosi-crud') as any
    await crud.whenIdle()
    const deletes: unknown[] = []
    const inner = crud.store.delete.bind(crud.store)
    crud.store = {
      ...crud.store,
      delete: async (record: any) => {
        deletes.push(record)
        return inner(record)
      },
    }
    await crud.whenIdle()

    crud.createNew()
    await crud.whenIdle()
    const buttonDisabled = (
      crud.querySelector('.crud-delete') as HTMLButtonElement
    ).disabled
    // The API must enforce the same rule the button shows — a guard the UI enforces and the
    // method does not is not a guard.
    await crud.remove()
    return { buttonDisabled, deleteCalls: deletes.length }
  })
  expect(result.buttonDisabled).toBe(true)
  expect(result.deleteCalls).toBe(0)
})

test('deleting a real record removes it and clears the selection', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const crud = document.querySelector('tosi-crud') as any
    await crud.whenIdle()
    const before = crud.rows.length
    crud.select(crud.rows[2])
    await crud.whenIdle()
    await crud.remove()
    await crud.whenIdle()
    return {
      before,
      after: crud.rows.length,
      selection: crud.value,
      hash: location.hash,
    }
  })
  expect(result.after).toBe(result.before - 1)
  expect(result.selection).toBe(null)
  // The id must leave the URL too, or a reload reopens a record that is gone.
  expect(result.hash).not.toContain('people.id=')
})

test('a failing delete is reported, and raises no unhandled rejection', async ({
  page,
}) => {
  const unhandled: string[] = []
  page.on('pageerror', (e) => unhandled.push(String(e)))
  const result = await page.evaluate(async () => {
    const crud = document.querySelector('tosi-crud') as any
    await crud.whenIdle()
    crud.store = {
      ...crud.store,
      delete: async () => {
        throw new Error('the server said no')
      },
    }
    await crud.whenIdle()
    crud.select(crud.rows[0])
    await crud.whenIdle()

    let sawEvent = false
    crud.addEventListener('error', () => (sawEvent = true), { once: true })
    // Through the BUTTON, which is the path that used to leak the rejection.
    ;(crud.querySelector('.crud-delete') as HTMLButtonElement).click()
    await new Promise((r) => setTimeout(r, 100))
    await crud.whenIdle()
    return {
      sawEvent,
      status: (crud.querySelector('.crud-status') as HTMLElement).textContent,
      stillThere: crud.rows.length,
    }
  })
  expect(result.sawEvent).toBe(true)
  expect(result.status).toBe('the server said no')
  // Nothing was removed on a failed delete.
  expect(result.stillThere).toBeGreaterThan(0)
  expect(unhandled).toEqual([])
})

test('createNew starts a blank record that saves as a new one', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const crud = document.querySelector('tosi-crud') as any
    await crud.whenIdle()
    const before = crud.rows.length
    crud.createNew()
    await crud.whenIdle()
    const name = crud.form.querySelector(
      '[data-path="name"]'
    ) as HTMLInputElement
    name.value = 'Barbara Liskov'
    name.dispatchEvent(new Event('input', { bubbles: true }))
    await crud.save()
    await crud.whenIdle()
    return {
      before,
      after: crud.rows.length,
      added: crud.rows.some((r: any) => r.name === 'Barbara Liskov'),
      gotAnId: crud.value?.id !== undefined,
    }
  })
  expect(result.after).toBe(result.before + 1)
  expect(result.added).toBe(true)
  // The store's answer wins: it assigned the id.
  expect(result.gotAnId).toBe(true)
})

test('the table highlights whatever the form is editing — including a deep link', async ({
  page,
}) => {
  // "A link you can send someone" produced a list that did not show where you were: the
  // record opened and nothing was highlighted.
  const result = await page.evaluate(async () => {
    const crud = document.querySelector('tosi-crud') as any
    await crud.whenIdle()
    crud.select(crud.rows[0])
    await crud.whenIdle()
    const first = crud.table.selectedRows.map((r: any) => r.name)
    crud.select(crud.rows[2])
    await crud.whenIdle()
    return { first, second: crud.table.selectedRows.map((r: any) => r.name) }
  })
  expect(result.first).toEqual(['Ada Lovelace'])
  // The previous row must not stay highlighted alongside it.
  expect(result.second).toEqual(['Katherine Johnson'])
})

test('Back leaves the record, and says so', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const crud = document.querySelector('tosi-crud') as any
    await crud.whenIdle()
    crud.select(crud.rows[1])
    await crud.whenIdle()
    return { opened: crud.value?.name, hash: location.hash }
  })
  expect(result.opened).toBe('Grace Hopper')
  expect(result.hash).toContain('people.id=2')

  await page.goBack()
  // Wait for the URL to actually settle, then for the component to react. `goBack()` resolves
  // on navigation, not on the popstate listeners having run and a render having happened —
  // assuming otherwise passed in isolation and failed about one full run in six.
  await page.waitForFunction(() => !location.hash.includes('people.id='))
  const after = await page.evaluate(async () => {
    const crud = document.querySelector('tosi-crud') as any
    // Poll for the CONDITION being asserted, not a proxy for it. Waiting on `crud.value`
    // and then reading `detail.hidden` assumes the two settle in the same frame; they do not
    // always, and the assertion that mattered was the one not being waited for.
    const detail = crud.querySelector('.crud-detail') as HTMLElement
    for (let i = 0; i < 200 && !(crud.value === null && detail.hidden); i++) {
      await new Promise((r) => requestAnimationFrame(r))
    }
    return {
      value: crud.value,
      detailHidden: (crud.querySelector('.crud-detail') as HTMLElement).hidden,
      hash: location.hash,
    }
  })
  // The detail pane used to stay open with the record loaded while the hash was clean — so
  // reloading that same URL showed something different from what was on screen.
  expect(after.hash).not.toContain('people.id=')
  expect(after.value).toBe(null)
  expect(after.detailHidden).toBe(true)
})

test('typing in the form does not tear down the table', async ({ page }) => {
  /*
  `TosiTable.set array` always queues a render and `render()` starts with
  `textContent = ''`, so crud's unconditional `table.array = this._rows` rebuilt the entire
  table on every form keystroke — and crud queues a render on every form `change`, every
  hashState notification and every pending transition. The search debounce protects the
  network, not the DOM. Element identity is the cheapest way to see it.
  */
  const survived = await page.evaluate(async () => {
    const crud = document.querySelector('tosi-crud') as any
    await crud.whenIdle()
    crud.select(crud.rows[0])
    await crud.whenIdle()
    /*
    Wait for a cell to EXIST before capturing it.

    Rows are list-bound and stamp on their own schedule; on WebKit this captured `null` and
    then compared it to a real element, reporting a teardown that never happened. The
    component was measured at 0 table renders on both engines — the test was the thing that
    was wrong, and it only showed up on the slower engine.
    */
    for (let i = 0; i < 200 && !crud.table.querySelector('.td'); i++) {
      await new Promise((r) => requestAnimationFrame(r))
    }
    const cell = crud.table.querySelector('.td')
    if (!cell) throw new Error('no cells stamped')
    const name = crud.form.querySelector(
      '[data-path="name"]'
    ) as HTMLInputElement
    for (const ch of ['a', 'b', 'c', 'd']) {
      name.value += ch
      name.dispatchEvent(new Event('input', { bubbles: true }))
      await new Promise((r) => requestAnimationFrame(r))
    }
    return crud.table.querySelector('.td') === cell
  })
  expect(survived).toBe(true)
})
