import { describe, expect, test } from 'bun:test'
import {
  createExampleConsole,
  formatConsoleArgs,
  formatConsoleValue,
  type ConsoleEntry,
} from './example-console.js'

function fakeConsole() {
  const calls: [string, unknown[]][] = []
  const target: any = {}
  for (const m of [
    'log',
    'info',
    'warn',
    'error',
    'debug',
    'dir',
    'table',
    'time',
    'group',
  ])
    target[m] = (...args: unknown[]) => calls.push([m, args])
  return { target: target as Console, calls }
}

describe('formatting', () => {
  test('strings as written, data as JSON, the rest readable', () => {
    expect(formatConsoleValue('a "b"')).toBe('a "b"')
    expect(formatConsoleValue(3)).toBe('3')
    expect(formatConsoleValue(undefined)).toBe('undefined')
    expect(formatConsoleValue(null)).toBe('null')
    expect(formatConsoleValue({ a: [1] })).toBe('{\n  "a": [\n    1\n  ]\n}')
    expect(formatConsoleValue(new TypeError('bad'))).toBe('TypeError: bad')
    expect(formatConsoleValue(function named() {})).toBe('ƒ named()')
    expect(formatConsoleValue({ n: 10n })).toContain('"10n"')
    const div = document.createElement('div')
    div.id = 'x'
    expect(formatConsoleValue(div)).toBe('<div#x>')
  })

  test('a circular object does not throw', () => {
    const a: any = { name: 'a' }
    a.self = a
    expect(formatConsoleValue(a)).toContain('[Circular]')
  })

  test('arguments are joined with spaces', () => {
    expect(formatConsoleArgs(['count', 2, true])).toBe('count 2 true')
  })
})

describe('createExampleConsole', () => {
  test('captured methods report an entry AND reach the real console', () => {
    const { target, calls } = fakeConsole()
    const entries: ConsoleEntry[] = []
    const c = createExampleConsole((e) => entries.push(e), target)
    c.log('hi', { a: 1 })
    c.warn('careful')
    c.error('bad')
    c.dir({ b: 2 })
    expect(entries.map((e) => e.level)).toEqual(['log', 'warn', 'error', 'log'])
    expect(entries[0].text).toBe('hi {\n  "a": 1\n}')
    expect(calls.map(([m]) => m)).toEqual(['log', 'warn', 'error', 'dir'])
    expect(calls[0][1]).toEqual(['hi', { a: 1 }])
  })

  test('methods it does not show still work, untouched', () => {
    const { target, calls } = fakeConsole()
    const entries: ConsoleEntry[] = []
    const c = createExampleConsole((e) => entries.push(e), target)
    c.time('t')
    c.group('g')
    expect(entries.length).toBe(0)
    expect(calls.map(([m]) => m)).toEqual(['time', 'group'])
  })
})
