import { test, expect } from './fixtures'

/*
#216: a fence opens its example with the code showing, in the page.

The unit tests cover the state. What only a browser can show is the claim itself: two panes
side by side, neither full-screen, and a console you can type into where the preview was.
*/
const example = (page: any, view: string) =>
  page.locator(`tosi-example[data-options*='"view":"${view}"']`)

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/component/')
  await page.waitForFunction(
    () => document.querySelectorAll('tosi-example[data-options]').length > 0
  )
})

test('view: code shows the preview beside the editor, in the page', async ({
  page,
}) => {
  const host = example(page, 'code')
  await host.scrollIntoViewIfNeeded()
  const editors = host.locator('.code-editors')
  await expect(editors).toBeVisible()
  await expect(host).not.toHaveClass(/-maximize/)
  const button = host.locator('.preview button')
  await expect(button).toBeVisible()
  const [left, right, whole] = await Promise.all([
    host.locator('.preview').boundingBox(),
    editors.boundingBox(),
    host.boundingBox(),
  ])
  // Side by side, inside the example's own box, which is nowhere near the viewport's size.
  expect(right!.x).toBeGreaterThanOrEqual(left!.x + left!.width - 1)
  expect(whole!.height).toBeLessThan(500)
  // The way out is on screen: at the reading column's width the tab bar used to push it off.
  const close = await host.locator('button[title="close code"]').boundingBox()
  // +1: WebKit reports the flush-right button a 64th of a pixel past the box.
  expect(close!.x + close!.width).toBeLessThanOrEqual(
    whole!.x + whole!.width + 1
  )
  // The example still works with the code open.
  await button.click()
  await expect(button).toHaveText('clicked 1 times')
})

/*
#252: inline, the toolbar column beside the preview went: it stood between the preview and its
code. Its controls are in the code panel's tab bar, with a refresh button, since editing does
not re-run an example.
*/
test('view: code keeps its controls in the tab bar, and the preview touches the code', async ({
  page,
}) => {
  const host = example(page, 'code')
  await host.scrollIntoViewIfNeeded()
  const editors = host.locator('.code-editors')
  await expect(editors).toBeVisible()
  const fixture = () =>
    host
      .locator('[part="example"]')
      .evaluate(
        (el: Element) =>
          getComputedStyle(el.shadowRoot!.querySelector('[part="fixture"]')!)
            .display
      )
  expect(await fixture()).toBe('none')
  await expect(host.locator('button[title="view/edit code"]')).toBeHidden()
  const code = await editors.boundingBox()
  const content = await host
    .locator('[part="example"]')
    .evaluate(
      (el: Element) =>
        el
          .shadowRoot!.querySelector('[part="content"]')!
          .getBoundingClientRect().right
    )
  expect(code!.x - content).toBeLessThanOrEqual(1)

  // Refresh re-runs the example: its click count starts again.
  const button = host.locator('.preview button')
  await button.click()
  await expect(button).toHaveText('clicked 1 times')
  await editors.locator('button[title="refresh"]').click()
  await expect(host.locator('.preview button')).toHaveText('clicked 0 times')

  // Maximize from the tab bar; the toolbar comes back inside, and restoring returns inline.
  await editors.locator('button[title="toggle preview size"]').click()
  await expect(host).toHaveClass(/-maximize/)
  expect(await fixture()).not.toBe('none')
  await expect(
    editors.locator('button[title="toggle preview size"]')
  ).toBeHidden()
  await host
    .locator('[part="exampleWidgets"] button[title="toggle preview size"]')
    .click()
  await expect(host).not.toHaveClass(/-maximize/)
  expect(await fixture()).toBe('none')
})

test("a site's exampleView opens every example in it", async ({ page }) => {
  await page.addInitScript(() => {
    ;(globalThis as any).__TOSI_EXAMPLE_VIEW = 'code'
  })
  await page.goto('/rating/')
  const host = page.locator('tosi-example').first()
  await host.scrollIntoViewIfNeeded()
  await expect(host).toHaveClass(/-inline-code/)
  await expect(host.locator('.code-editors')).toBeVisible()
})

test("a page's exampleView opens its examples in it, and leaves the next page's alone", async ({
  page,
}) => {
  await page.goto('/readme/')
  await page.waitForFunction(() => (window as any).xinjsui?.createDocBrowser)
  const result = await page.evaluate(async () => {
    const ui: any = (window as any).xinjsui
    const example = "```js\npreview.append('hi')\n```"
    const docs = [
      {
        filename: 'a.md',
        title: 'Alpha',
        path: 'a.md',
        exampleView: 'code',
        text: `# Alpha\n\n${example}`,
      },
      {
        filename: 'b.md',
        title: 'Beta',
        path: 'b.md',
        text: `# Beta\n\n${example}`,
      },
    ]
    const settle = () => (globalThis as any).__settled()
    const box = document.createElement('div')
    box.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#fff'
    document.body.append(box)
    const browser = ui.createDocBrowser({
      docs,
      projectName: 'probe',
      routing: 'memory',
      initialRoute: 'a',
    })
    box.append(browser)
    await settle()
    const view = async () => {
      const el = browser.querySelector('.doc-content tosi-example')
      await el.refresh()
      return el.initialView
    }
    const shown = [await view()]
    browser.navigate('b')
    await settle()
    shown.push(await view())
    box.remove()
    return shown
  })
  expect(result).toEqual(['code', 'preview'])
})

test('view: console puts a working console where the preview would be', async ({
  page,
}) => {
  const host = example(page, 'console')
  await host.scrollIntoViewIfNeeded()
  const dock = host.locator('[part="example"] > .example-console')
  await expect(dock).toBeVisible()
  await expect(host).not.toHaveClass(/-maximize/)
  await expect(dock).toContainText('total is 6')
  const [left, right] = await Promise.all([
    dock.boundingBox(),
    host.locator('.code-editors').boundingBox(),
  ])
  expect(right!.x).toBeGreaterThanOrEqual(left!.x + left!.width - 1)
  // Type a line, see the answer, in the example's own scope.
  const field = dock.locator('textarea')
  await field.fill('total * 2')
  await field.press('Enter')
  await expect(dock.locator('.console-result').last()).toHaveText('12')
  // Closing the code returns the example to what it would otherwise have shown.
  await host.locator('button[title="close code"]').click()
  await expect(host.locator('.code-editors')).toBeHidden()
  await expect(dock).toHaveCount(0)
})

test('in a narrow column the two panes stack', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/component/')
  const host = example(page, 'code')
  await host.scrollIntoViewIfNeeded()
  const editors = host.locator('.code-editors')
  await expect(editors).toBeVisible()
  const [top, bottom] = await Promise.all([
    host.locator('[part="example"]').boundingBox(),
    editors.boundingBox(),
  ])
  expect(bottom!.y).toBeGreaterThanOrEqual(top!.y + top!.height - 1)
  expect(top!.height).toBeGreaterThan(200)
})

/*
#219: in an inline view the test result is where a beginner sees it, and the tabs are only
the ones this example has.
*/
const tabNames = (host: any) =>
  host.evaluate((el: any) =>
    el.parts.editors.bodies.map((b: Element) => b.getAttribute('name'))
  )

for (const testsOn of [true, false]) {
  test(`view: code shows its test result under the preview (page tests ${
    testsOn ? 'on' : 'off, as on a deployed site'
  })`, async ({ page }) => {
    await page.addInitScript(
      (on) => localStorage.setItem('tosijs-ui-tests-enabled', String(on)),
      testsOn
    )
    await page.goto('/component/')
    expect(
      await page.evaluate(() =>
        document.body.classList.contains('tests-enabled')
      )
    ).toBe(testsOn)
    const host = example(page, 'code')
    await host.scrollIntoViewIfNeeded()
    const status = host.locator('[part="testStatus"]')
    await expect(status).toBeVisible()
    await expect(status).toHaveText('✓ 1/1 test passed')
    await expect(status).toHaveClass(/test-pass/)

    // Inside the example pane, along its bottom, and not over the button it reports on.
    const [strip, pane, button] = await Promise.all([
      status.boundingBox(),
      host.locator('[part="example"]').boundingBox(),
      host.locator('.preview button').boundingBox(),
    ])
    expect(
      Math.abs(strip!.y + strip!.height - (pane!.y + pane!.height))
    ).toBeLessThan(2)
    expect(button!.y + button!.height).toBeLessThanOrEqual(strip!.y)

    // A failure is the line, in red, with what went wrong.
    await host.evaluate((el: any) => {
      el.test = "test('two is three', () => { expect(2).toBe(3) })"
      return el.refresh()
    })
    await expect(status).toHaveClass(/test-fail/)
    await expect(status).toContainText('✗ two is three')
    await expect(status).toContainText('3')
    // The floating results panel says the same thing; it stays out of the way here.
    await expect(host.locator('[part="testResults"]')).toBeHidden()

    // Clicking the line opens the tab that has the detail.
    await status.click()
    expect(
      await host.evaluate(
        (el: any) =>
          el.parts.editors.bodies[el.parts.editors.value] === el.parts.test
      )
    ).toBe(true)
  })
}

test('an inline view shows only the tabs the example has; the full view shows them all', async ({
  page,
}) => {
  const host = example(page, 'code')
  await host.scrollIntoViewIfNeeded()
  await expect(host.locator('.code-editors')).toBeVisible()
  // js + its test block, no html or css; the console is a tab here.
  expect(await tabNames(host)).toEqual(['js', 'DOM tests', 'Console'])
  expect(
    await host.evaluate((el: any) => getComputedStyle(el.parts.html).display)
  ).toBe('none')

  // The console example has one block and its console is docked: one tab.
  const consoleHost = example(page, 'console')
  await consoleHost.scrollIntoViewIfNeeded()
  await expect(consoleHost.locator('.code-editors')).toBeVisible()
  expect(await tabNames(consoleHost)).toEqual(['js'])
  // No tests, so no status line taking room from the console.
  await expect(consoleHost.locator('[part="testStatus"]')).toBeHidden()

  // Full-screen is where you add a block, so every tab is back, in the original order.
  await host.evaluate((el: any) => el.showCode())
  expect(await tabNames(host)).toEqual([
    'js',
    'html',
    'css',
    'DOM tests',
    'Console',
  ])
  await expect(host.locator('[part="testStatus"]')).toBeHidden()
})

test('a tjs inline-test failure has a tab to open, even when the view opened before the run finished', async ({
  page,
}) => {
  /*
  On a deployed site (tests off) an inline view opens as it nears the viewport, while the
  first run is still waiting for the transpiler. The tabs were set up then, with no test
  results yet, and the "tjs tests" tab was never added: the status line reported a failure
  and clicking it did nothing.
  */
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
  await page.goto('/component/')
  const host = page.locator('tosi-example:has(.preview .badge)').first()
  await host.scrollIntoViewIfNeeded()
  await expect(host.locator('.preview .badge')).toBeVisible()
  // Open the view first (no inline tests have run: tests are off and the build baked it)…
  await host.evaluate((el: any) => el.showInline('code'))
  expect(await tabNames(host)).not.toContain('tjs tests')
  // …then the run that finds a failing inline test.
  await host.evaluate((el: any) => {
    el.js = el.js.replace("toBe('count: 42')", "toBe('count: 43')")
    return el.refresh()
  })
  const status = host.locator('[part="testStatus"]')
  await expect(status).toHaveClass(/test-fail/)
  await expect(status).toContainText('✗ badge formats label and number')
  expect(await tabNames(host)).toContain('tjs tests')
  await status.click()
  expect(
    await host.evaluate((el: any) =>
      el.parts.editors.bodies[el.parts.editors.value].getAttribute('name')
    )
  ).toBe('tjs tests')
  await expect(host.locator('.tjs-test-results')).toContainText('✗ badge')
})
