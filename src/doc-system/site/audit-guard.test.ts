import { test, expect, describe } from 'bun:test'
import {
  auditDependencies,
  classifyRisk,
  groupAdvisories,
  parseAuditJson,
  reportAudit,
  resetAuditMemo,
  resolveAuditMode,
  type AuditRunner,
} from './audit-guard.js'

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

const runner =
  (text: string): AuditRunner =>
  async () =>
    text
const NOW = new Date('2026-07-28T12:00:00Z')

test('parseAuditJson flattens packages and parses the GHSA id', () => {
  const advisories = parseAuditJson(flattedJson)!
  expect(advisories).toHaveLength(1)
  expect(advisories[0].package).toBe('flatted')
  expect(advisories[0].ghsa).toBe('GHSA-25h7-pfq9-p65f')
  expect(advisories[0].severity).toBe('high')
})

test('parseAuditJson returns [] for a clean tree and null for garbage', () => {
  expect(parseAuditJson('{}')).toEqual([]) // a CLEAN tree prints `{}`, exit 0
  // Empty stdout is NEVER "clean" — measured on bun 1.3.14, it only happens when
  // the audit FAILED (no lockfile / offline / registry refused / bun too old).
  // Answering `[]` here printed "✅ dependency audit clean" for a check that never
  // ran. It must read as "couldn't check" so the caller fails OPEN and warns.
  expect(parseAuditJson('')).toBe(null)
  expect(parseAuditJson('   ')).toBe(null)
  expect(parseAuditJson('not json')).toBe(null)
  expect(parseAuditJson('[]')).toBe(null) // array, not the expected object
})

test('a high advisory blocks by default', async () => {
  const r = await auditDependencies(true, {
    now: NOW,
    runAudit: runner(flattedJson),
  })
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
        {
          advisory: 'GHSA-25h7-pfq9-p65f',
          reason: 'old',
          expires: '2026-07-01',
        },
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
        {
          advisory: 'GHSA-zzzz-zzzz-zzzz',
          reason: 'gone',
          expires: '2026-12-31',
        },
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

// ── risk classification (annotation only — never changes whether a finding blocks) ──
//
// Vectors below are real shapes taken from a 44-advisory sample harvested across
// several projects. The sample is why this fails CLOSED: 20% of real advisories
// carried NO CVSS vector, and those skewed severe (4 high, 2 critical).

test('classifyRisk: C or I impact is a compromise (CVSS 3.1)', () => {
  // happy-dom: unsanitized export names interpolated as executable code
  const c = classifyRisk({
    cvss: { vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H' },
    cwe: ['CWE-94'],
  })
  expect(c.nature).toBe('compromise')
  expect(c.label).toBe('LEAK/ALTER')

  // Confidentiality alone is enough (happy-dom cookie leak: C:H I:N A:N)
  expect(
    classifyRisk({
      cvss: { vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N' },
    }).nature
  ).toBe('compromise')

  // ...and so is a LOW integrity impact (js-yaml prototype pollution in merge)
  expect(
    classifyRisk({
      cvss: { vectorString: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:L/A:N' },
    }).nature
  ).toBe('compromise')
})

test('classifyRisk: availability-only is DoS (brace-expansion, the real case)', () => {
  const c = classifyRisk({
    cvss: { vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H' },
    cwe: ['CWE-400', 'CWE-770'],
  })
  expect(c.nature).toBe('dos')
  expect(c.label).toBe('DoS-only')
})

test('classifyRisk: CVSS 4.0 impact metrics (VC/VI/VA) are understood', () => {
  expect(
    classifyRisk({
      cvss: {
        vectorString:
          'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N',
      },
    }).nature
  ).toBe('compromise')

  expect(
    classifyRisk({
      cvss: {
        vectorString:
          'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:H/SC:N/SI:N/SA:N',
      },
      cwe: ['CWE-400'],
    }).nature
  ).toBe('dos')
})

test('classifyRisk: fails CLOSED on a missing or unparseable vector', () => {
  // 20% of the real sample looked like this — and skewed high/critical.
  for (const raw of [
    {},
    { cvss: null },
    { cvss: { vectorString: '' } },
    { cvss: { vectorString: 'not-a-vector' } },
  ]) {
    const c = classifyRisk(raw as any)
    expect(c.nature).toBe('unknown')
    expect(c.label).toBe('UNCLASSIFIED')
  }
  // A vector missing its impact metrics is also unknown, not benign.
  expect(
    classifyRisk({ cvss: { vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N' } })
      .nature
  ).toBe('unknown')
})

test('classifyRisk: an escalatable CWE overrides a DoS-only vector', () => {
  // Real case: protobufjs had an A:H advisory tagged CWE-1321, AND a separate
  // C:H/I:H "code generation gadget AFTER prototype pollution" advisory. The
  // vector alone would have called the first one benign.
  const c = classifyRisk({
    cvss: { vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H' },
    cwe: ['CWE-1321'],
  })
  expect(c.nature).toBe('unknown')
  expect(c.label).toBe('DoS?+ESCALATABLE')
})

test('classification rides along on parsed advisories but never gates them', async () => {
  const dosJson = JSON.stringify({
    'brace-expansion': [
      {
        id: 1124334,
        url: 'https://github.com/advisories/GHSA-mh99-v99m-4gvg',
        title: 'brace-expansion: DoS via unbounded expansion',
        severity: 'high',
        vulnerable_versions: '<=5.0.7',
        cvss: { vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H' },
        cwe: ['CWE-400'],
      },
    ],
  })
  const advisories = parseAuditJson(dosJson)!
  expect(advisories[0].risk?.nature).toBe('dos')

  // ...and a DoS-only high STILL blocks. Classification informs, it does not soften.
  const result = await auditDependencies(undefined, {
    now: NOW,
    runAudit: runner(dosJson),
  })
  expect(result.ok).toBe(false)
  expect(result.blocking).toHaveLength(1)
})

// ── reporting: grouping + ordering ────────────────────────────────────────────
//
// `bun audit` emits one entry per (package, vulnerable-range), so one advisory
// against a package present at several versions arrives several times. Measured on
// a real tree: 16 entries were 12 advisories across 6 packages.

const dupJson = JSON.stringify({
  minimatch: [
    {
      id: 1,
      url: 'https://github.com/advisories/GHSA-3ppc-4f35-3m26',
      title: 'minimatch ReDoS',
      severity: 'high',
      vulnerable_versions: '<3.1.3',
    },
    {
      id: 1,
      url: 'https://github.com/advisories/GHSA-3ppc-4f35-3m26',
      title: 'minimatch ReDoS',
      severity: 'high',
      vulnerable_versions: '>=9.0.0 <9.0.6',
    },
  ],
})

test('groupAdvisories collapses one advisory across several ranges', () => {
  const groups = groupAdvisories(parseAuditJson(dupJson)!)
  expect(groups).toHaveLength(1)
  expect(groups[0].ranges).toEqual(['<3.1.3', '>=9.0.0 <9.0.6'])
})

test('groupAdvisories keeps different packages separate under one advisory id', () => {
  const shared = JSON.stringify({
    'pkg-a': [
      {
        id: 7,
        url: 'https://x/GHSA-aaaa-bbbb-cccc',
        title: 't',
        severity: 'high',
      },
    ],
    'pkg-b': [
      {
        id: 7,
        url: 'https://x/GHSA-aaaa-bbbb-cccc',
        title: 't',
        severity: 'high',
      },
    ],
  })
  expect(groupAdvisories(parseAuditJson(shared)!)).toHaveLength(2)
})

test('grouping is presentation-only — blocking stays the flat list', async () => {
  const r = await auditDependencies(true, {
    now: NOW,
    runAudit: runner(dupJson),
  })
  expect(r.blocking).toHaveLength(2) // the raw findings
  expect(groupAdvisories(r.blocking)).toHaveLength(1) // what gets printed
  expect(r.ok).toBe(false)
})

test('below-threshold findings are still collected when the build blocks', async () => {
  const mixed = JSON.stringify({
    bad: [
      {
        id: 1,
        url: 'https://x/GHSA-1111-1111-1111',
        title: 'h',
        severity: 'high',
      },
    ],
    meh: [
      {
        id: 2,
        url: 'https://x/GHSA-2222-2222-2222',
        title: 'm',
        severity: 'moderate',
      },
    ],
  })
  const r = await auditDependencies(true, { now: NOW, runAudit: runner(mixed) })
  expect(r.blocking).toHaveLength(1)
  // These used to be collected and never surfaced; reportAudit now prints them.
  expect(r.belowThreshold).toHaveLength(1)
  expect(r.belowThreshold[0].severity).toBe('moderate')
})

test('a failed audit never reports clean (regression: false-green gate)', async () => {
  // The exact shape `bun audit` produces with no lockfile / offline: exit 1, no
  // stdout. This used to yield ran:true ok:true → "✅ dependency audit clean".
  const emptyOut = await auditDependencies(true, {
    now: NOW,
    runAudit: runner(''),
  })
  expect(emptyOut.ran).toBe(false) // "couldn't check", NOT "clean"
  expect(emptyOut.ok).toBe(true) // still fails OPEN — we just don't claim a pass

  // And the runner itself must surface a failed exit rather than returning ''.
  const failed: AuditRunner = async () => {
    throw new Error('bun audit produced no output (exit 1): Lockfile not found')
  }
  const r = await auditDependencies(true, { now: NOW, runAudit: failed })
  expect(r.ran).toBe(false)
})

// ── the "audit once per process" invariant ────────────────────────────────────
//
// It used to be enforced by three call sites each remembering `skipAudit`, i.e.
// owned by nobody — and the adopter pattern in doc-site-system.md already broke it
// (a `{ build }` calling `buildSite(config)` re-audited on every keystroke
// rebuild). It is now owned here, so no caller can leak it.

test('a real audit runs once per process and is reused thereafter', async () => {
  resetAuditMemo()
  let calls = 0
  // Simulate the default (non-injected) runner by driving the memo directly:
  // opts.runAudit bypasses memoization on purpose, so prove both halves.
  const counting: AuditRunner = async () => {
    calls += 1
    return '{}'
  }
  // Injected runners ALWAYS re-run — tests need many scenarios per process.
  await auditDependencies(true, { now: NOW, runAudit: counting })
  await auditDependencies(true, { now: NOW, runAudit: counting })
  expect(calls).toBe(2)
  resetAuditMemo()
})

test('resetAuditMemo clears the memo', async () => {
  resetAuditMemo()
  const r = await auditDependencies(true, { now: NOW, runAudit: runner('{}') })
  expect(r.ran).toBe(true)
  resetAuditMemo() // must not throw, and leaves a clean slate for other tests
})

/*
#56: "Passing because someone signed a waiver should not look identical to passing."

Only marked when the waiver is LOAD-BEARING — a gate suppressing something below the blocking
threshold would have passed anyway, and shouting about that would train people to ignore the
marker, which is the failure mode the reporter warned about in the same breath.
*/
describe('waiver marker (#56)', () => {
  const capture = (result: any) => {
    const lines: string[] = []
    const real = console.warn
    console.warn = (m?: unknown) => void lines.push(String(m))
    try {
      reportAudit(result, 'Build')
    } finally {
      console.warn = real
    }
    return lines.join('\n')
  }
  const base = {
    ran: true,
    ok: true,
    mode: 'fail' as const,
    level: 'high' as const,
    blocking: [],
    expired: [],
    invalid: [],
    stale: [],
    belowThreshold: [],
  }
  const gate = (severity: string) => ({
    advisory: { package: 'p', id: '1', severity, title: 't' },
    reason: 'tracked upstream',
    daysLeft: 5,
  })

  test('a suppressed HIGH says the build is not clean', () => {
    const out = capture({ ...base, gated: [gate('high')] })
    expect(out).toContain('PASSING ON A WAIVER')
    expect(out).toContain('not a clean audit')
  })

  test('a suppressed LOW does not — it would have passed anyway', () => {
    const out = capture({ ...base, gated: [gate('low')] })
    expect(out).not.toContain('PASSING ON A WAIVER')
    // …but the gate itself is still reported, as before.
    expect(out).toContain('allowed by an')
  })
})
