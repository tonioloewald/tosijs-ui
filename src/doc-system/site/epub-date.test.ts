import { test, expect, describe } from 'bun:test'
import { versionAnchoredDate } from './epub.js'

/*
`dcterms:modified` is the only date a reader can surface (the OPF carries no `dc:date`), and it
is baked into a committed, redistributed artifact — so it has to be deterministic AND coherent.

The first attempt packed the version as days/days/hours and wrapped: `1.13.24` and `1.14.0`
produced the same instant, `1.13.25` sorted after `1.14.0`, and `2.0.0` before `1.400.0` — while
its own docblock claimed the mapping was "strictly increasing". The 1.13.0 remediation review
caught it by execution. These are that table, as assertions.
*/
describe('versionAnchoredDate', () => {
  /*
  The promise is DETERMINISM and DISTINCTNESS, not ordering — narrowed after three attempts at
  an ordered encoding each shipped a docblock claiming monotonicity that execution disproved
  (`1.13.24` == `1.14.0`; `1.13.1-beta.1` byte-identical to `1.13.0`; CalVer `2026.9.3` landing
  in the year 5872). Nothing reads these as a sequence, so ordering was never required — and a
  claim nobody needs, repeatedly made and repeatedly false, is worse than no claim.

  These assert the narrowed promise, and the sweep is generated rather than hand-picked: the
  previous test checked two pairs and missed the adjacent-version collision entirely.
  */
  test('is deterministic — the same version always yields the same instant', () => {
    expect(versionAnchoredDate('1.13.0')).toBe(versionAnchoredDate('1.13.0'))
    expect(versionAnchoredDate('1.13.0-beta.1')).toBe(
      versionAnchoredDate('1.13.0-beta.1')
    )
  })

  test('DISTINCT across a generated sweep, including the pairs that used to collide', () => {
    const versions: string[] = []
    for (let major = 0; major < 3; major += 1)
      for (let minor = 0; minor < 20; minor += 1)
        for (const patch of [0, 1, 24, 25, 999, 1000])
          versions.push(`${major}.${minor}.${patch}`)
    for (const tag of ['beta.1', 'beta.2', 'rc.1'])
      versions.push(`1.13.0-${tag}`, `1.13.1-${tag}`)
    versions.push('2026.9.3', '2026.9.4') // CalVer, which used to reach the year 5872

    const seen = new Map<string, string>()
    for (const v of versions) {
      const at = versionAnchoredDate(v)
      expect(seen.has(at) ? `${v} collides with ${seen.get(at)}` : v).toBe(v)
      seen.set(at, v)
    }
  })

  test('every version maps into a plausible range, never a nonsense year', () => {
    for (const v of ['0.0.0', '2026.9.3', '999.999.999', '1.13.0-beta.1']) {
      const year = new Date(versionAnchoredDate(v)).getUTCFullYear()
      expect(year).toBeGreaterThanOrEqual(1995)
      expect(year).toBeLessThan(2026)
    }
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
