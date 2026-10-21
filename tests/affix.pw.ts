import { test, expect, type Page } from './fixtures'

/*
<tosi-affix> is geometry: where the fixture lands against the content, and when it falls back.
happy-dom lays nothing out, so this is the lane that can tell.
*/

async function open(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
  await page.goto('/affix/')
  await page.waitForFunction(() => !!(window as any).xinjsui?.tosiAffix)
}

/** Build an affix with a content box and `count` 24px buttons, and report its geometry. */
async function mount(
  page: Page,
  attrs: Record<string, string | boolean>,
  size = { width: 200, height: 150 },
  count = 3
) {
  await page.evaluate(
    ({ attrs, size, count }) => {
      document.querySelector('#affix-under-test')?.remove()
      const affix = document.createElement('tosi-affix') as any
      affix.id = 'affix-under-test'
      affix.style.cssText = 'position: fixed; left: 100px; top: 100px;'
      for (const [k, v] of Object.entries(attrs))
        if (v === true) affix.setAttribute(k, '')
        else if (v !== false) affix.setAttribute(k, v as string)
      const content = document.createElement('div')
      content.className = 'content'
      content.style.cssText = `width: ${size.width}px; height: ${size.height}px; background: #ccc`
      affix.append(content)
      for (let i = 0; i < count; i++) {
        const b = document.createElement('button')
        b.slot = 'fixture'
        b.style.cssText = 'width: 24px; height: 24px; padding: 0; border: 0'
        affix.append(b)
      }
      ;(window as any).__repositions = []
      affix.addEventListener('reposition', (e: CustomEvent) =>
        (window as any).__repositions.push(e.detail)
      )
      document.body.append(affix)
    },
    { attrs, size, count }
  )
  await page.waitForTimeout(100)
}

function geometry(page: Page) {
  return page.evaluate(() => {
    const affix = document.querySelector('#affix-under-test') as any
    const box = (el: Element) => {
      const r = el.getBoundingClientRect()
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
    }
    const fixture = affix.shadowRoot.querySelector('[part="fixture"]')
    return {
      content: box(affix.querySelector('.content')),
      fixture: box(fixture),
      direction: getComputedStyle(fixture).flexDirection,
      position: affix.position,
      inside: affix.inside,
      placed: affix.getAttribute('placed'),
      repositions: (window as any).__repositions,
    }
  })
}

test('outside on the east edge: a column beside the content, top-aligned', async ({
  page,
}) => {
  await open(page)
  await mount(page, { position: 'en' })
  const g = await geometry(page)
  expect(g.fixture.left).toBe(g.content.right)
  expect(g.fixture.top).toBe(g.content.top)
  expect(g.direction).toBe('column')
  expect(g.fixture.bottom - g.fixture.top).toBeGreaterThan(72)
  expect(g.placed).toBe('en')
})

test('outside positions never overlap the content', async ({ page }) => {
  await open(page)
  for (const position of [
    'n',
    'ne',
    'nw',
    's',
    'se',
    'sw',
    'e',
    'es',
    'w',
    'wn',
  ]) {
    await mount(page, { position })
    const { fixture: f, content: c } = await geometry(page)
    const overlaps =
      f.left < c.right &&
      f.right > c.left &&
      f.top < c.bottom &&
      f.bottom > c.top
    expect(overlaps, position).toBe(false)
  }
})

test('alignment along the edge follows the second letter', async ({ page }) => {
  await open(page)
  await mount(page, { position: 'ne' })
  let g = await geometry(page)
  expect(g.fixture.bottom).toBe(g.content.top)
  expect(g.fixture.right).toBe(g.content.right)
  expect(g.direction).toBe('row')
  await mount(page, { position: 's' })
  g = await geometry(page)
  expect(g.fixture.top).toBe(g.content.bottom)
  const mid = (a: { left: number; right: number }) => (a.left + a.right) / 2
  expect(Math.abs(mid(g.fixture) - mid(g.content))).toBeLessThan(1)
  await mount(page, { position: 'ws' })
  g = await geometry(page)
  expect(g.fixture.right).toBe(g.content.left)
  expect(g.fixture.bottom).toBe(g.content.bottom)
})

test('inside: the fixture sits within the content, against its edge', async ({
  page,
}) => {
  await open(page)
  await mount(page, { position: 'en', inside: true })
  const g = await geometry(page)
  expect(g.fixture.right).toBe(g.content.right)
  expect(g.fixture.top).toBe(g.content.top)
  expect(g.fixture.left).toBeGreaterThan(g.content.left)
  expect(g.inside).toBe(true)
})

test('falls back when the fixture is longer than its edge, and comes back', async ({
  page,
}) => {
  await open(page)
  // five 24px buttons plus padding and gaps are well over 60px
  await mount(
    page,
    { position: 'en', fallback: 's inside' },
    { width: 200, height: 60 },
    5
  )
  let g = await geometry(page)
  expect(g.position).toBe('s')
  expect(g.inside).toBe(true)
  expect(g.placed).toBe('s inside')
  expect(g.direction).toBe('row')
  expect(g.fixture.bottom).toBe(g.content.bottom)
  // the content grows tall enough: back on the east edge
  await page.evaluate(() => {
    ;(
      document.querySelector('#affix-under-test .content') as HTMLElement
    ).style.height = '300px'
  })
  await page.waitForTimeout(100)
  g = await geometry(page)
  expect(g.position).toBe('en')
  expect(g.inside).toBe(false)
  expect(g.fixture.left).toBe(g.content.right)
  // the event reported each placement as it happened, the last one where it is now
  expect(g.repositions.at(-1)).toEqual({ position: 'en', inside: false })
  expect(g.repositions).toContainEqual({ position: 's', inside: true })
})

test('setting position sets the wanted place; reading it gives the actual one', async ({
  page,
}) => {
  await open(page)
  await mount(
    page,
    { position: 'nw', fallback: 'en' },
    { width: 40, height: 150 },
    5
  )
  const result = await page.evaluate(async () => {
    const affix = document.querySelector('#affix-under-test') as any
    const before = { position: affix.position, inside: affix.inside }
    const wantedBefore = affix.wanted
    affix.position = 'en'
    await new Promise((r) => setTimeout(r, 100))
    return {
      before,
      wantedBefore,
      after: { position: affix.position, inside: affix.inside },
      wanted: affix.wanted,
      attribute: affix.getAttribute('position'),
    }
  })
  // 40px is too narrow for a row of five buttons along the top edge, so it fell back to en;
  // then asking for en directly reads the same, and remembers en as the wanted place
  expect(result.before).toEqual({ position: 'en', inside: false })
  expect(result.wantedBefore).toEqual({ position: 'nw', inside: false })
  expect(result.after).toEqual({ position: 'en', inside: false })
  expect(result.wanted).toEqual({ position: 'en', inside: false })
  // reading never writes the actual place back over what was asked for
  expect(result.attribute).toBe('nw')
})

test('an empty fixture slot takes no room', async ({ page }) => {
  await open(page)
  await mount(page, { position: 'en' }, undefined, 0)
  const width = await page.evaluate(
    () =>
      document.querySelector('#affix-under-test')!.getBoundingClientRect().width
  )
  expect(width).toBe(200)
})

test('hidden hides it: its grid display does not override [hidden]', async ({
  page,
}) => {
  await open(page)
  await mount(page, { position: 'en', hidden: true })
  const box = await page.evaluate(() =>
    document
      .querySelector('#affix-under-test')!
      .getBoundingClientRect()
      .toJSON()
  )
  expect(box.width).toBe(0)
  expect(box.height).toBe(0)
})
