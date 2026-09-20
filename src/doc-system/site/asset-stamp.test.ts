import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { computeAssetStamp, missingStampInputWarning } from './asset-stamp'

/*
The property this guards is not "the hash is correct" — it is "the stamp MOVES when any input
moves, and says so when an input it was told about is absent".

#151's live form: `doc-system.css` was named in the inputs and generated ~80 lines later, so
the loop `continue`d past it in silence and the stamp covered two of three assets. A
`theme`-only change then deployed new CSS under an unchanged URL. The remediation was a
statement reorder with nothing asserting the ordering, so the same reorder could undo it and
every lane would stay green. These tests are what makes that reorder fail.
*/
describe('asset stamp (F11)', () => {
  let dir: string
  const write = (name: string, body: string) => {
    const p = path.join(dir, name)
    fs.writeFileSync(p, body)
    return p
  }

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-'))
  })
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

  test('changing ANY input changes the stamp', async () => {
    const a = write('a.js', 'one')
    const b = write('b.css', 'two')
    const before = await computeAssetStamp([a, b], 'fallback')

    write('b.css', 'two-changed')
    const after = await computeAssetStamp([a, b], 'fallback')

    expect(after.stamp).not.toBe(before.stamp)
    // …and it is stable when nothing changes, or every rebuild busts every cache.
    const again = await computeAssetStamp([a, b], 'fallback')
    expect(again.stamp).toBe(after.stamp)
  })

  test('a named-but-missing input is REPORTED, not skipped quietly', async () => {
    const a = write('a.js', 'one')
    const result = await computeAssetStamp(
      [a, path.join(dir, 'never.css')],
      'fb'
    )

    expect(result.missing).toEqual([path.join(dir, 'never.css')])
    expect(result.usedFallback).toBe(false) // one input existed, so we still hashed
    // The warning names the file and the consequence, so it is actionable on sight.
    const warning = missingStampInputWarning(result.missing)
    expect(warning).toContain('never.css')
    expect(warning).toContain('151')
    expect(warning).toContain('generated')
  })

  test('the #151 shape: a missing input means its changes do NOT move the stamp', async () => {
    // This is the defect stated as a test. `late.css` does not exist when the stamp is
    // computed, so writing it afterwards changes nothing — the exact silent failure.
    const a = write('a.js', 'one')
    const late = path.join(dir, 'late.css')
    const before = await computeAssetStamp([a, late], 'fb')
    expect(before.missing).toContain(late)

    fs.writeFileSync(late, 'now it exists')
    const after = await computeAssetStamp([a, late], 'fb')
    expect(after.missing).toEqual([])
    expect(after.stamp).not.toBe(before.stamp)
  })

  test('falls back only when NOTHING exists — never to a version that does not move', async () => {
    const result = await computeAssetStamp(
      [path.join(dir, 'nope.js')],
      'the-fallback'
    )
    expect(result.usedFallback).toBe(true)
    expect(result.stamp).toBe('the-fallback')
    expect(result.missing.length).toBe(1)
  })
})
