import { expect, spyOn, test } from 'bun:test'
import { liveExample, testManager } from './component.js'

/*
A run replaced by a newer one must not go on to run its tests.

Found through tests/off-localhost-tests.pw.ts, which turns tests on (a re-run of every
example) while the data-table page's emoji example is still awaiting its fetch. The first
run's test block then polled a preview that was no longer in the page, never resolved, and
left the example marked `-test-running`, so the page never finished.
*/
test('a superseded run does not run its tests', async () => {
  const quiet = (['log', 'warn', 'error'] as const).map((m) =>
    spyOn(console, m).mockImplementation(() => {})
  )
  const previous = testManager.enabled.value
  testManager.enabled.value = true
  ;(globalThis as any).__gate = Promise.resolve()
  try {
    const example: any = liveExample()
    document.body.append(example)
    await example.whenHydrated
    example.js = `await globalThis.__gate\npreview.textContent = 'ready'`
    // Waits for ITS preview to be in the example, as a test waiting on a render does.
    example.test = `globalThis.__testRuns += 1
await new Promise((resolve) => {
  const check = () => (preview.parentNode ? resolve() : setTimeout(check, 5))
  check()
})
test('ran', () => expect(preview.textContent).toBe('ready'))`
    // Let the run that setting the source starts finish, so exactly two runs follow.
    await new Promise((resolve) => setTimeout(resolve, 100))
    let open!: () => void
    ;(globalThis as any).__gate = new Promise<void>(
      (resolve) => (open = resolve)
    )
    ;(globalThis as any).__testRuns = 0
    const first = example.refresh()
    const second = example.refresh()
    open()
    await second
    // Bounded: with the defect the first run waits on its detached preview for ever.
    const firstEnded = await Promise.race([
      first.then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 300)),
    ])
    expect(firstEnded).toBe(true)
    expect((globalThis as any).__testRuns).toBe(1)
    expect(example.classList.contains('-test-running')).toBe(false)
    expect(example.testResults?.failed).toBe(0)
    expect(example.testResults?.passed).toBe(1)
    example.remove()
  } finally {
    testManager.enabled.value = previous
    delete (globalThis as any).__gate
    delete (globalThis as any).__testRuns
    quiet.forEach((s) => s.mockRestore())
  }
})

test('a run replaced while its tests ran leaves the newer run its results', async () => {
  const quiet = (['log', 'warn', 'error'] as const).map((m) =>
    spyOn(console, m).mockImplementation(() => {})
  )
  const previous = testManager.enabled.value
  testManager.enabled.value = true
  ;(globalThis as any).__delay = 0
  try {
    const example: any = liveExample()
    document.body.append(example)
    await example.whenHydrated
    example.js = `preview.textContent = 'ready'`
    // Fails for a run whose preview has been replaced by the time its wait is over.
    example.test = `await new Promise((resolve) => setTimeout(resolve, globalThis.__delay))
test('still in the example', () => expect(!!preview.parentNode).toBe(true))`
    await new Promise((resolve) => setTimeout(resolve, 100))
    ;(globalThis as any).__delay = 150
    const first = example.refresh()
    await new Promise((resolve) => setTimeout(resolve, 60)) // the first run is in its tests
    ;(globalThis as any).__delay = 0
    await example.refresh()
    expect(example.testResults).toMatchObject({ passed: 1, failed: 0 })
    await first // resumes against a detached preview, where its test fails
    expect(example.testResults).toMatchObject({ passed: 1, failed: 0 })
    expect(example.classList.contains('-test-failed')).toBe(false)
    expect(example.classList.contains('-test-passed')).toBe(true)
    expect(example.classList.contains('-test-running')).toBe(false)
    example.remove()
  } finally {
    testManager.enabled.value = previous
    delete (globalThis as any).__delay
    quiet.forEach((s) => s.mockRestore())
  }
})
