import { test, expect, describe } from 'bun:test'
import { loadTransform } from './code-transform.js'
import { liveExample } from './component.js'

/*
#210 item 1: an example's inline tjs tests ran with plain-JS semantics, so passing tests were
shown FAILING. tjs-lang returns a runner built from the rewritten test bodies; we must carry
it through the transform and prefer it over the one `extractTests` builds from raw text.
*/
describe('inline tjs tests use the runner tjs() returns', () => {
  const SOURCE =
    "function id(x: 0) { return x }\ntest 'one' {\n  expect(id(1)).toBe(1)\n}\n"

  test('the tjs transform keeps testRunner beside the code', async () => {
    const transform = await loadTransform('tjs')
    const out = await transform(SOURCE)
    expect(typeof out.code).toBe('string')
    expect(typeof out.testRunner).toBe('string')
  })

  test('a source with no tests carries no runner', async () => {
    const transform = await loadTransform('tjs')
    const out = await transform('const a = 1\n')
    expect(out.testRunner).toBeUndefined()
  })

  const example = (js: string) => {
    const el = liveExample() as any
    el.js = js
    el.context = {}
    return el
  }
  const api = { testUtils: '/*utils*/', extractTests: () => ({}) } as any
  const extracted = { code: 'STRIPPED', testRunner: 'RAW_RUNNER' }

  test('the body is the WHOLE transpiled source plus the returned runner', async () => {
    const seen: string[] = []
    const transform = (code: string) => {
      seen.push(code)
      return { code: `T(${code})`, testRunner: 'REWRITTEN_RUNNER' }
    }
    const body = await example('WHOLE').inlineTjsTestBody(
      transform,
      api,
      extracted
    )
    expect(body).toBe('T(WHOLE)\n/*utils*/\nreturn REWRITTEN_RUNNER')
    // …and the test-stripped source was never transpiled: one transform, not two.
    expect(seen).toEqual(['WHOLE'])
  })

  test('an older tjs-lang returns no runner: the extractTests path stands', async () => {
    const transform = (code: string) => ({ code: `T(${code})` })
    const body = await example('WHOLE').inlineTjsTestBody(
      transform,
      api,
      extracted
    )
    expect(body).toBe('T(STRIPPED)\n/*utils*/\nreturn RAW_RUNNER')
  })
})
