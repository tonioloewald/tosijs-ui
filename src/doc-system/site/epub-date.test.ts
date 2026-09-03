import { test, expect, describe } from 'bun:test'
import { versionAnchoredDate, epubOptionsFor } from './orchestrator.js'

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

describe('epubOptionsFor — the ASSEMBLY, which is where the bug actually was', () => {
  /*
  Every assertion in the block above passed while the product was broken: `modified` was
  written above a `...epubOpts` spread, so the adopter's raw value overwrote the sanitised one
  and reached the OPF unnormalised. EPUB 3 requires exactly `CCYY-MM-DDThh:mm:ssZ`, so the
  obvious spelling of a brand-new option produced an artifact EPUBCheck rejects.

  Testing a pure function while the only call site discards its result is the failure this
  release's notes already describe twice. These drive the call site.
  */
  test('a date-only override is NORMALISED, not passed through raw', () => {
    const opts = epubOptionsFor({ modified: '2026-09-03' }, '1.13.0')
    expect(opts.modified).toBe('2026-09-03T00:00:00Z')
  })

  test('an unparseable override falls back instead of reaching the OPF verbatim', () => {
    const opts = epubOptionsFor({ modified: 'not a date' }, '1.13.0')
    expect(opts.modified).toBe(versionAnchoredDate('1.13.0'))
  })

  test('the spread cannot win — key order is the whole bug', () => {
    // If `modified` is ever moved back above the spread, this is what goes red.
    const opts = epubOptionsFor(
      { modified: 'not a date', title: 'x' },
      '1.13.0'
    )
    expect(opts.modified).not.toBe('not a date')
    expect(opts.title).toBe('x') // other options still pass through
  })

  test('no override still yields the deterministic version-derived date', () => {
    expect(epubOptionsFor({}, '1.13.0').modified).toBe(
      versionAnchoredDate('1.13.0')
    )
  })
})
