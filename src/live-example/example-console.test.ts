import { describe, expect, test } from 'bun:test'
import vm from 'node:vm'
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

  test('a value logged twice is NOT circular (only a real cycle is)', () => {
    const shared = { n: 1 }
    const out = formatConsoleValue({ a: shared, b: shared, list: [shared] })
    expect(out).not.toContain('Circular')
    expect(JSON.parse(out)).toEqual({
      a: { n: 1 },
      b: { n: 1 },
      list: [{ n: 1 }],
    })
  })

  test('a cycle THROUGH a Map or Set is still a cycle, not a crash', () => {
    const node: any = { name: 'root', children: new Map() }
    node.children.set('self', node)
    const out = formatConsoleValue(node)
    expect(JSON.parse(out)).toEqual({
      name: 'root',
      children: { Map: { self: '[Circular]' } },
    })
    const set: any = new Set()
    set.add(set)
    expect(JSON.parse(formatConsoleValue(set))).toEqual({ Set: ['[Circular]'] })
  })

  test('a Date prints as JSON would print it', () => {
    expect(formatConsoleValue({ at: new Date(0) })).toContain(
      '1970-01-01T00:00:00.000Z'
    )
  })

  test('Maps and Sets are readable, not {}', () => {
    expect(JSON.parse(formatConsoleValue(new Map([['k', 1]])))).toEqual({
      Map: { k: 1 },
    })
    expect(JSON.parse(formatConsoleValue(new Map([[1, 'one']])))).toEqual({
      Map: [[1, 'one']],
    })
    expect(JSON.parse(formatConsoleValue(new Set([1, 2])))).toEqual({
      Set: [1, 2],
    })
  })

  test("an Error from another realm (an iframe example's) prints as an error, not {}", () => {
    const foreign = vm.runInNewContext("new RangeError('far away')")
    expect(foreign instanceof Error).toBe(false) // the trap
    expect(formatConsoleValue(foreign)).toBe('RangeError: far away')
    expect(formatConsoleValue({ e: foreign })).toContain('RangeError: far away')
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
    // entries carry the values; formatting waits until the panel keeps the line
    expect(entries[0].args).toEqual(['hi', { a: 1 }])
    expect(formatConsoleArgs(entries[0].args)).toBe('hi {\n  "a": 1\n}')
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

describe('withReplHook (1.16.4 review C1)', () => {
  test('goes after the directive prologue, on the same line', async () => {
    const { withReplHook } = await import('./execution.js')
    const hooked = (code: string) =>
      withReplHook({ code, extraContext: {} }, () => {}).code
    expect(hooked(`'use strict'\nx = 1`)).toMatch(
      /^'use strict';__tosiReplHook\(.*\);\nx = 1$/
    )
    expect(hooked(`"use strict";x = 1`)).toMatch(
      /^"use strict";;__tosiReplHook/
    )
    expect(hooked(`x = 1`)).toMatch(/^;__tosiReplHook\(.*\);x = 1$/)
    // a string that is an EXPRESSION is not a directive: the hook goes before it
    expect(hooked(`'abc'.length`)).toMatch(
      /^;__tosiReplHook\(.*\);'abc'\.length$/
    )
    // no line added
    expect(hooked(`'use strict'\na\nb`).split('\n').length).toBe(3)
  })
})
