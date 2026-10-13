import { test, expect } from '@playwright/test'

/*
The two tjs-lang features tosijs-ui feature-detects, against the tjs-lang the site actually
serves (GitHub #210 item 5, #216 item 3):

- `stripExports` (0.14.0-rc.4 on): a `tjs` or `ts` example written as a module runs;
- `prelude` / `body` (0.14.0-rc.5 on): a console line has its own value and its JavaScript.

Every other test of these uses a stand-in, so this is the one that holds the real contract.
The pinned tjs-lang has both since 1.16.17, so a served bundle WITHOUT them is a failure
here, not a skip: a build that stopped shipping `/tjs/` would otherwise pass by not running.
*/
const requireServed = async (page: import('@playwright/test').Page) => {
  const found = await page.evaluate(async () => {
    const base = (globalThis as any).__TJS_LOCAL_BASE
    if (typeof base !== 'string') return { base: false }
    const m = await import(/* @vite-ignore */ `${base}tjs-browser.js`)
    return {
      base: true,
      strip: typeof m.stripExports === 'function',
      prelude:
        'prelude' in m.tjs('1 == 1', { dialect: 'tjs', runTests: false }),
    }
  })
  expect(found).toEqual({ base: true, strip: true, prelude: true })
}

const mount = (
  page: import('@playwright/test').Page,
  dialect: string,
  js: string,
  options: Record<string, unknown> = {}
) =>
  page.evaluate(
    async ({ dialect, js, options }) => {
      const example = (window as any).xinjsui.liveExample({ id: 'rc-example' })
      example.dialect = dialect
      example.options = options
      example.js = js
      document.querySelector('main, body')!.prepend(example)
      await example.whenHydrated
    },
    { dialect, js, options }
  )

test.beforeEach(async ({ page }) => {
  await page.goto('/component/')
  await page.waitForFunction(() => (window as any).xinjsui?.liveExample)
})

test('a tjs example written as a module runs', async ({ page }) => {
  await requireServed(page)
  await mount(
    page,
    'tjs',
    `export const five = 5\nexport function next(n: 0) { return n + 1 }\npreview.textContent = 'tjs says ' + next(five)`
  )
  await expect(page.locator('#rc-example .preview')).toHaveText('tjs says 6')
})

test('a ts example written as a module runs', async ({ page }) => {
  await requireServed(page)
  await mount(
    page,
    'ts',
    `export const five: number = 5\nexport function next(n: number): number { return n + 1 }\npreview.textContent = 'ts says ' + next(five)`
  )
  // generous: the first ts example fetches the TypeScript compiler
  await expect(page.locator('#rc-example .preview')).toHaveText('ts says 6', {
    timeout: 30_000,
  })
})

test('a tjs console line has its own value and its JavaScript', async ({
  page,
}) => {
  await requireServed(page)
  await mount(page, 'tjs', `const x = 5\npreview.textContent = 'ready'`, {
    view: 'console',
  })
  const example = page.locator('#rc-example')
  const field = example.locator('textarea.console-field')
  const result = example.locator('.console-result').last()
  const say = async (line: string) => {
    await field.fill(line)
    await field.press('Enter')
  }
  await say("x == '5'")
  await expect(result).toHaveText('false')
  await say("const z = x == '5'")
  await expect(result).toHaveText('undefined')
  await say('await Promise.resolve(x) == 5')
  await expect(result).toHaveText('true')
  const input = example.locator('.console-input').first()
  await input.getByRole('button', { name: 'JS' }).click()
  await expect(input.locator('.console-js')).toContainText('Eq(x,')
})
