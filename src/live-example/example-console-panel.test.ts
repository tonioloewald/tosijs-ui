import { afterEach, expect, spyOn, test } from 'bun:test'
import { liveExample, testManager } from './component.js'
import { setExampleConsole } from './example-console.js'

afterEach(() => setExampleConsole(true))

async function mount(js: string, options?: Record<string, unknown>) {
  const example: any = liveExample()
  document.body.append(example)
  await example.whenHydrated
  if (options) example.options = options
  example.js = js
  return example
}

const lines = (example: any) =>
  [...example.querySelectorAll('[part="console"] .console-line')].map(
    (el: Element) => [
      el.className.replace('console-line console-', ''),
      el.textContent,
    ]
  )

async function quietly<T>(fn: () => Promise<T>): Promise<T> {
  // the example console forwards to the real one; keep the test output clean
  const spies = (['log', 'warn', 'error'] as const).map((m) =>
    spyOn(console, m).mockImplementation(() => {})
  )
  const previous = testManager.enabled.value
  testManager.enabled.value = false
  try {
    return await fn()
  } finally {
    testManager.enabled.value = previous
    spies.forEach((s) => s.mockRestore())
  }
}

test('what an example logs appears under its preview, by level, and still reaches devtools', async () => {
  await quietly(async () => {
    const spy = console.log as any
    const example = await mount(
      `console.log('hello', { n: 1 }); console.warn('careful'); console.error('bad')`
    )
    await example.refresh()
    expect(lines(example)).toEqual([
      ['log', 'hello {\n  "n": 1\n}'],
      ['warn', 'careful'],
      ['error', 'bad'],
    ])
    expect(example.classList.contains('-has-console')).toBe(true)
    expect(spy).toHaveBeenCalledWith('hello', { n: 1 })
    example.remove()
  })
})

test('an example that logs nothing has no console and its layout is unchanged', async () => {
  await quietly(async () => {
    const example = await mount(`preview.textContent = 'quiet'`)
    await example.refresh()
    expect(example.querySelector('[part="console"]').hidden).toBe(true)
    expect(example.classList.contains('-has-console')).toBe(false)
    example.remove()
  })
})

test("a re-run starts a clean console, and a previous run's late log is dropped", async () => {
  await quietly(async () => {
    const example = await mount(
      `console.log('now'); setTimeout(() => console.log('late'), 30)`
    )
    await example.refresh()
    example.js = `console.log('second run')`
    await example.refresh()
    await new Promise((r) => setTimeout(r, 60))
    expect(lines(example)).toEqual([['log', 'second run']])
    example.remove()
  })
})

test('{"console": false} on the fence, or setExampleConsole(false), turns it off', async () => {
  await quietly(async () => {
    const fence = await mount(`console.log('x')`, { console: false })
    await fence.refresh()
    expect(lines(fence)).toEqual([])
    fence.remove()

    setExampleConsole(false)
    const page = await mount(`console.log('x')`)
    await page.refresh()
    expect(lines(page)).toEqual([])
    page.remove()
  })
})

test('a logging loop is capped, with a count of what was dropped', async () => {
  await quietly(async () => {
    const example = await mount(`for (let i = 0; i < 520; i++) console.log(i)`)
    await example.refresh()
    const all = lines(example)
    expect(all.length).toBe(501)
    expect(all[499]).toEqual(['log', '499'])
    expect(all[500][1]).toBe('… 20 more (see the browser console)')
    example.remove()
  })
})
