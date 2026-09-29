import { afterEach, expect, test } from 'bun:test'
import { liveExample, testManager } from './component.js'
import { registerDialect, resetBuiltInDialectsForTests } from './dialects.js'

afterEach(() => {
  resetBuiltInDialectsForTests()
})

/*
1.16.1 review B2: the build-time bake is made by the PINNED transpiler, so a site that replaced
`tjs` got its override in dev (tests on: no bake) and the pinned output in production (tests
off: bake). The bake must only run for a built-in dialect.
*/
async function run(): Promise<string> {
  const previous = testManager.enabled.value
  testManager.enabled.value = false // the deployed reader: this is when the bake is used
  try {
    const example: any = liveExample()
    document.body.append(example)
    await example.whenHydrated
    example.dialect = 'tjs'
    example.js = 'source'
    example.compiledJs = `preview.textContent = 'baked'`
    example.compiledJsSource = 'source'
    await example.refresh()
    const text = example.querySelector('.preview')?.textContent ?? ''
    example.remove()
    return text
  } finally {
    testManager.enabled.value = previous
  }
}

test('the built-in tjs runs its bake when tests are off', async () => {
  expect(await run()).toBe('baked')
})

test('a replaced tjs runs the override, not the pinned bake', async () => {
  registerDialect('tjs', {
    transform: () => ({ code: `preview.textContent = 'override'` }),
  })
  expect(await run()).toBe('override')
})
