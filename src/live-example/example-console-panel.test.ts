import { afterEach, describe, expect, spyOn, test } from 'bun:test'
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

// what the Console tab holds for the current run, as [level, text]
const lines = (example: any) =>
  example.consoleOutput.map((line: { level: string; text: string }) => [
    line.level,
    line.text,
  ])

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
    expect(spy).toHaveBeenCalledWith('hello', { n: 1 })
    example.remove()
  })
})

test('an example that logs nothing has an empty console', async () => {
  await quietly(async () => {
    const example = await mount(`preview.textContent = 'quiet'`)
    await example.refresh()
    expect(lines(example)).toEqual([])
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

test('an example that declares its own console still runs (it keeps the real console)', async () => {
  await quietly(async () => {
    const example = await mount(
      `const console = { log: (x) => (preview.textContent = 'own ' + x) }\nconsole.log(1)`
    )
    let failed: unknown
    example.addEventListener('error', (e: unknown) => (failed = e))
    await example.refresh()
    expect(example.querySelector('.preview-error')).toBe(null)
    expect(example.querySelector('.preview').textContent).toBe('own 1')
    expect(lines(example)).toEqual([])
    expect(failed).toBeUndefined()
    example.remove()
  })
})

test('a nested or destructured console, or one in a comment, is handled by the engine, not guessed', async () => {
  await quietly(async () => {
    // a nested declaration is legal with the parameter: the example console still captures
    const nested = await mount(
      `// let console = 'a comment'\nfunction f() { const console = 1; return console }\nconsole.log(f())`
    )
    await nested.refresh()
    expect(lines(nested)).toEqual([['log', '1']])
    nested.remove()

    // these redeclare the parameter: the example keeps its own and still runs
    for (const code of [
      `let a = 1, console = { log() {} }\npreview.textContent = 'ran'`,
      `const { console } = { console: { log() {} } }\npreview.textContent = 'ran'`,
    ]) {
      const example = await mount(code)
      await example.refresh()
      expect(example.querySelector('.preview-error')).toBe(null)
      expect(example.querySelector('.preview').textContent).toBe('ran')
      example.remove()
    }
  })
})

test('logged markup is shown as text, never parsed', async () => {
  await quietly(async () => {
    const example = await mount(
      `console.log('<img src=x onerror="window.__pwned = true">')`
    )
    await example.refresh()
    // render the Console tab the way the code panel does
    const view = example.buildConsoleView()
    expect(view.querySelector('img')).toBe(null)
    expect(lines(example)).toEqual([
      ['log', '<img src=x onerror="window.__pwned = true">'],
    ])
    expect((window as any).__pwned).toBeUndefined()
    example.remove()
  })
})

test('a site built with exampleConsole: false (the build stamps a global) shows no console', async () => {
  await quietly(async () => {
    ;(globalThis as any).__TOSI_EXAMPLE_CONSOLE = false // what the site build emits
    try {
      const example = await mount(`console.log('x')`)
      await example.refresh()
      expect(lines(example)).toEqual([])
      example.remove()
    } finally {
      delete (globalThis as any).__TOSI_EXAMPLE_CONSOLE
    }
  })
})

describe('the REPL', () => {
  test('an expression shows its value; the input is echoed', async () => {
    await quietly(async () => {
      const example = await mount(`preview.textContent = 'hello'`)
      await example.refresh()
      expect(await example.consoleEval('1 + 1')).toBe(2)
      expect(await example.consoleEval('preview.textContent')).toBe('hello')
      expect(lines(example)).toEqual([
        ['input', '1 + 1'],
        ['result', '2'],
        ['input', 'preview.textContent'],
        ['result', 'hello'],
      ])
      example.remove()
    })
  })

  test("it sees the example's own top-level variables, whenever it ran", async () => {
    await quietly(async () => {
      // the case that failed first time: the example ran before the console was opened
      const example = await mount(
        `const words = ['tosijs', 'tjs']\nfunction shout(w) { return w.toUpperCase() }\npreview.textContent = 'ok'`
      )
      await example.refresh()
      expect(await example.consoleEval('words.map(shout)')).toEqual([
        'TOSIJS',
        'TJS',
      ])
      // statements give their completion value, as a browser console does
      expect(await example.consoleEval('const n = 2; n * 21')).toBe(42)
      // and await works, still in the example's scope
      expect(
        await example.consoleEval('await Promise.resolve(words.length)')
      ).toBe(2)
      example.remove()
    })
  })

  test('an example that throws partway still exposes what it defined first', async () => {
    await quietly(async () => {
      const example = await mount(
        `const before = 'defined'\nthrow new Error('stop')`
      )
      await example.refresh()
      expect(await example.consoleEval('before')).toBe('defined')
      example.remove()
    })
  })

  test('await works, and statements run', async () => {
    await quietly(async () => {
      const example = await mount(`preview.textContent = 'x'`)
      await example.refresh()
      expect(await example.consoleEval('await Promise.resolve(5)')).toBe(5)
      await example.consoleEval("preview.dataset.touched = 'yes'; let n = 1")
      expect(example.querySelector('.preview').dataset.touched).toBe('yes')
      example.remove()
    })
  })

  test("an error is shown in the console, and doesn't throw", async () => {
    await quietly(async () => {
      const example = await mount(`preview.textContent = 'x'`)
      await example.refresh()
      expect(await example.consoleEval('nope()')).toBeUndefined()
      const [, last] = lines(example).at(-1)
      expect(last).toContain('nope')
      expect(lines(example).at(-1)[0]).toBe('error')
      example.remove()
    })
  })

  test("the REPL's console.log lands in the same console", async () => {
    await quietly(async () => {
      const example = await mount(`preview.textContent = 'x'`)
      await example.refresh()
      await example.consoleEval("console.log('from the repl')")
      expect(lines(example)).toContainEqual(['log', 'from the repl'])
      example.remove()
    })
  })
})

test('the error that stopped the example is in its console', async () => {
  await quietly(async () => {
    const example = await mount(`throw new TypeError('boom')`)
    await example.refresh()
    expect(lines(example)).toContainEqual(['error', 'TypeError: boom'])
    example.remove()
  })
})

describe('1.16.4 review', () => {
  test("C1: a 'use strict' example stays strict with the REPL hook installed", async () => {
    await quietly(async () => {
      const example = await mount(`'use strict'\nundeclaredStrictGlobal = 1`)
      await example.refresh()
      await example.consoleEval('1 + 1') // installs the hook and re-runs
      expect((globalThis as any).undeclaredStrictGlobal).toBeUndefined()
      expect(
        lines(example).some(
          ([level, text]: string[]) =>
            level === 'error' && text.startsWith('ReferenceError')
        )
      ).toBe(true)
      example.remove()
    })
  })

  test('E1: no scope hook until someone uses the REPL', async () => {
    await quietly(async () => {
      const example = await mount(`const secret = 1\npreview.textContent = 'x'`)
      await example.refresh()
      expect(example.replEvaluate).toBeUndefined() // a reader's run: no direct-eval closure
      expect(await example.consoleEval('secret')).toBe(1) // first use re-runs with it
      expect(typeof example.replEvaluate).toBe('function')
      example.remove()
    })
  })

  test('E2: past the cap, lines are counted, not formatted', async () => {
    await quietly(async () => {
      ;(globalThis as any).__formatted = 0
      const example = await mount(
        `for (let i = 0; i < 520; i++) console.log({ toJSON() { globalThis.__formatted++; return i } })`
      )
      await example.refresh()
      expect((globalThis as any).__formatted).toBe(500)
      delete (globalThis as any).__formatted
      example.remove()
    })
  })
})

describe('REPL autocomplete (Tab)', () => {
  async function ready() {
    const example = await mount(
      `const words = ['a', 'b']\nfunction shout(w) { return w }\nconst { tosi } = tosijs\npreview.textContent = 'x'`
    )
    await example.refresh()
    return example
  }

  test("after a dot: the value's properties, prototype chain included", async () => {
    await quietly(async () => {
      const example = await ready()
      const { start, options } = await example.consoleCompletions('words.le')
      expect(options).toEqual(['length'])
      expect(start).toBe('words.'.length)
      expect(
        (await example.consoleCompletions('preview.textCon')).options
      ).toContain('textContent')
      expect((await example.consoleCompletions('words.')).options).toContain(
        'map'
      )
      example.remove()
    })
  })

  test('a bare name: what the example declares, and what is in scope', async () => {
    await quietly(async () => {
      const example = await ready()
      expect((await example.consoleCompletions('wor')).options).toEqual([
        'words',
      ])
      expect((await example.consoleCompletions('sho')).options).toEqual([
        'shout',
      ])
      expect((await example.consoleCompletions('pre')).options).toContain(
        'preview'
      )
      // an empty name offers nothing, rather than every global
      expect((await example.consoleCompletions('x = ')).options).toEqual([])
      example.remove()
    })
  })

  test('typing opens a touchable list; tapping a suggestion inserts it', async () => {
    await quietly(async () => {
      const example = await ready()
      const view = example.buildConsoleView()
      document.body.append(view) // the field needs to be on the page to anchor the list
      const field = view.querySelector('textarea') as HTMLTextAreaElement
      field.value = 'words.re'
      field.setSelectionRange(8, 8)
      await example.updateCompletions()
      const options = [
        ...document.querySelectorAll(
          '.tosi-example-completions [role="option"]'
        ),
      ] as HTMLElement[]
      expect(options.map((o) => o.textContent)).toEqual([
        'reduce',
        'reduceRight',
        'reverse',
      ])
      expect(field.getAttribute('aria-expanded')).toBe('true')
      options[2].click()
      expect(field.value).toBe('words.reverse')
      expect(field.getAttribute('aria-expanded')).toBe('false')
      expect(
        document.querySelectorAll('.tosi-example-completions [role="option"]')
          .length
      ).toBe(0)
      view.remove()
      example.remove()
    })
  })

  test('keyboard: arrows move through the list, Enter inserts, Tab takes the first', async () => {
    await quietly(async () => {
      const example = await ready()
      const view = example.buildConsoleView()
      document.body.append(view)
      const field = view.querySelector('textarea') as HTMLTextAreaElement
      const key = (k: string) =>
        field.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: k,
            bubbles: true,
            cancelable: true,
          })
        )
      field.value = 'words.re'
      field.setSelectionRange(8, 8)
      await example.updateCompletions()
      key('ArrowDown')
      key('ArrowDown')
      expect(field.getAttribute('aria-activedescendant')).toMatch(/-1$/)
      key('Enter')
      expect(field.value).toBe('words.reduceRight')

      field.value = 'words.le'
      field.setSelectionRange(8, 8)
      await example.updateCompletions()
      key('Tab')
      expect(field.value).toBe('words.length')
      view.remove()
      example.remove()
    })
  })

  test('Tab with nothing to complete is not intercepted (focus can move on)', async () => {
    await quietly(async () => {
      const example = await ready()
      const view = example.buildConsoleView()
      const field = view.querySelector('textarea') as HTMLTextAreaElement
      field.value = 'words.length + '
      field.setSelectionRange(field.value.length, field.value.length)
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      })
      field.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(false)
      example.remove()
    })
  })
})
