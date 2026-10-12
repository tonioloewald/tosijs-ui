import { test, expect } from '@playwright/test'

/*
Curated schema forms (#221), through the mounted component. The picking rule has unit tests
(`src/schema-form/curate.test.ts`); these cover what only a real form shows: where an error
lands, what `readOnly` reaches, and what a custom editor writes.
*/

async function makeForm(page: any) {
  await page.goto('/schema-form/')
  await page.waitForFunction(() => !!customElements.get('tosi-schema-form'))
  await page.evaluate(() => {
    const { tosiSchemaForm, tosiRating } = (window as any).xinjsui
    const form = tosiSchemaForm({
      id: 'curated',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          priority: { type: 'integer', minimum: 0, maximum: 5 },
          notes: { type: 'string' },
          hidden: { type: 'integer' },
        },
        required: ['priority', 'name'],
      },
      value: { name: 'Ada', hidden: 1 },
      fields: {
        name: 'Name',
        priority: { caption: 'Priority', editor: tosiRating },
        'no.such.path': { caption: 'Ghost', editor: tosiRating },
      },
    })
    Object.assign(form.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: '2000',
      width: '400px',
      background: 'white',
    })
    document.body.append(form)
  })
  await page.waitForSelector('#curated [data-plugin="priority"]')
}

const errorsOf = (page: any) =>
  page.evaluate(() => {
    const form = document.querySelector('#curated') as any
    form.validate()
    const text = (sel: string) => {
      const el = form.querySelector(sel) as HTMLElement | null
      return el && !el.hidden ? el.textContent : ''
    }
    return {
      available: form.validationAvailable,
      priority: text('[data-field="priority"] .schema-error'),
      banner: text('.schema-hidden-errors'),
    }
  })

test('errors on a custom-editor field land under that field, missing or wrong', async ({
  page,
}) => {
  await makeForm(page)
  // priority is required and absent
  let errors = await errorsOf(page)
  expect(errors.available).toBe(true)
  expect(errors.priority).toContain('Missing')
  expect(errors.banner).toBe('')

  // a wrong type lands there too
  await page.evaluate(() => {
    const form = document.querySelector('#curated') as any
    form.value = { ...form.value, priority: 'high' }
  })
  await page.waitForTimeout(100)
  errors = await errorsOf(page)
  expect(errors.priority).not.toBe('')
  expect(errors.banner).toBe('')

  // and an error in a field that is not shown goes to the banner, not to a field
  await page.evaluate(() => {
    const form = document.querySelector('#curated') as any
    form.value = { name: 'Ada', priority: 2, hidden: 'x' }
  })
  await page.waitForTimeout(100)
  errors = await errorsOf(page)
  expect(errors.priority).toBe('')
  expect(errors.banner).toContain('hidden')
})

test('a custom editor writes again after the value is changed from outside', async ({
  page,
}) => {
  await makeForm(page)
  const result = await page.evaluate(async () => {
    const form = document.querySelector('#curated') as any
    const rating = form.querySelector('[data-plugin="priority"]') as any
    const tick = () => new Promise((r) => setTimeout(r, 60))
    const edit = (n: number) => {
      rating.value = n
      rating.dispatchEvent(new Event('change', { bubbles: true }))
    }
    let changes = 0
    form.addEventListener('change', () => (changes += 1))
    form.value = { ...form.value, priority: 3 }
    await tick()
    edit(5)
    form.value = { ...form.value, priority: 3 }
    await tick()
    edit(5)
    return { priority: form.value.priority, changes, hidden: form.value.hidden }
  })
  expect(result).toEqual({ priority: 5, changes: 2, hidden: 1 })
})

test('an unknown path shows a placeholder, never an editor', async ({
  page,
}) => {
  await makeForm(page)
  await expect(page.locator('#curated .schema-unsupported')).toContainText(
    'no.such.path'
  )
  await expect(page.locator('#curated [data-plugin]')).toHaveCount(1)
})

test('readOnly locks a component editor and gives it back', async ({
  page,
}) => {
  await makeForm(page)
  const state = () =>
    page.evaluate(() => {
      const form = document.querySelector('#curated') as any
      return {
        rating: form.querySelector('[data-plugin="priority"]').readonly,
        name: form.querySelector('[data-path="name"]').disabled,
      }
    })
  expect(await state()).toEqual({ rating: false, name: false })
  await page.evaluate(() => {
    ;(document.querySelector('#curated') as any).readOnly = true
  })
  await page.waitForTimeout(100)
  expect(await state()).toEqual({ rating: true, name: true })
  await page.evaluate(() => {
    ;(document.querySelector('#curated') as any).readOnly = false
  })
  await page.waitForTimeout(100)
  expect(await state()).toEqual({ rating: false, name: false })

  // An editor the author disabled stays disabled when the form is editable.
  await page.evaluate(() => {
    const form = document.querySelector('#curated') as any
    form.querySelector('[data-plugin="priority"]').readonly = true
    form.readOnly = true
  })
  await page.waitForTimeout(100)
  await page.evaluate(() => {
    ;(document.querySelector('#curated') as any).readOnly = false
  })
  await page.waitForTimeout(100)
  expect((await state()).rating).toBe(true)
})
