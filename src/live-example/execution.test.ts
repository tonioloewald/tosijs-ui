import { describe, expect, test } from 'bun:test'
import { executeInline } from './execution'

// A transform that MUST NOT be called on the bake path. If it runs, the test fails
// loudly instead of silently transpiling — proving the transpiler stays untouched.
const forbiddenTransform: any = () => {
  throw new Error('transform must not be called when compiledJs is supplied')
}

function harness() {
  const exampleElement = document.createElement('div')
  const styleElement = document.createElement('style') as HTMLStyleElement
  const widgetsElement = document.createElement('div')
  exampleElement.append(styleElement, widgetsElement)
  return { exampleElement, styleElement, widgetsElement }
}

describe('executeInline with a build-time bake', () => {
  test('runs compiledJs verbatim and never calls transform', async () => {
    const { exampleElement, styleElement, widgetsElement } = harness()
    const preview = await executeInline({
      html: '<p id="target">before</p>',
      css: '',
      js: 'THIS IS NOT VALID JS — proves the source is ignored in favor of the bake',
      context: {},
      transform: forbiddenTransform,
      // Plain JS (what the tjs transform would have produced): mutate the preview.
      compiledJs: "preview.querySelector('#target').textContent = 'ran'",
      exampleElement,
      styleElement,
      widgetsElement,
      onError: (e) => {
        throw e
      },
    })
    expect(preview.querySelector('#target')?.textContent).toBe('ran')
  })

  test('still transpiles via transform when there is no bake', async () => {
    const { exampleElement, styleElement, widgetsElement } = harness()
    let called = false
    const transform: any = async (code: string) => {
      called = true
      return { code }
    }
    const preview = await executeInline({
      html: '<p id="t">x</p>',
      css: '',
      js: "preview.querySelector('#t').textContent = 'y'",
      context: {},
      transform,
      exampleElement,
      styleElement,
      widgetsElement,
      onError: (e) => {
        throw e
      },
    })
    expect(called).toBe(true)
    expect(preview.querySelector('#t')?.textContent).toBe('y')
  })
})
