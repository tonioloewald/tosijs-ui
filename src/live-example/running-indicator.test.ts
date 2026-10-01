import { afterEach, expect, test } from 'bun:test'
import { liveExample, testManager } from './component.js'
import { registerDialect } from './dialects.js'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// a run dialect whose run takes `delay` ms (from the fence options)
registerDialect('slowrun', {
  run: async (_source, { options, signal }) => {
    await wait(Number(options.delay ?? 0))
    return signal.aborted ? undefined : 'done'
  },
})

let previous = testManager.enabled.value
afterEach(() => {
  testManager.enabled.value = previous
  document.body.textContent = ''
})

async function mount(delay: number) {
  previous = testManager.enabled.value
  testManager.enabled.value = false
  const example: any = liveExample()
  document.body.append(example)
  await example.whenHydrated
  // connecting starts a refresh of its own; let it settle (empty source, plain js) so it
  // can't start late, pick up the dialect set below, and take over the spinner
  await wait(50)
  example.dialect = 'slowrun'
  example.options = { delay }
  example.js = 'x'
  return example
}

const spinner = (example: any) =>
  example.querySelector('[part="running"]') as HTMLElement

test('a slow run shows the spinner until it resolves', async () => {
  const example = await mount(500)
  const done = example.refresh()
  await wait(350)
  expect(spinner(example).hidden).toBe(false)
  await done
  expect(spinner(example).hidden).toBe(true)
  expect(example.querySelector('.dialect-result')?.textContent).toBe('done')
})

test('a fast run never shows it', async () => {
  const example = await mount(20)
  const seen: boolean[] = []
  const watch = setInterval(() => seen.push(!spinner(example).hidden), 5)
  await example.refresh()
  await wait(300)
  clearInterval(watch)
  expect(seen.some(Boolean)).toBe(false)
})

test('a superseded run does not leave it up, or take it down from the new run', async () => {
  const example = await mount(600)
  const first = example.refresh()
  await wait(300)
  // started at ~300ms, ends at ~1100ms: still running at the ~900ms check below
  example.options = { delay: 800 }
  const second = example.refresh()
  await first // the old run finishing must not hide the new run's spinner
  await wait(300)
  expect(spinner(example).hidden).toBe(false)
  await second
  expect(spinner(example).hidden).toBe(true)
})
