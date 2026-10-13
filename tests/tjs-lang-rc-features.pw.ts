import { test, expect } from '@playwright/test'

/*
The two tjs-lang features 1.16.16 feature-detects, against the tjs-lang the site actually
serves (GitHub #210 item 5, #216 item 3):

- `stripExports` (0.14.0-rc.4 on): a `tjs` or `ts` example written as a module runs;
- `prelude` / `body` (0.14.0-rc.5 on): a console line has its own value and its JavaScript.

SKIPPED while the pinned tjs-lang predates them, which it does at the time of writing
(0.13.13): every other test of these uses a stand-in. This one starts running, unchanged,
the day the devDependency moves, and is what was run by hand with rc.5 swapped in.
*/
const served = async (page: import('@playwright/test').Page) =>
  page.evaluate(async () => {
    const base = (globalThis as any).__TJS_LOCAL_BASE
    if (typeof base !== 'string') return { strip: false, prelude: false }
    const m = await import(/* @vite-ignore */ `${base}tjs-browser.js`)
    return {
      strip: typeof m.stripExports === 'function',
      prelude:
        'prelude' in m.tjs('1 == 1', { dialect: 'tjs', runTests: false }),
    }
  })

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
  test.skip(!(await served(page)).strip, 'served tjs-lang has no stripExports')
  await mount(
    page,
    'tjs',
    `export const five = 5\nexport function next(n: 0) { return n + 1 }\npreview.textContent = 'tjs says ' + next(five)`
  )
  await expect(page.locator('#rc-example .preview')).toHaveText('tjs says 6')
})

test('a ts example written as a module runs', async ({ page }) => {
  test.skip(!(await served(page)).strip, 'served tjs-lang has no stripExports')
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
  test.skip(!(await served(page)).prelude, 'served tjs-lang has no prelude')
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
