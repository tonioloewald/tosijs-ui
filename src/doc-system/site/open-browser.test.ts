import { describe, it, expect } from 'bun:test'
import {
  buildOpenPlan,
  originOf,
  appleScript,
  osascriptArgv,
  type OpenPlanInput,
} from './open-browser'

const base: OpenPlanInput = {
  url: 'https://localhost:8787/',
  setting: true,
  env: {},
  platform: 'darwin',
  isTTY: true,
  running: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
}

describe('originOf', () => {
  it('reduces a dev URL to scheme+host+port, no path', () => {
    expect(originOf('https://localhost:8787/getting-started/')).toBe(
      'https://localhost:8787'
    )
    expect(originOf('https://localhost:9000/')).toBe('https://localhost:9000')
  })
  it('falls back gracefully on a non-URL', () => {
    expect(originOf('not a url')).toBe('not a url')
  })
})

describe('buildOpenPlan — skip conditions', () => {
  it('skips when openBrowser is unset (default off for adopters)', () => {
    expect(buildOpenPlan({ ...base, setting: undefined }).action).toBe('skip')
  })
  it('skips when openBrowser is false', () => {
    expect(buildOpenPlan({ ...base, setting: false }).action).toBe('skip')
  })
  it('skips in CI', () => {
    const p = buildOpenPlan({ ...base, env: { CI: 'true' } })
    expect(p).toEqual({ action: 'skip', reason: 'CI' })
  })
  it('skips when not a TTY', () => {
    expect(buildOpenPlan({ ...base, isTTY: false }).action).toBe('skip')
  })
  it('skips when BROWSER=none even if enabled', () => {
    const p = buildOpenPlan({ ...base, env: { BROWSER: 'none' } })
    expect(p).toEqual({ action: 'skip', reason: 'BROWSER=none' })
  })
})

describe('buildOpenPlan — darwin browser resolution', () => {
  it('auto-detects the first running supported browser (Chrome → chromium)', () => {
    const p = buildOpenPlan(base)
    expect(p.action).toBe('applescript')
    if (p.action !== 'applescript') throw new Error('unreachable')
    expect(p.app).toBe('Google Chrome')
    expect(p.flavor).toBe('chromium')
    // matches the ORIGIN (durable per-project key), not the full path-bearing URL
    expect(p.script).toContain('https://localhost:8787')
    expect(p.script).not.toContain('8787/getting-started')
  })

  it('honors detection priority (Chrome before Safari when both run)', () => {
    const p = buildOpenPlan({
      ...base,
      running: ['... Safari.app ...', '... Google Chrome.app ...'],
    })
    if (p.action !== 'applescript') throw new Error('expected applescript')
    expect(p.app).toBe('Google Chrome')
  })

  it('picks Safari when it is the only supported browser running', () => {
    const p = buildOpenPlan({
      ...base,
      running: ['/Applications/Safari.app/Contents/MacOS/Safari'],
    })
    if (p.action !== 'applescript') throw new Error('expected applescript')
    expect(p.app).toBe('Safari')
    expect(p.flavor).toBe('safari')
    expect(p.script).toContain('current tab')
  })

  it('a config string names the browser and wins over detection', () => {
    const p = buildOpenPlan({
      ...base,
      setting: 'brave',
      running: ['... Google Chrome.app ...'],
    })
    if (p.action !== 'applescript') throw new Error('expected applescript')
    expect(p.app).toBe('Brave Browser')
    expect(p.flavor).toBe('chromium')
  })

  it('$BROWSER wins over the config string', () => {
    const p = buildOpenPlan({
      ...base,
      setting: 'safari',
      env: { BROWSER: 'chrome' },
    })
    if (p.action !== 'applescript') throw new Error('expected applescript')
    expect(p.app).toBe('Google Chrome')
  })

  it('a named-but-unknown app falls back to `open -a` (no reuse)', () => {
    const p = buildOpenPlan({ ...base, setting: 'Firefox' })
    expect(p).toEqual({
      action: 'exec',
      cmd: ['open', '-a', 'Firefox', 'https://localhost:8787/'],
      reuse: false,
    })
  })

  it('no supported browser running and no name → default browser via `open`', () => {
    const p = buildOpenPlan({ ...base, running: ['some-daemon', 'kernel_task'] })
    expect(p).toEqual({
      action: 'exec',
      cmd: ['open', 'https://localhost:8787/'],
      reuse: false,
    })
  })
})

describe('buildOpenPlan — other platforms', () => {
  it('uses xdg-open on linux', () => {
    const p = buildOpenPlan({ ...base, platform: 'linux', running: [] })
    expect(p).toEqual({
      action: 'exec',
      cmd: ['xdg-open', 'https://localhost:8787/'],
      reuse: false,
    })
  })
  it('uses start on win32', () => {
    const p = buildOpenPlan({ ...base, platform: 'win32', running: [] })
    if (p.action !== 'exec') throw new Error('expected exec')
    expect(p.cmd[0]).toBe('cmd')
    expect(p.cmd).toContain('start')
    expect(p.cmd[p.cmd.length - 1]).toBe('https://localhost:8787/')
  })
})

describe('appleScript', () => {
  it('chromium script matches origin with `starts with` and opens the full url when absent', () => {
    const s = appleScript(
      'chromium',
      'Google Chrome',
      'https://localhost:8787',
      'https://localhost:8787/'
    )
    expect(s).toContain('tell application "Google Chrome"')
    expect(s).toContain('starts with theOrigin')
    expect(s).toContain('active tab index')
    expect(s).toContain('make new tab')
  })
  it('safari script uses the Safari dictionary', () => {
    const s = appleScript(
      'safari',
      'Safari',
      'https://localhost:8787',
      'https://localhost:8787/'
    )
    expect(s).toContain('tell application "Safari"')
    expect(s).toContain('set current tab of w to t')
    expect(s).toContain('make new document')
  })
})

describe('osascriptArgv', () => {
  it('passes each script line as its own -e (no temp file)', () => {
    const argv = osascriptArgv('line one\nline two')
    expect(argv).toEqual(['osascript', '-e', 'line one', '-e', 'line two'])
  })
})
