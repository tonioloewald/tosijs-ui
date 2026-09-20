import { test, expect, describe } from 'bun:test'
import { printWhenReady, PrintableWindow } from './print-window'

/*
The Print path changed twice in one cycle and had no test at any tier (review F15).

Both failure modes are silent: a print dialog that opens over a half-rendered page, or one
that never opens at all. Nothing throws either way — you find out by printing.
*/
const fakeWindow = (readyState: string) => {
  const listeners: Record<string, Array<() => void>> = {}
  let printed = 0
  const win: PrintableWindow & {
    printed: () => number
    fire: (type: string) => void
    listenerCount: (type: string) => number
  } = {
    document: { readyState },
    addEventListener: (type, handler) => {
      ;(listeners[type] ??= []).push(handler)
    },
    print: () => {
      printed += 1
    },
    printed: () => printed,
    fire: (type) => listeners[type]?.forEach((h) => h()),
    listenerCount: (type) => listeners[type]?.length ?? 0,
  }
  return win
}

describe('printWhenReady (F15)', () => {
  test('an already-complete window prints without waiting for load', async () => {
    // The branch that matters in practice — a window opened with pre-rendered HTML is
    // frequently `complete` before the menu action runs, and listening for `load` there
    // would wait forever.
    const win = fakeWindow('complete')
    let highlighted = 0
    await printWhenReady(
      win,
      async () => {
        highlighted += 1
      },
      { delayMs: 0 }
    )
    await new Promise((r) => setTimeout(r, 0))

    expect(highlighted).toBe(1)
    expect(win.printed()).toBe(1)
    expect(win.listenerCount('load')).toBe(0)
  })

  test('a loading window WAITS for load, then prints', async () => {
    const win = fakeWindow('loading')
    let highlighted = 0
    const done = printWhenReady(
      win,
      async () => {
        highlighted += 1
      },
      { delayMs: 0 }
    )

    // Nothing yet — this is the regression that dropping the `load` wait caused.
    expect(highlighted).toBe(0)
    expect(win.printed()).toBe(0)
    expect(win.listenerCount('load')).toBe(1)

    win.fire('load')
    await done
    await new Promise((r) => setTimeout(r, 0))
    expect(highlighted).toBe(1)
    expect(win.printed()).toBe(1)
  })

  test('a FAILING highlight still prints — plain code beats no dialog', async () => {
    const win = fakeWindow('complete')
    await printWhenReady(
      win,
      async () => Promise.reject(new Error('no grammar')),
      {
        delayMs: 0,
      }
    )
    await new Promise((r) => setTimeout(r, 0))
    expect(
      win.printed(),
      'the reader asked for a document; an un-highlighted one is a worse document, ' +
        'not no document'
    ).toBe(1)
  })

  test('highlighting happens BEFORE print, not alongside it', async () => {
    // The ordering is the whole point: printing mid-highlight is the race the `load` wait
    // and this sequencing exist to prevent.
    const order: string[] = []
    const win = fakeWindow('complete')
    const w = win as PrintableWindow & { printed: () => number }
    ;(w as any).print = () => order.push('print')
    await printWhenReady(
      w,
      /*
      Must AWAIT before recording. A highlight that pushes synchronously lands before a
      deferred `print()` whatever the code does, so the first version of this test passed
      against a mutant that printed first — vacuous. Real highlighting resolves
      asynchronously (it loads grammars), so the fake has to as well.
      */
      async () => {
        await new Promise((r) => setTimeout(r, 0))
        order.push('highlight')
      },
      { delayMs: 0 }
    )
    await new Promise((r) => setTimeout(r, 0))
    expect(order).toEqual(['highlight', 'print'])
  })
})
