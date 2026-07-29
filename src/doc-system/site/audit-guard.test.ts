import { test, expect } from 'bun:test'
import {
  auditDependencies,
  parseAuditJson,
  resolveAuditMode,
  type AuditRunner,
} from './audit-guard'

// A real-shaped `bun audit --json` payload: keyed by package, each an advisory[].
const flattedJson = JSON.stringify({
  flatted: [
    {
      id: 1114526,
      url: 'https://github.com/advisories/GHSA-25h7-pfq9-p65f',
      title: 'flatted vulnerable to unbounded recursion DoS',
      severity: 'high',
      vulnerable_versions: '<3.4.0',
    },
  ],
})

const moderateJson = JSON.stringify({
  somepkg: [
    {
      id: 42,
      url: 'https://github.com/advisories/GHSA-aaaa-bbbb-cccc',
      title: 'a moderate thing',
      severity: 'moderate',
      vulnerable_versions: '<1.0.0',
    },
  ],
})

const runner = (text: string): AuditRunner => async () => text
const NOW = new Date('2026-07-28T12:00:00Z')

test('parseAuditJson flattens packages and parses the GHSA id', () => {
  const advisories = parseAuditJson(flattedJson)!
  expect(advisories).toHaveLength(1)
  expect(advisories[0].package).toBe('flatted')
  expect(advisories[0].ghsa).toBe('GHSA-25h7-pfq9-p65f')
  expect(advisories[0].severity).toBe('high')
})

test('parseAuditJson returns [] for a clean tree and null for garbage', () => {
  expect(parseAuditJson('{}')).toEqual([])
  expect(parseAuditJson('')).toEqual([])
  expect(parseAuditJson('not json')).toBe(null)
  expect(parseAuditJson('[]')).toBe(null) // array, not the expected object
})

test('a high advisory blocks by default', async () => {
  const r = await auditDependencies(true, { now: NOW, runAudit: runner(flattedJson) })
  expect(r.ran).toBe(true)
  expect(r.ok).toBe(false)
  expect(r.blocking).toHaveLength(1)
  expect(r.blocking[0].package).toBe('flatted')
})

test('a valid, unexpired gate suppresses the finding', async () => {
  const r = await auditDependencies(
    {
      allow: [
        {
          advisory: 'GHSA-25h7-pfq9-p65f',
          reason: 'no untrusted parse path; patch tracked in #123',
          expires: '2026-08-15',
        },
      ],
    },
    { now: NOW, runAudit: runner(flattedJson) }
  )
  expect(r.ok).toBe(true)
  expect(r.blocking).toHaveLength(0)
  expect(r.gated).toHaveLength(1)
  expect(r.gated[0].daysLeft).toBe(18)
})

test('gates match by numeric id and by package name too', async () => {
  const byId = await auditDependencies(
    { allow: [{ advisory: '1114526', reason: 'x', expires: '2026-08-15' }] },
    { now: NOW, runAudit: runner(flattedJson) }
  )
  expect(byId.ok).toBe(true)
  const byPkg = await auditDependencies(
    { allow: [{ advisory: 'flatted', reason: 'x', expires: '2026-08-15' }] },
    { now: NOW, runAudit: runner(flattedJson) }
  )
  expect(byPkg.ok).toBe(true)
})

test('an EXPIRED gate does not suppress — it blocks and is reported', async () => {
  const r = await auditDependencies(
    {
      allow: [
        { advisory: 'GHSA-25h7-pfq9-p65f', reason: 'old', expires: '2026-07-01' },
      ],
    },
    { now: NOW, runAudit: runner(flattedJson) }
  )
  expect(r.ok).toBe(false)
  expect(r.blocking).toHaveLength(1)
  expect(r.expired).toHaveLength(1)
  expect(r.expired[0].daysAgo).toBe(27)
})

test('the expiry day itself is already expired (inclusive)', async () => {
  const r = await auditDependencies(
    { allow: [{ advisory: 'flatted', reason: 'x', expires: '2026-07-28' }] },
    { now: NOW, runAudit: runner(flattedJson) }
  )
  expect(r.ok).toBe(false)
  expect(r.expired[0].daysAgo).toBe(0)
})

test('a gate missing reason or expires is invalid — does not suppress', async () => {
  const noReason = await auditDependencies(
    { allow: [{ advisory: 'flatted', reason: '', expires: '2026-08-15' }] },
    { now: NOW, runAudit: runner(flattedJson) }
  )
  expect(noReason.ok).toBe(false)
  expect(noReason.invalid).toHaveLength(1)

  const badDate = await auditDependencies(
    { allow: [{ advisory: 'flatted', reason: 'x', expires: 'soon' }] },
    { now: NOW, runAudit: runner(flattedJson) }
  )
  expect(badDate.ok).toBe(false)
  expect(badDate.invalid[0].problem).toContain('expires')
})

test('moderate findings do not block at the default (high) level', async () => {
  const r = await auditDependencies(true, {
    now: NOW,
    runAudit: runner(moderateJson),
  })
  expect(r.ok).toBe(true)
  expect(r.blocking).toHaveLength(0)
  expect(r.belowThreshold).toHaveLength(1)
})

test('lowering the level to moderate makes the moderate finding block', async () => {
  const r = await auditDependencies(
    { level: 'moderate' },
    { now: NOW, runAudit: runner(moderateJson) }
  )
  expect(r.ok).toBe(false)
  expect(r.blocking).toHaveLength(1)
})

test('a valid gate that matches nothing is reported as stale', async () => {
  const r = await auditDependencies(
    {
      allow: [
        { advisory: 'GHSA-zzzz-zzzz-zzzz', reason: 'gone', expires: '2026-12-31' },
      ],
    },
    { now: NOW, runAudit: runner('{}') }
  )
  expect(r.ok).toBe(true)
  expect(r.stale).toHaveLength(1)
})

test('a subprocess/parse failure fails OPEN (ran:false, ok:true)', async () => {
  const threw: AuditRunner = async () => {
    throw new Error('offline')
  }
  const r1 = await auditDependencies(true, { now: NOW, runAudit: threw })
  expect(r1.ran).toBe(false)
  expect(r1.ok).toBe(true)

  const r2 = await auditDependencies(true, {
    now: NOW,
    runAudit: runner('<html>gateway timeout</html>'),
  })
  expect(r2.ran).toBe(false)
  expect(r2.ok).toBe(true)
})

test('mode off short-circuits without running the audit', async () => {
  let ran = false
  const r = await auditDependencies(false, {
    now: NOW,
    runAudit: async () => {
      ran = true
      return flattedJson
    },
  })
  expect(ran).toBe(false)
  expect(r.mode).toBe('off')
  expect(r.ok).toBe(true)
})

test('resolveAuditMode: default on, boolean off, TOSIJS_AUDIT env wins', () => {
  expect(resolveAuditMode(undefined)).toBe('fail')
  expect(resolveAuditMode(true)).toBe('fail')
  expect(resolveAuditMode(false)).toBe('off')
  expect(resolveAuditMode({ mode: 'warn' })).toBe('warn')
  const prev = process.env.TOSIJS_AUDIT
  try {
    process.env.TOSIJS_AUDIT = 'off'
    expect(resolveAuditMode({ mode: 'fail' })).toBe('off')
    process.env.TOSIJS_AUDIT = 'warn'
    expect(resolveAuditMode(false)).toBe('warn')
  } finally {
    if (prev === undefined) delete process.env.TOSIJS_AUDIT
    else process.env.TOSIJS_AUDIT = prev
  }
})
