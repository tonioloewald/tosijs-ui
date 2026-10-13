import { test, expect } from '@playwright/test'

/*
Curation inside arrays and unions, sections, and proposals (#221, second round), through the
mounted component. `curateNodes` has unit tests; these cover what only a real form shows.
*/

const SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    retries: { type: 'integer', minimum: 0 },
    thresholds: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          when: {
            type: 'object',
            properties: {
              company: { type: 'string' },
              account: { type: 'string' },
            },
          },
          value: { type: 'number', minimum: 0, maximum: 1 },
          note: { type: 'string' },
        },
      },
    },
    rule: {
      anyOf: [
        {
          type: 'object',
          title: 'Fixed',
          properties: {
            kind: { const: 'fixed' },
            amount: { type: 'number' },
            memo: { type: 'string' },
          },
        },
        {
          type: 'object',
          title: 'Percent',
          properties: {
            kind: { const: 'percent' },
            rate: { type: 'number' },
            memo: { type: 'string' },
          },
        },
      ],
    },
  },
}

const VALUE = {
  name: 'Ada',
  retries: 2,
  thresholds: [
    { when: { company: 'Acme', account: '4000' }, value: 0.8, note: 'first' },
    {
      when: { company: 'Globex', account: '5000' },
      value: 0.6,
      note: 'second',
    },
  ],
  rule: { kind: 'fixed', amount: 10, memo: 'keep me' },
}

async function makeForm(page: any, fields: any, extra: any = {}) {
  await page.goto('/schema-form/')
  await page.waitForFunction(() => !!customElements.get('tosi-schema-form'))
  await page.evaluate(
    ({ schema, value, fields, extra }: any) => {
      const { tosiSchemaForm } = (window as any).xinjsui
      ;(window as any).warnings = []
      const warn = console.warn
      console.warn = (...args: any[]) => {
        ;(window as any).warnings.push(args.join(' '))
        warn(...args)
      }
      const form = tosiSchemaForm({
        id: 'nested',
        schema,
        value,
        ...(fields ? { fields } : {}),
        ...extra,
      })
      Object.assign(form.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        zIndex: '2000',
        width: '480px',
        maxHeight: '100vh',
        overflow: 'auto',
        background: 'white',
      })
      ;(window as any).events = []
      for (const type of ['change', 'proposalaccept', 'proposalreject']) {
        form.addEventListener(type, (event: any) =>
          (window as any).events.push(
            event.detail ? `${type}:${event.detail.path}` : type
          )
        )
      }
      document.body.append(form)
    },
    { schema: SCHEMA, value: VALUE, fields, extra }
  )
  await page.waitForSelector('#nested .schema-form')
  await page.waitForTimeout(100)
}

const shownPaths = (page: any) =>
  page.evaluate(() =>
    [...document.querySelectorAll('#nested [data-field]')].map(
      (el: any) => el.dataset.field
    )
  )

const formValue = (page: any) =>
  page.evaluate(() => (document.querySelector('#nested') as any).value)

test('an array entry with `fields` curates every item', async ({ page }) => {
  await makeForm(page, {
    thresholds: {
      caption: 'Thresholds',
      fields: {
        value: { caption: 'Threshold', help: 'Between 0 and 1.' },
        'when.company': { caption: 'Company', readOnly: true },
      },
    },
  })
  expect(await shownPaths(page)).toEqual([
    'thresholds.0.value',
    'thresholds.0.when.company',
    'thresholds.1.value',
    'thresholds.1.when.company',
  ])
  const first = page.locator('#nested [data-field="thresholds.0.value"]')
  await expect(first.locator('label')).toHaveText('Threshold')
  await expect(first.locator('.schema-help')).toHaveText('Between 0 and 1.')
  await expect(
    page.locator('#nested [data-path="thresholds.1.when.company"]')
  ).toBeDisabled()
  await expect(
    page.locator('#nested [data-path="thresholds.1.value"]')
  ).toBeEnabled()

  // editing one item's field keeps what the curation does not show
  await page.locator('#nested [data-path="thresholds.1.value"]').fill('0.5')
  const value = await formValue(page)
  expect(value.thresholds[1]).toEqual({
    when: { company: 'Globex', account: '5000' },
    value: 0.5,
    note: 'second',
  })

  // a new item is curated like the rest
  await page.locator('#nested .schema-add').click()
  expect((await shownPaths(page)).slice(4)).toEqual([
    'thresholds.2.value',
    'thresholds.2.when.company',
  ])

  // an error in an item field that is not shown is reported by its real path
  await page.evaluate(() => {
    const form = document.querySelector('#nested') as any
    const next = structuredClone(form.value)
    next.thresholds[0].note = 7
    form.value = next
  })
  await expect(page.locator('#nested .schema-hidden-errors')).toContainText(
    'thresholds.0.note'
  )
  // and one in a field that is shown lands under it
  await page.locator('#nested [data-path="thresholds.0.value"]').fill('3')
  await expect(
    page.locator('#nested [data-field="thresholds.0.value"] .schema-error')
  ).toBeVisible()
})

test('an item field can have its own editor, and an unknown item path warns once', async ({
  page,
}) => {
  await makeForm(page, null)
  await page.evaluate(() => {
    const { tosiRating } = (window as any).xinjsui
    const form = document.querySelector('#nested') as any
    form.schema = {
      type: 'object',
      properties: {
        reviews: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              stars: { type: 'integer', minimum: 0, maximum: 5 },
              text: { type: 'string' },
            },
          },
        },
      },
    }
    form.value = {
      reviews: [
        { stars: 2, text: 'a' },
        { stars: 4, text: 'b' },
      ],
    }
    form.fields = {
      reviews: { fields: { stars: { editor: tosiRating }, nope: true } },
    }
  })
  const second = page.locator('#nested [data-plugin="reviews.1.stars"]')
  await expect(second).toHaveCount(1)
  expect(await second.evaluate((el: any) => [el.tagName, el.value])).toEqual([
    'TOSI-RATING',
    4,
  ])
  await second.evaluate((el: any) => {
    el.value = 5
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
  expect((await formValue(page)).reviews).toEqual([
    { stars: 2, text: 'a' },
    { stars: 5, text: 'b' },
  ])
  await expect(page.locator('#nested .schema-unsupported')).toHaveCount(2)
  const warnings = await page.evaluate(() =>
    (window as any).warnings.filter((w: string) => w.includes('reviews[].nope'))
  )
  expect(warnings.length).toBe(1)
})

test('a union entry with `fields` curates the active branch', async ({
  page,
}) => {
  await makeForm(page, {
    rule: {
      caption: 'Rule',
      picker: false,
      fields: { amount: 'Amount', rate: 'Rate' },
    },
  })
  // `rate` belongs to the other branch: left out, with no placeholder and no warning
  expect(await shownPaths(page)).toEqual(['rule.amount'])
  await expect(page.locator('#nested .schema-unsupported')).toHaveCount(0)
  await expect(page.locator('#nested .schema-variant')).toBeHidden()
  await expect(
    page.locator('#nested [data-field="rule.amount"] label')
  ).toHaveText('Amount')
  expect(await page.evaluate(() => (window as any).warnings)).toEqual([])

  await page.locator('#nested [data-path="rule.amount"]').fill('25')
  expect((await formValue(page)).rule).toEqual({
    kind: 'fixed',
    amount: 25,
    memo: 'keep me',
  })

  // the value moves to the other branch: its curated field takes over
  await page.evaluate(() => {
    const form = document.querySelector('#nested') as any
    form.value = {
      ...form.value,
      rule: { kind: 'percent', rate: 5, memo: 'm' },
    }
  })
  await expect(page.locator('#nested [data-path="rule.rate"]')).toHaveValue('5')
  expect(await shownPaths(page)).toEqual(['rule.rate'])
})

test('a union keeps its picker unless told otherwise, and a path no branch has says so', async ({
  page,
}) => {
  await makeForm(page, { rule: { fields: { amount: true, bogus: true } } })
  await expect(page.locator('#nested .schema-variant')).toBeVisible()
  await expect(page.locator('#nested .schema-unsupported')).toContainText(
    'rule.bogus'
  )
  // switching branch with the picker keeps the curation
  await page
    .locator('#nested .schema-variant')
    .selectOption({ label: 'Percent' })
  expect((await formValue(page)).rule.kind).toBe('percent')
  await expect(page.locator('#nested [data-path="rule.amount"]')).toHaveCount(0)
})

test('a section groups curated fields in a panel', async ({ page }) => {
  await makeForm(page, {
    name: 'Name',
    advanced: {
      section: 'Advanced',
      collapsed: true,
      fields: {
        retries: { caption: 'Retries' },
        name: true, // already shown above: skipped
      },
    },
    open: { section: 'Rules', fields: { rule: true } },
  })
  const advanced = page.locator('#nested details[data-section="advanced"]')
  await expect(advanced.locator('> summary')).toHaveText('Advanced')
  expect(await advanced.evaluate((el: any) => el.open)).toBe(false)
  expect(
    await page
      .locator('#nested details[data-section="open"]')
      .evaluate((el: any) => el.open)
  ).toBe(true)
  await expect(advanced.locator('[data-field="retries"]')).toHaveCount(1)
  await expect(page.locator('#nested [data-field="name"]')).toHaveCount(1)
  expect(
    await page.evaluate(() =>
      (window as any).warnings.some((w: string) => w.includes('skipped: name'))
    )
  ).toBe(true)

  // a closed section says when something inside it is wrong
  await expect(advanced).not.toHaveClass(/-invalid/)
  await page.evaluate(() => {
    const form = document.querySelector('#nested') as any
    form.value = { ...form.value, retries: -1 }
  })
  await expect(advanced).toHaveClass(/-invalid/)
  // and it is a shown field, not a hidden one
  await expect(page.locator('#nested .schema-hidden-errors')).toBeHidden()

  // editing inside a section writes the value
  await advanced.evaluate((el: any) => (el.open = true))
  await page.locator('#nested [data-path="retries"]').fill('4')
  expect((await formValue(page)).retries).toBe(4)
  await expect(advanced).not.toHaveClass(/-invalid/)
})

test('an object or array entry can start collapsed, and sections work inside items', async ({
  page,
}) => {
  await makeForm(page, {
    thresholds: {
      collapsed: true,
      fields: {
        value: true,
        scope: { section: 'Applies to', fields: { 'when.company': true } },
      },
    },
  })
  expect(
    await page
      .locator('#nested [data-array="thresholds"]')
      .evaluate((el: any) => el.open)
  ).toBe(false)
  await expect(
    page.locator(
      '#nested details[data-section="scope"] [data-field="thresholds.1.when.company"]'
    )
  ).toHaveCount(1)
})

test('a proposal shows under its field and can be accepted or rejected', async ({
  page,
}) => {
  await makeForm(
    page,
    {
      name: 'Name',
      retries: 'Retries',
      thresholds: { fields: { value: true } },
    },
    {
      proposals: {
        name: {
          value: 'Grace',
          reason: 'Matches the contract',
          source: 'agent',
        },
        retries: { value: 5 },
        'thresholds.1.value': { value: 0.9 },
        'rule.amount': { value: 99 },
      },
    }
  )
  const proposal = page.locator('#nested [data-field="name"] .schema-proposal')
  await expect(proposal.locator('.schema-proposal-value')).toHaveText(
    'Proposed: Grace'
  )
  await expect(proposal.locator('.schema-proposal-reason')).toHaveText(
    'Matches the contract'
  )
  await expect(proposal.locator('.schema-proposal-source')).toHaveText('agent')
  // the control still holds the current value
  await expect(page.locator('#nested [data-path="name"]')).toHaveValue('Ada')
  await expect(
    page.locator('#nested [data-field="thresholds.1.value"] .schema-proposal')
  ).toContainText('0.9')
  // a proposal for a field that is not shown is not dropped silently
  await expect(page.locator('#nested .schema-hidden-proposals')).toContainText(
    'rule.amount'
  )

  await proposal.locator('.schema-accept').click()
  await expect(page.locator('#nested [data-path="name"]')).toHaveValue('Grace')
  expect((await formValue(page)).name).toBe('Grace')
  await expect(proposal).toHaveCount(0)
  expect(await page.evaluate(() => (window as any).events)).toEqual([
    'proposalaccept:name',
    'change',
  ])

  await page.locator('#nested [data-field="retries"] .schema-reject').click()
  expect((await formValue(page)).retries).toBe(2)
  await expect(
    page.locator('#nested [data-field="retries"] .schema-proposal')
  ).toHaveCount(0)
  expect(await page.evaluate(() => (window as any).events)).toEqual([
    'proposalaccept:name',
    'change',
    'proposalreject:retries',
  ])
  expect(
    await page.evaluate(() =>
      Object.keys((document.querySelector('#nested') as any).proposals)
    )
  ).toEqual(['thresholds.1.value', 'rule.amount'])

  // typing in a field leaves its proposal alone
  await page.locator('#nested [data-path="thresholds.1.value"]').fill('0.7')
  await expect(
    page.locator('#nested [data-field="thresholds.1.value"] .schema-proposal')
  ).toHaveCount(1)

  // a read-only form shows the proposal and offers no actions
  await page.evaluate(() => {
    ;(document.querySelector('#nested') as any).readOnly = true
  })
  await expect(
    page.locator('#nested [data-field="thresholds.1.value"] .schema-accept')
  ).toBeHidden()
  await page.evaluate(() => {
    ;(document.querySelector('#nested') as any).readOnly = false
  })
  await expect(
    page.locator('#nested [data-field="thresholds.1.value"] .schema-accept')
  ).toBeVisible()
})

test('proposals work on an uncurated form, and `proposalView` replaces the rendering', async ({
  page,
}) => {
  await makeForm(page, null, { proposals: { 'rule.amount': { value: 99 } } })
  await expect(
    page.locator('#nested [data-field="rule.amount"] .schema-proposal')
  ).toContainText('99')
  await expect(page.locator('#nested .schema-hidden-proposals')).toBeHidden()

  await page.evaluate(() => {
    const form = document.querySelector('#nested') as any
    form.proposalView = ({ label, current, proposal, accept, elements }: any) =>
      elements.button(
        { class: 'mine', onClick: accept },
        `${label}: ${current} -> ${proposal.value}`
      )
    form.proposals = { 'rule.amount': { value: 42 } }
  })
  const mine = page.locator('#nested .schema-proposal.mine')
  await expect(mine).toHaveText('amount: 10 -> 42')
  await mine.click()
  expect((await formValue(page)).rule.amount).toBe(42)
  await expect(page.locator('#nested .schema-proposal')).toHaveCount(0)
})

test('a schema title is shown as written', async ({ page }) => {
  await makeForm(page, null)
  await page.evaluate(() => {
    const form = document.querySelector('#nested') as any
    form.schema = {
      type: 'object',
      properties: {
        co_4711: { type: 'number', title: 'ACME_Corp-GmbH (camelCase)' },
        plainKey_here: { type: 'number' },
      },
    }
    form.value = {}
  })
  await expect(page.locator('#nested [data-field="co_4711"] label')).toHaveText(
    'ACME_Corp-GmbH (camelCase)'
  )
  await expect(
    page.locator('#nested [data-field="plainKey_here"] label')
  ).toHaveText('plain key here')
})

test('a proposal on an array, an object or a union sits on its panel and can be accepted', async ({
  page,
}) => {
  await makeForm(page, null, {
    proposals: {
      thresholds: {
        value: [
          { when: { company: 'A' }, value: 0.1 },
          { when: { company: 'B' }, value: 0.2 },
          { when: { company: 'C' }, value: 0.3 },
        ],
        reason: 'Replace the list',
      },
      rule: { value: { kind: 'percent', rate: 7 } },
      'thresholds.0.when': { value: { company: 'Zed', account: '1' } },
    },
  })
  const onArray = page.locator(
    '#nested [data-array="thresholds"] > .schema-proposal'
  )
  await expect(onArray).toContainText('Replace the list')
  await expect(
    page.locator('#nested [data-union="rule"] > .schema-proposal')
  ).toContainText('percent')
  // nothing is reported as "not shown": all three are on screen
  await expect(page.locator('#nested .schema-hidden-proposals')).toBeHidden()

  // an object inside an item
  await page
    .locator(
      '#nested .schema-proposal[data-proposal="thresholds.0.when"] .schema-accept'
    )
    .click()
  await expect(
    page.locator('#nested [data-path="thresholds.0.when.company"]')
  ).toHaveValue('Zed')

  // a whole array: the rows follow the value
  await onArray.locator('.schema-accept').click()
  await expect(
    page.locator('#nested [data-array="thresholds"] > .schema-item')
  ).toHaveCount(3)
  await expect(
    page.locator('#nested [data-path="thresholds.2.when.company"]')
  ).toHaveValue('C')
  await expect(onArray).toHaveCount(0)

  // a union: the branch follows the value
  await page
    .locator('#nested [data-union="rule"] > .schema-proposal .schema-accept')
    .click()
  await expect(page.locator('#nested [data-path="rule.rate"]')).toHaveValue('7')
})

test('setting a value with a different number of items re-fills the array', async ({
  page,
}) => {
  await makeForm(page, null)
  const rows = page.locator('#nested [data-array="thresholds"] > .schema-item')
  await expect(rows).toHaveCount(2)
  await page.evaluate(() => {
    const form = document.querySelector('#nested') as any
    form.value = {
      ...form.value,
      thresholds: [...form.value.thresholds, { value: 0.1 }, { value: 0.2 }],
    }
  })
  await expect(rows).toHaveCount(4)
  await expect(
    page.locator('#nested [data-path="thresholds.3.value"]')
  ).toHaveValue('0.2')
  await page.evaluate(() => {
    const form = document.querySelector('#nested') as any
    form.value = { ...form.value, thresholds: [{ value: 0.9 }] }
  })
  await expect(rows).toHaveCount(1)
  await expect(
    page.locator('#nested [data-path="thresholds.0.value"]')
  ).toHaveValue('0.9')
})

test('a proposal follows its array item when items move, and goes when its item is removed', async ({
  page,
}) => {
  await makeForm(page, null, {
    proposals: {
      'thresholds.0.value': { value: 0.11 },
      'thresholds.1.note': { value: 'changed' },
    },
  })
  const keys = () =>
    page.evaluate(() =>
      Object.keys((document.querySelector('#nested') as any).proposals)
    )
  // move the first item down: each proposal stays with its item
  await page
    .locator('#nested [data-array="thresholds"] > .schema-item')
    .first()
    .locator('.schema-move-down')
    .click()
  expect(await keys()).toEqual(['thresholds.1.value', 'thresholds.0.note'])
  await expect(
    page.locator('#nested [data-field="thresholds.1.value"] .schema-proposal')
  ).toContainText('0.11')
  expect((await formValue(page)).thresholds[1].value).toBe(0.8)

  // remove what is now the first item: its proposal goes, the other moves up
  await page
    .locator('#nested [data-array="thresholds"] > .schema-item')
    .first()
    .locator('.schema-remove')
    .click()
  expect(await keys()).toEqual(['thresholds.0.value'])
  await page
    .locator('#nested [data-field="thresholds.0.value"] .schema-accept')
    .click()
  expect((await formValue(page)).thresholds).toEqual([
    { when: { company: 'Acme', account: '4000' }, value: 0.11, note: 'first' },
  ])
})

test('a reason or source that is not a string is not rendered', async ({
  page,
}) => {
  await makeForm(page, null, {
    proposals: {
      name: {
        value: 'x',
        reason: { innerHTML: '<img class="injected" src="x">' },
        source: { innerHTML: '<b class="injected">hi</b>' },
      },
      retries: { value: 1, reason: '<img class="injected" src="x">' },
    },
  })
  await expect(
    page.locator('#nested [data-field="name"] .schema-proposal')
  ).toHaveCount(1)
  await expect(page.locator('#nested .injected')).toHaveCount(0)
  // a markup STRING is shown as text
  await expect(
    page.locator('#nested [data-field="retries"] .schema-proposal-reason')
  ).toHaveText('<img class="injected" src="x">')
  // and a title that is not a string falls back to the key
  await page.evaluate(() => {
    const form = document.querySelector('#nested') as any
    form.schema = {
      type: 'object',
      properties: {
        evil: {
          type: 'string',
          title: { innerHTML: '<b class="injected">x</b>' },
        },
      },
    }
  })
  await expect(page.locator('#nested [data-field="evil"] label')).toHaveText(
    'evil'
  )
  await expect(page.locator('#nested .injected')).toHaveCount(0)
})

test('deciding a proposal keeps keyboard focus in the form', async ({
  page,
}) => {
  await makeForm(
    page,
    { name: { readOnly: true }, retries: true },
    { proposals: { name: { value: 'Grace' }, retries: { value: 9 } } }
  )
  // the field is locked by the curation, and its proposal can still be accepted
  await expect(page.locator('#nested [data-path="name"]')).toBeDisabled()
  await page.locator('#nested [data-field="name"] .schema-accept').focus()
  await page.keyboard.press('Enter')
  expect((await formValue(page)).name).toBe('Grace')
  // the field cannot take focus, so the next proposal does
  await expect(
    page.locator('#nested [data-field="retries"] .schema-accept')
  ).toBeFocused()
  await page.locator('#nested [data-field="retries"] .schema-reject').focus()
  await page.keyboard.press('Enter')
  // nothing left to decide: the field itself
  await expect(page.locator('#nested [data-path="retries"]')).toBeFocused()
})

test('a read-only form does not accept through a custom view either', async ({
  page,
}) => {
  await makeForm(page, null, { proposals: { name: { value: 'Grace' } } })
  await page.evaluate(() => {
    const form = document.querySelector('#nested') as any
    form.proposalView = ({ readOnly, current, accept, elements }: any) =>
      elements.button(
        { class: 'mine', onClick: accept },
        `${readOnly}:${current}`
      )
    form.readOnly = true
  })
  const mine = page.locator('#nested .schema-proposal.mine')
  await expect(mine).toHaveText('true:Ada')
  await mine.click()
  expect((await formValue(page)).name).toBe('Ada')
  // the view is rebuilt when the form becomes editable, and when the value changes
  await page.evaluate(() => {
    const form = document.querySelector('#nested') as any
    form.readOnly = false
    form.value = { ...form.value, name: 'Bea' }
  })
  await expect(mine).toHaveText('false:Bea')
  await mine.click()
  expect((await formValue(page)).name).toBe('Grace')
})

test('an entry that starts collapsed says when something inside it is wrong', async ({
  page,
}) => {
  await makeForm(page, { thresholds: { collapsed: true } })
  const panel = page.locator('#nested [data-array="thresholds"]')
  await expect(panel).not.toHaveClass(/-invalid/)
  await page.evaluate(() => {
    const form = document.querySelector('#nested') as any
    const next = structuredClone(form.value)
    next.thresholds[0].value = 5
    form.value = next
  })
  await expect(panel).toHaveClass(/-invalid/)
})

test('an array item stacks its fields and keeps its buttons beside the first', async ({
  page,
}) => {
  await makeForm(page, null)
  const item = page
    .locator('#nested [data-array="thresholds"] > .schema-item')
    .first()
  const value = await item
    .locator('[data-field="thresholds.0.value"]')
    .boundingBox()
  const note = await item
    .locator('[data-field="thresholds.0.note"]')
    .boundingBox()
  const controls = await item.locator('> .schema-item-controls').boundingBox()
  expect(note!.x).toBe(value!.x)
  expect(note!.y).toBeGreaterThan(value!.y)
  expect(controls!.x).toBeGreaterThanOrEqual(value!.x + value!.width)
  expect(controls!.y).toBeLessThan(value!.y)
})
