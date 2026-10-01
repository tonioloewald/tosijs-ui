import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { LiveExample, liveExample, testManager } from './component.js'
import { registerDialect } from './dialects.js'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// a run dialect whose run takes `delay` ms (from the fence options)
registerDialect('slowrun', {
  run: async (_source, { options, signal }) => {
    await wait(Number(options.delay ?? 0))
    return signal.aborted ? undefined : 'done'
  },
})

// Scaled down (the default is 250ms) so these tests cost tens of ms, not seconds; every
// timing below is relative to it.
const DELAY = 20
const defaultDelay = LiveExample.runningDelayMs
beforeAll(() => {
  LiveExample.runningDelayMs = DELAY
})
afterAll(() => {
  LiveExample.runningDelayMs = defaultDelay
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
  await wait(DELAY)
  example.dialect = 'slowrun'
  example.options = { delay }
  example.js = 'x'
  return example
}

const spinner = (example: any) =>
  example.querySelector('[part="running"]') as HTMLElement

test('a slow run shows the spinner until it resolves', async () => {
  const example = await mount(DELAY * 5)
  const done = example.refresh()
  await wait(DELAY * 3)
  expect(spinner(example).hidden).toBe(false)
  await done
  expect(spinner(example).hidden).toBe(true)
  expect(example.querySelector('.dialect-result')?.textContent).toBe('done')
})

test('a fast run never shows it', async () => {
  const example = await mount(DELAY / 4)
  const seen: boolean[] = []
  const watch = setInterval(() => seen.push(!spinner(example).hidden), 2)
  await example.refresh()
  await wait(DELAY * 3)
  clearInterval(watch)
  expect(seen.some(Boolean)).toBe(false)
})

test('a superseded run does not leave it up, or take it down from the new run', async () => {
  const example = await mount(DELAY * 7) // first run: 0 → 7
  const first = example.refresh()
  await wait(DELAY * 2)
  example.options = { delay: DELAY * 10 } // second run: 2 → 12
  const second = example.refresh()
  await first // the old run finishing (at ~7) must not hide the new run's spinner
  expect(spinner(example).hidden).toBe(false)
  await second
  expect(spinner(example).hidden).toBe(true)
})

test('a rapid double refresh ends with one result and no spinner', async () => {
  const example = await mount(DELAY * 4)
  const a = example.refresh()
  const b = example.refresh() // supersedes a before a's spinner could even appear
  await Promise.all([a, b])
  expect(spinner(example).hidden).toBe(true)
  expect(example.querySelectorAll('.dialect-result').length).toBe(1)
})
