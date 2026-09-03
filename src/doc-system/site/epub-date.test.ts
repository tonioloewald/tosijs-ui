import { test, expect, describe } from 'bun:test'
import { versionAnchoredDate } from './orchestrator.js'

/*
`dcterms:modified` is the only date a reader can surface (the OPF carries no `dc:date`), and it
is baked into a committed, redistributed artifact — so it has to be deterministic AND coherent.

The first attempt packed the version as days/days/hours and wrapped: `1.13.24` and `1.14.0`
produced the same instant, `1.13.25` sorted after `1.14.0`, and `2.0.0` before `1.400.0` — while
its own docblock claimed the mapping was "strictly increasing". The 1.13.0 remediation review
caught it by execution. These are that table, as assertions.
*/
describe('versionAnchoredDate', () => {
  const at = (v: string) => Date.parse(versionAnchoredDate(v))

  test('is deterministic — the same version always yields the same instant', () => {
    expect(versionAnchoredDate('1.13.0')).toBe(versionAnchoredDate('1.13.0'))
  })

  test('is strictly increasing, including across the digits that used to wrap', () => {
    const order = ['1.13.0', '1.13.24', '1.13.25', '1.14.0', '1.400.0', '2.0.0']
    for (let i = 1; i < order.length; i += 1) {
      expect(at(order[i])).toBeGreaterThan(at(order[i - 1]))
    }
  })

  test('never collides — the cases that did before', () => {
    expect(at('1.13.24')).not.toBe(at('1.14.0'))
    expect(at('1.13.0-beta.1')).not.toBe(at('1.13.0'))
  })

  test('a prerelease sorts BEFORE its final — it is a different publication', () => {
    expect(at('1.13.0-beta.1')).toBeLessThan(at('1.13.0'))
  })

  test('an explicit epub.modified wins, because a real date beats a synthetic one', () => {
    expect(versionAnchoredDate('1.13.0', '2026-09-03T12:00:00Z')).toBe(
      '2026-09-03T12:00:00Z'
    )
  })

  test('an unparseable override falls back rather than emitting garbage', () => {
    expect(versionAnchoredDate('1.13.0', 'not a date')).toBe(
      versionAnchoredDate('1.13.0')
    )
  })

  test('always emits a valid ISO instant, even for junk input', () => {
    for (const v of ['', 'x', '1', '1.2', '99.99.99']) {
      expect(Number.isNaN(Date.parse(versionAnchoredDate(v)))).toBe(false)
    }
  })
})
