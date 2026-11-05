import { test, expect } from 'bun:test'
import { spawnSync } from 'child_process'
import * as path from 'path'
import { runBounded } from './bounded-child.js'

test('a child that finishes returns its output and exit code', async () => {
  const run = await runBounded(['sh', '-c', 'echo out; echo err >&2; exit 3'], {
    timeoutMs: 10_000,
  })
  expect(run).toEqual({
    stdout: 'out\n',
    stderr: 'err\n',
    code: 3,
    timedOut: false,
  })
})

test('a child past its limit is killed and reported as timed out (#3860)', async () => {
  const started = performance.now()
  const run = await runBounded(['sleep', '20'], { timeoutMs: 200 })
  expect(run.timedOut).toBe(true)
  expect(performance.now() - started).toBeLessThan(5_000)
})

test('SIGTERM to the build takes the child down with it (#3860)', async () => {
  // A unique duration, anchored, so the check finds only this test's sleep and not a command
  // line that merely mentions it.
  const marker = '^sleep 31\\.4159$'
  const script = `
    import { runBounded } from ${JSON.stringify(
      path.join(import.meta.dir, 'bounded-child.ts')
    )}
    setTimeout(() => console.log('ready'), 300)
    await runBounded(['sleep', '31.4159'], { timeoutMs: 60_000 })
  `
  const parent = Bun.spawn(['bun', '-e', script], { stdout: 'pipe' })
  const reader = parent.stdout.getReader()
  await reader.read() // 'ready'
  expect(spawnSync('pgrep', ['-f', marker]).status).toBe(0)
  parent.kill('SIGTERM')
  await parent.exited
  await new Promise((resolve) => setTimeout(resolve, 300))
  expect(spawnSync('pgrep', ['-f', marker]).status).toBe(1)
})
