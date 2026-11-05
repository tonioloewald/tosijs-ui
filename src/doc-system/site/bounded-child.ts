/*
Run a child process with a wall-clock limit, and take it down with the build.

The axe audit and DAISY Ace are long-running children that drive browsers (#3860). Awaited with
no limit, one that hung hung the build; and a build killed with Ctrl-C or SIGTERM left the child,
and the Chromium under it, running. This bounds both: the child is killed when the limit passes
(reported as `timedOut`), and when this process receives SIGINT or SIGTERM, after which the
signal is raised again so the build still ends the way it would have.
*/

import { spawn } from 'bun'

export interface BoundedResult {
  stdout: string
  stderr: string
  code: number | null
  timedOut: boolean
}

export async function runBounded(
  argv: string[],
  opts: { cwd?: string; timeoutMs: number }
): Promise<BoundedResult> {
  const child = spawn(argv, {
    cwd: opts.cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    child.kill()
  }, opts.timeoutMs)
  const signals = ['SIGINT', 'SIGTERM'] as const
  const onSignal = (signal: NodeJS.Signals) => {
    child.kill()
    for (const s of signals) process.off(s, onSignal)
    process.kill(process.pid, signal)
  }
  for (const s of signals) process.on(s, onSignal)
  try {
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    return { stdout, stderr, code, timedOut }
  } finally {
    clearTimeout(timer)
    for (const s of signals) process.off(s, onSignal)
  }
}
