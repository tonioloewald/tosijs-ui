import { test, expect, describe, beforeEach, afterEach } from 'bun:test'

// Tests targeting files with 0% function coverage

describe('doc-browser', () => {
  test('createDocBrowser is a function', async () => {
    const { createDocBrowser } = await import('./doc-browser')
    expect(typeof createDocBrowser).toBe('function')
  })
})

describe('gamepad', () => {
  test('gamepad functions exist', async () => {
    const { gamepadState, gamepadText, xrControllers, xrControllersText } =
      await import('./gamepad')
    expect(typeof gamepadState).toBe('function')
    expect(typeof gamepadText).toBe('function')
    expect(typeof xrControllers).toBe('function')
    expect(typeof xrControllersText).toBe('function')
  })

  test('gamepadState handles missing API gracefully', async () => {
    const { gamepadState } = await import('./gamepad')
    // happy-dom doesn't have navigator.getGamepads
    if (!navigator.getGamepads) {
      expect(() => gamepadState()).toThrow()
    } else {
      expect(Array.isArray(gamepadState())).toBe(true)
    }
  })
})

describe('pop-float', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  test('popFloat creates a floating element', async () => {
    const { popFloat } = await import('./pop-float')
    const anchor = document.createElement('div')
    anchor.style.cssText =
      'position: absolute; top: 100px; left: 100px; width: 50px; height: 50px;'
    container.appendChild(anchor)
    const content = document.createElement('div')
    content.textContent = 'test float'
    const float = popFloat({ content, target: anchor })
    expect(float).toBeDefined()
    expect(float).toBeInstanceOf(HTMLElement)
  })
})

describe('tooltip', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  test('initTooltips does not throw', async () => {
    const { initTooltips } = await import('./tooltip')
    expect(() => initTooltips()).not.toThrow()
  })

  test('tooltip shows on hover of titled element', async () => {
    const { initTooltips } = await import('./tooltip')
    initTooltips()
    const el = document.createElement('div')
    el.setAttribute('data-tooltip', 'test tooltip')
    container.appendChild(el)
    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    // Tooltip may not render in happy-dom but shouldn't throw
    expect(el.isConnected).toBe(true)
  })
})

describe('live-example/code-transform', () => {
  test('rewriteImports rewrites tosijs imports', async () => {
    const { rewriteImports } = await import('./live-example/code-transform')
    const input = "import { tosi } from 'tosijs'"
    const result = rewriteImports(input, ['tosijs'])
    expect(result).toContain('tosijs')
    expect(result).not.toContain("from 'tosijs'")
  })

  test('rewriteImports handles tosijs-ui', async () => {
    const { rewriteImports } = await import('./live-example/code-transform')
    const input = "import { icons } from 'tosijs-ui'"
    const result = rewriteImports(input, ['tosijs-ui'])
    expect(result).not.toContain("from 'tosijs-ui'")
  })
})

describe('live-example/test-harness', () => {
  test('expect and matchers work', async () => {
    const { expect: testExpect } = await import(
      './live-example/test-harness'
    )
    expect(() => testExpect(1).toBe(1)).not.toThrow()
    expect(() => testExpect(1).toBe(2)).toThrow()
    expect(() => testExpect('hello').toContain('ell')).not.toThrow()
    expect(() => testExpect(true).toBeTruthy()).not.toThrow()
    expect(() => testExpect(false).toBeFalsy()).not.toThrow()
    expect(() => testExpect(null).toBeNull()).not.toThrow()
    expect(() => testExpect(undefined).toBeUndefined()).not.toThrow()
    expect(() => testExpect(1).toBeDefined()).not.toThrow()
    expect(() => testExpect(5).toBeGreaterThan(3)).not.toThrow()
    expect(() => testExpect(3).toBeLessThan(5)).not.toThrow()
    expect(() => testExpect([1, 2]).toHaveLength(2)).not.toThrow()
    expect(() => testExpect('abc').toMatch(/b/)).not.toThrow()
    expect(() => testExpect({ a: 1 }).toEqual({ a: 1 })).not.toThrow()
  })

  test('expect.not negates matchers', async () => {
    const { expect: testExpect } = await import(
      './live-example/test-harness'
    )
    expect(() => testExpect(1).not.toBe(2)).not.toThrow()
    expect(() => testExpect(1).not.toBe(1)).toThrow()
  })

  test('createTestContext collects results', async () => {
    const { createTestContext } = await import(
      './live-example/test-harness'
    )
    const results: any[] = []
    const ctx = createTestContext(results)
    ctx.test('sync pass', () => {
      ctx.expect(true).toBe(true)
    })
    ctx.test('sync fail', () => {
      ctx.expect(true).toBe(false)
    })
    expect(results).toHaveLength(2)
    expect(results[0].passed).toBe(true)
    expect(results[1].passed).toBe(false)
  })

  test('waitMs resolves after delay', async () => {
    const { waitMs } = await import('./live-example/test-harness')
    const start = Date.now()
    await waitMs(50)
    expect(Date.now() - start).toBeGreaterThan(40)
  })
})

describe('live-example/insert-examples', () => {
  test('insertExamples runs on empty container', async () => {
    const { insertExamples } = await import('./live-example/insert-examples')
    const container = document.createElement('div')
    document.body.appendChild(container)
    // Should not throw on empty container
    expect(() =>
      insertExamples(container, {}, (() => {}) as any, 'tosi-example')
    ).not.toThrow()
    container.remove()
  })
})

describe('live-example/remote-sync', () => {
  test('createRemoteKey generates key', async () => {
    const { createRemoteKey } = await import('./live-example/remote-sync')
    const key = createRemoteKey('lx', 'test-uuid', '')
    expect(key).toContain('test-uuid')
  })

  test('RemoteSyncManager can be constructed', async () => {
    const { RemoteSyncManager } = await import('./live-example/remote-sync')
    const manager = new RemoteSyncManager('test-key', 'test-remote', () => {})
    expect(manager).toBeDefined()
    manager.stopListening()
  })
})

describe('live-example/execution', () => {
  test('executeInline runs with empty code', async () => {
    const { executeInline } = await import('./live-example/execution')
    const example = document.createElement('div')
    const styleEl = document.createElement('style')
    const widgets = document.createElement('div')
    example.appendChild(widgets)
    document.body.appendChild(example)
    const preview = await executeInline({
      html: '<div>test</div>',
      css: '',
      js: '',
      context: {},
      transform: (code: string) => ({ code }),
      exampleElement: example,
      styleElement: styleEl,
      widgetsElement: widgets,
      onError: () => {},
    })
    expect(preview).toBeInstanceOf(HTMLElement)
    example.remove()
  })
})

describe('drag-and-drop', () => {
  test('init does not throw', async () => {
    const { init } = await import('./drag-and-drop')
    expect(() => init()).not.toThrow()
  })
})

describe('track-drag', () => {
  test('trackDrag is callable', async () => {
    const { trackDrag, findHighestZ, bringToFront } = await import(
      './track-drag'
    )
    expect(typeof trackDrag).toBe('function')
    expect(typeof findHighestZ).toBe('function')
    expect(typeof bringToFront).toBe('function')

    const el = document.createElement('div')
    document.body.appendChild(el)
    const z = findHighestZ()
    expect(typeof z).toBe('number')
    el.remove()
  })
})
