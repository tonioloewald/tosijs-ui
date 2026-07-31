/*
Dependency-audit gate for the doc-site build and dev server.

`bun audit` knows the registry advisory database; nothing in this build ever
asked it. So ask it, once, at the point a human is looking: the initial build
and the dev-server launch. A high-or-worse advisory FAILS the build — unless the
specific advisory is explicitly gated with a reason AND an expiry date, which
forces it back onto the table instead of being silenced forever.

Design notes that mirror `preflight.ts`:

  - Returns a result; NEVER `process.exit`. This is reachable through the public
    `tosijs-ui/site` export, and library code does not get to kill a caller's
    process from inside a health check. `buildSite` turns a blocking result into a
    failed build; the dev server (which by then owns a running process on which the
    finding is the whole point) is the one place that self-terminates — same
    precedent as the memory watchdog.
  - Fail-OPEN on inability to check (offline, registry down, `bun` too old): a
    dependency advisory you couldn't fetch must not ground you on a plane. Fail-
    CLOSED on an actual finding.
  - NOT downgraded in CI. Unlike the machine-health preflight — a heuristic about
    someone's local box — an advisory is deterministic and environment-independent,
    so CI is exactly where you want the gate to bite.

`bun audit` is itself a subprocess, so shelling out already satisfies the "never a
native-heavy API in a long-lived process" rule. Build-time only (Bun/Node APIs);
never import this from browser code.
*/

import { $ } from 'bun'

export type AuditSeverity = 'info' | 'low' | 'moderate' | 'high' | 'critical'
export type AuditMode = 'fail' | 'warn' | 'off'

const SEVERITY_RANK: Record<AuditSeverity, number> = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
}

/** One advisory as `bun audit --json` reports it, flattened with its package. */
export interface AuditAdvisory {
  package: string
  id: number
  url: string
  title: string
  severity: AuditSeverity
  vulnerableVersions?: string
  /** GHSA id parsed from `url`, e.g. 'GHSA-25h7-pfq9-p65f' (if present) */
  ghsa?: string
  /** what KIND of harm this is — annotation only, never changes whether it blocks */
  risk?: Classification
}

/*
Classifying the NATURE of an advisory (not the risk).

The CVSS vector's impact triad is a formal, machine-parseable statement of what
kind of harm is possible, so "can this leak/alter data?" vs "can this only exhaust
resources?" IS deterministic. What is NOT deterministic is whether the vulnerable
path is reachable in OUR usage — CVSS scores the worst case, context-free, and no
field encodes "we only feed this our own globs."

So this classifies, and NOTHING ELSE. Every finding at/above the threshold still
blocks; the label just lets a developer triage in seconds instead of opening four
browser tabs. That matters more than it sounds: measured against a real 44-advisory
set, 20% carried NO CVSS vector at all — and those skewed severe (4 high, 2
critical). A design that auto-softened on classification would have been flying
blind on exactly the worst ones. Annotating costs nothing when it can't classify;
softening would have.
*/

export type RiskNature =
  /** C or I impact — can leak or alter data / execute code */
  | 'compromise'
  /** availability-only — resource exhaustion, hang, crash */
  | 'dos'
  /** no or unparseable vector, or an escalatable CWE — assume the worst */
  | 'unknown'

export interface Classification {
  nature: RiskNature
  /** short label for the report line */
  label: string
  /** what drove the call, so the reader can second-guess it */
  basis: string
}

/*
CWEs that routinely escalate beyond what the vector admits. Prototype pollution is
the canonical case and it is not hypothetical: in the sample set, protobufjs had an
advisory scored A:H (availability-only) tagged CWE-1321, AND a separate C:H/I:H
advisory titled "code generation gadget AFTER prototype pollution" — the escalation
chain the first vector does not encode. A vector-only reading calls that benign.
*/
const ESCALATABLE_CWE = new Set(['1321', '915', '502', '94', '78', '77'])

function parseVector(v: string): Record<string, string> | null {
  if (!v) return null
  const out: Record<string, string> = {}
  let version = ''
  for (const part of v.split('/')) {
    const [k, val] = part.split(':')
    if (!k || !val) continue
    if (k === 'CVSS') version = val
    else out[k] = val
  }
  if (!Object.keys(out).length) return null
  out.__version = version || '?'
  return out
}

/** Classify one advisory's nature from its CVSS vector + CWEs. Fails CLOSED. */
export function classifyRisk(raw: {
  cvss?: { vectorString?: string } | null
  cwe?: string[] | null
}): Classification {
  const vec = parseVector(raw.cvss?.vectorString ?? '')
  const cwes = (raw.cwe ?? []).map((c) => String(c).replace(/^CWE-/i, ''))
  const escalatable = cwes.some((c) => ESCALATABLE_CWE.has(c))

  if (!vec) {
    return {
      nature: 'unknown',
      label: 'UNCLASSIFIED',
      basis: 'no CVSS vector in advisory — treat as worst case',
    }
  }

  // CVSS 4.0 renamed the impact metrics: VC/VI/VA (vulnerable system) and
  // SC/SI/SA (subsequent system). 2.0/3.x use plain C/I/A. Support both; any
  // other shape is unknown rather than assumed benign.
  const v = vec.__version
  const isV4 = v.startsWith('4')
  const conf = isV4 ? vec.VC ?? vec.SC : vec.C
  const integ = isV4 ? vec.VI ?? vec.SI : vec.I
  const avail = isV4 ? vec.VA ?? vec.SA : vec.A

  if (conf === undefined || integ === undefined || avail === undefined) {
    return {
      nature: 'unknown',
      label: 'UNCLASSIFIED',
      basis: `CVSS ${v} vector missing impact metrics — treat as worst case`,
    }
  }

  const hit = (x: string) => x === 'L' || x === 'H'
  if (hit(conf) || hit(integ)) {
    return {
      nature: 'compromise',
      label: 'LEAK/ALTER',
      basis: `CVSS ${v} C:${conf} I:${integ}`,
    }
  }
  if (escalatable) {
    return {
      nature: 'unknown',
      label: 'DoS?+ESCALATABLE',
      basis: `CVSS ${v} A:${avail} only, but CWE-${cwes.join(
        '/'
      )} can escalate`,
    }
  }
  return {
    nature: 'dos',
    label: 'DoS-only',
    basis: `CVSS ${v} C:N I:N A:${avail}`,
  }
}

/**
 * A time-boxed exception. A gate suppresses a matching advisory ONLY while it is
 * valid and unexpired — after `expires` it stops suppressing and the build fails
 * again, which is the point: an accepted risk gets re-evaluated on a deadline
 * rather than living forever in an allowlist nobody re-reads.
 */
export interface AuditGate {
  /** GHSA id, the numeric advisory id, or a package name (package match is broad) */
  advisory: string
  /** why this is temporarily allowed — required, non-empty */
  reason: string
  /** YYYY-MM-DD; on/after this date the gate no longer suppresses — required */
  expires: string
}

export interface AuditConfig {
  /** 'fail' (default) blocks the build; 'warn' reports and proceeds; 'off' skips it */
  mode?: AuditMode
  /** minimum severity that blocks, default 'high' */
  level?: AuditSeverity
  /** time-boxed exceptions */
  allow?: AuditGate[]
}

export interface GatedFinding {
  advisory: AuditAdvisory
  reason: string
  /** whole days until the gate expires (active gate) */
  daysLeft?: number
  /** whole days since the gate expired (expired gate) */
  daysAgo?: number
}

export interface AuditResult {
  /** did the audit actually run and parse? false => fail-open, treated as pass */
  ran: boolean
  /** no blocking findings (or couldn't run) */
  ok: boolean
  mode: AuditMode
  level: AuditSeverity
  /** at/above threshold and NOT suppressed — these fail the build */
  blocking: AuditAdvisory[]
  /** suppressed by a valid, unexpired gate */
  gated: GatedFinding[]
  /** matched a gate whose expiry has passed — NOT suppressed (also in `blocking`) */
  expired: GatedFinding[]
  /** gates that are structurally invalid (missing reason/expires) — ignored */
  invalid: Array<{ gate: AuditGate; problem: string }>
  /** valid gates that matched no current advisory — safe to delete */
  stale: AuditGate[]
  /** findings below the blocking threshold (reported, never blocking) */
  belowThreshold: AuditAdvisory[]
}

/** Injectable subprocess seam for tests. */
export type AuditRunner = () => Promise<string>

/*
The audit is FAST — sub-second even on a large tree, because the dependency
resolution is local and it is one registry round-trip. That is why it runs
synchronously everywhere (see buildSite / devServer): a gate you wait for is a gate
that cannot be raced, and it removes a whole class of "it printed after I'd already
started working" edge cases.

What sync DOES introduce is a hang: a captive portal, a VPN coming up, or a
registry black-holing the connection makes a fetch that never returns, and a build
that hangs forever is worse than one that skips a check. So bound it — on timeout
we fail OPEN (same as offline), because an advisory we could not fetch must not
ground someone on a plane.
*/
export const AUDIT_TIMEOUT_MS = 20_000

/*
The runner MUST read the exit code. Measured on bun 1.3.14:

  clean tree            → exit 0, stdout `{}`      (3 bytes — never empty)
  advisories found      → exit 1, stdout `{...}`
  no lockfile           → exit 1, stdout EMPTY, stderr `error: Lockfile not found`
  offline / registry
    refused / old bun   → exit 1, stdout EMPTY

so **empty stdout means the audit FAILED — it never means "clean"**. An earlier
version returned stdout blind and let `parseAuditJson('')` answer `[]`, which the
caller read as `ran: true, ok: true` and printed "✅ dependency audit clean" — a
green checkmark for a check that never contacted the registry, on every build,
forever, for anyone behind a proxy or on a non-bun lockfile. A security gate that
reports a pass it did not earn is worse than no gate: it converts an unknown into a
false assurance. Exit code first, then content.
*/
const defaultRunner: AuditRunner = async () => {
  const proc = $`bun audit --json`.nothrow().quiet()
  const timeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), AUDIT_TIMEOUT_MS).unref?.()
  )
  const r = await Promise.race([proc, timeout])
  if (r === null) throw new Error('bun audit timed out')
  const stdout = r.stdout.toString()
  // 0 = clean, 1 = advisories found. Both print JSON. Anything else — or a
  // "success" with no output at all — is a failed run, not a clean one: throw so
  // the caller takes the honest fail-OPEN path (ran:false) and warns.
  if (r.exitCode !== 0 && r.exitCode !== 1) {
    throw new Error(
      `bun audit exited ${r.exitCode}: ${r.stderr
        .toString()
        .trim()
        .slice(0, 300)}`
    )
  }
  if (stdout.trim() === '') {
    throw new Error(
      `bun audit produced no output (exit ${r.exitCode}): ` +
        `${r.stderr.toString().trim().slice(0, 300) || 'no stderr'}`
    )
  }
  return stdout
}

/** Extract a GHSA id from an advisory URL, if the URL carries one. */
function parseGhsa(url: string): string | undefined {
  const m = url?.match(/GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}/i)
  return m ? m[0] : undefined
}

/**
 * Parse `bun audit --json` output — `{ "<pkg>": [advisory, …] }` — into a flat
 * advisory list. Returns null when the text is not a JSON object (offline, an
 * error dump, an incompatible bun): the caller reads null as "couldn't check".
 */
export function parseAuditJson(text: string): AuditAdvisory[] | null {
  const trimmed = text.trim()
  // Empty is NOT "clean" — a clean tree prints `{}`. Empty stdout only happens
  // when the audit failed (no lockfile, offline, registry refused, bun too old),
  // so answering `[]` here manufactured a green result out of a failed check.
  if (trimmed === '') return null
  let data: unknown
  try {
    data = JSON.parse(trimmed)
  } catch {
    return null
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data))
    return null
  const out: AuditAdvisory[] = []
  for (const [pkg, advisories] of Object.entries(
    data as Record<string, unknown>
  )) {
    if (!Array.isArray(advisories)) continue
    for (const a of advisories) {
      if (!a || typeof a !== 'object') continue
      const adv = a as Record<string, unknown>
      const severity = String(
        adv.severity ?? 'info'
      ).toLowerCase() as AuditSeverity
      out.push({
        package: pkg,
        id: Number(adv.id) || 0,
        url: String(adv.url ?? ''),
        title: String(adv.title ?? ''),
        severity: severity in SEVERITY_RANK ? severity : 'info',
        vulnerableVersions:
          adv.vulnerable_versions != null
            ? String(adv.vulnerable_versions)
            : undefined,
        ghsa: parseGhsa(String(adv.url ?? '')),
        risk: classifyRisk({
          cvss: adv.cvss as { vectorString?: string } | null | undefined,
          cwe: Array.isArray(adv.cwe) ? (adv.cwe as string[]) : null,
        }),
      })
    }
  }
  return out
}

/** yyyy-mm-dd for a Date, in UTC (so gate expiry is timezone-stable). */
function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(fromIso + 'T00:00:00Z')
  const b = Date.parse(toIso + 'T00:00:00Z')
  return Math.round((b - a) / 86400000)
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Does a gate refer to this advisory? By GHSA, numeric id, or package name. */
function gateMatches(gate: AuditGate, adv: AuditAdvisory): boolean {
  const ref = gate.advisory?.trim()
  if (!ref) return false
  if (adv.ghsa && ref.toLowerCase() === adv.ghsa.toLowerCase()) return true
  if (adv.id && ref === String(adv.id)) return true
  if (ref === adv.package) return true
  return false
}

/** Resolve the effective mode from config + the TOSIJS_AUDIT env override. */
export function resolveAuditMode(
  config: boolean | AuditConfig | undefined
): AuditMode {
  const env = process.env.TOSIJS_AUDIT?.toLowerCase()
  if (env === 'off' || env === 'warn' || env === 'fail') return env
  if (config === false) return 'off'
  if (config === true || config === undefined) return 'fail' // on by default
  return config.mode ?? 'fail'
}

/*
"Audit ONCE per process, never on a watch rebuild" is the real invariant, and it
used to be enforced by three separate call sites remembering to pass `skipAudit`
— which means it was owned by nobody. The documented adopter pattern already broke
it: `doc-site-system.md` tells you to hand `devServer` a `{ build }` that calls
`buildSite(config)`, with no `skipAudit`, so every keystroke rebuild fired a
registry round-trip — a network call in the edit loop, and offline dev broken, for
anyone who followed the docs.

Own it here instead. The first real audit in a process is remembered and every
later call returns it, so the invariant holds no matter how many callers there are
or which of them forgot a flag. `skipAudit` still short-circuits earlier (it avoids
even the first call), and an injected `runAudit` always re-runs — tests need to
drive many scenarios in one process, and memoizing those would make them lie.
*/
let processAudit: AuditResult | null = null

/** Test-only: forget the per-process audit memo. */
export function resetAuditMemo(): void {
  processAudit = null
}

/** Remember a real (non-injected) audit so later callers reuse it. */
function memo(result: AuditResult, injected: boolean | undefined): AuditResult {
  if (!injected) processAudit = result
  return result
}

/**
 * Run `bun audit`, classify findings against the configured threshold and the
 * time-boxed allowlist, and return a structured verdict. Never exits.
 *
 * Memoized per process (see above) unless `opts.runAudit` is injected.
 */
export async function auditDependencies(
  config: boolean | AuditConfig | undefined,
  opts: { now?: Date; runAudit?: AuditRunner } = {}
): Promise<AuditResult> {
  if (!opts.runAudit && processAudit) return processAudit
  const mode = resolveAuditMode(config)
  const cfg: AuditConfig = config && typeof config === 'object' ? config : {}
  const level: AuditSeverity = cfg.level ?? 'high'
  const now = opts.now ?? new Date()
  const today = isoDay(now)

  const base: AuditResult = {
    ran: false,
    ok: true,
    mode,
    level,
    blocking: [],
    gated: [],
    expired: [],
    invalid: [],
    stale: [],
    belowThreshold: [],
  }

  // Not memoized: nothing ran, so there is no result to reuse.
  if (mode === 'off') return base

  let text: string
  try {
    text = await (opts.runAudit ?? defaultRunner)()
  } catch {
    return memo(base, !!opts.runAudit) // couldn't even spawn — fail open
  }
  const advisories = parseAuditJson(text)
  // Unparseable/empty => couldn't check. Memoized so a watch session doesn't
  // retry the registry on every rebuild while offline.
  if (advisories === null) return memo(base, !!opts.runAudit)

  const result: AuditResult = { ...base, ran: true }
  const threshold = SEVERITY_RANK[level]

  // Validate gates once; an invalid gate (no reason / no valid date) never
  // suppresses — that is what "explicitly and specifically gated" means.
  const gates = cfg.allow ?? []
  const validGates: AuditGate[] = []
  for (const gate of gates) {
    const problems: string[] = []
    if (!gate.advisory?.trim()) problems.push('no advisory id/package')
    if (!gate.reason?.trim()) problems.push('no reason')
    if (!gate.expires?.trim() || !DATE_RE.test(gate.expires.trim())) {
      problems.push('no valid expires (YYYY-MM-DD)')
    } else if (Number.isNaN(Date.parse(gate.expires.trim() + 'T00:00:00Z'))) {
      problems.push('unparseable expires date')
    }
    if (problems.length) {
      result.invalid.push({ gate, problem: problems.join('; ') })
    } else {
      validGates.push(gate)
    }
  }

  const usedGates = new Set<AuditGate>()

  for (const adv of advisories) {
    if (SEVERITY_RANK[adv.severity] < threshold) {
      result.belowThreshold.push(adv)
      continue
    }
    const gate = validGates.find((g) => gateMatches(g, adv))
    if (!gate) {
      result.blocking.push(adv)
      continue
    }
    usedGates.add(gate)
    const expires = gate.expires.trim()
    if (today >= expires) {
      // Gate has expired (inclusive of the expiry day) — re-evaluate; it blocks.
      result.expired.push({
        advisory: adv,
        reason: gate.reason,
        daysAgo: daysBetween(expires, today),
      })
      result.blocking.push(adv)
    } else {
      result.gated.push({
        advisory: adv,
        reason: gate.reason,
        daysLeft: daysBetween(today, expires),
      })
    }
  }

  // Valid gates that suppressed nothing this run — the advisory is gone; delete them.
  result.stale = validGates.filter((g) => !usedGates.has(g))
  result.ok = result.blocking.length === 0
  return memo(result, !!opts.runAudit)
}

const DUE_DILIGENCE = [
  'Before adopting a patch:',
  '  • Read the advisory. Confirm the patched version genuinely fixes it and is',
  '    published by the package’s real maintainers (guard against hijacked releases).',
  '  • Prefer the MINIMAL fix — a targeted `overrides`/`resolutions` pin to the',
  '    patched version — over a broad `bun update --latest` that churns dozens of',
  '    transitive deps, each a fresh supply-chain surface.',
  '  • Treat large churn in a "patch" as itself suspicious; review what moved.',
  '  • If you can’t patch now, GATE it (reason + near-term expiry) — don’t silence it.',
].join('\n')

/*
`bun audit` reports one entry per (package, vulnerable-range) pair, so ONE advisory
against a package that appears at several versions in the tree arrives as several
entries. Measured on a real tree: 16 entries were 12 distinct advisories across 6
packages — minimatch alone printed 6 lines for 3 advisories. Reporting the raw
count over-states the workload by a third and buries the findings that matter, so
group by (package, advisory) for display and list the affected ranges together.

Grouping is presentation-only: `result.blocking` stays the flat list, because it is
what `ok` is computed from and what a caller may want to inspect.
*/
export interface GroupedAdvisory {
  advisory: AuditAdvisory
  /** every vulnerable range this advisory matched for this package */
  ranges: string[]
}

export function groupAdvisories(
  advisories: AuditAdvisory[]
): GroupedAdvisory[] {
  const groups = new Map<string, GroupedAdvisory>()
  for (const adv of advisories) {
    // Same package AND same advisory → one entry. Different packages stay
    // separate even under a shared advisory id (they're genuinely different fixes).
    const key = `${adv.package}::${adv.ghsa ?? adv.id}`
    const existing = groups.get(key)
    if (existing) {
      if (
        adv.vulnerableVersions &&
        !existing.ranges.includes(adv.vulnerableVersions)
      ) {
        existing.ranges.push(adv.vulnerableVersions)
      }
    } else {
      groups.set(key, {
        advisory: adv,
        ranges: adv.vulnerableVersions ? [adv.vulnerableVersions] : [],
      })
    }
  }
  return Array.from(groups.values())
}

/*
Order by what a reader must act on FIRST. Severity descending, then by nature —
`compromise` and `unknown` ahead of `dos`, because "can execute code" outranks "can
be made slow". On the real tree this was not cosmetic: the ONE critical (a happy-dom
VM-context-escape → RCE) printed sixth, wedged between ReDoS entries, purely because
`bun audit` emits in package order.
*/
const NATURE_RANK: Record<RiskNature, number> = {
  compromise: 0,
  unknown: 1,
  dos: 2,
}

function bySeverityThenNature(a: AuditAdvisory, b: AuditAdvisory): number {
  const sev = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]
  if (sev !== 0) return sev
  const nature =
    NATURE_RANK[a.risk?.nature ?? 'unknown'] -
    NATURE_RANK[b.risk?.nature ?? 'unknown']
  if (nature !== 0) return nature
  return a.package.localeCompare(b.package)
}

function line(group: GroupedAdvisory): string {
  const adv = group.advisory
  // The risk label is triage sugar, not a verdict — this finding blocks either way.
  const risk = adv.risk ? `  [${adv.risk.label}]` : ''
  const basis = adv.risk ? `\n            ${adv.risk.basis}` : ''
  const ranges = group.ranges.length
    ? `\n            affects ${group.ranges.join(', ')}`
    : ''
  return (
    `   ${adv.severity.toUpperCase().padEnd(8)} ${adv.package}${risk}\n` +
    `            ${adv.title}${basis}${ranges}\n` +
    `            ${adv.ghsa ?? adv.id} — ${adv.url}`
  )
}

/*
Below-threshold findings used to be collected and never shown, which made them
invisible: a moderate today is a high the day someone re-scores it, and you want to
have seen it coming. They get ONE line each — severity, package, id, truncated title
— so the whole tail is scannable without competing with what actually blocks.
*/
function compactLine(group: GroupedAdvisory): string {
  const adv = group.advisory
  const title = adv.title.length > 68 ? adv.title.slice(0, 67) + '…' : adv.title
  return (
    `   ${adv.severity.padEnd(8)} ${adv.package.padEnd(22)} ` +
    `${(adv.ghsa ?? String(adv.id)).padEnd(22)} ${title}`
  )
}

/**
 * Print the verdict. Blocking findings first (why the build is failing), then
 * active gates, expired/invalid gates, stale gates, and — when blocking — the
 * due-diligence footer. Returns nothing; the caller decides what to do with `ok`.
 */
export function reportAudit(result: AuditResult, label = 'Build'): void {
  if (!result.ran) {
    console.warn(
      `⚠️  ${label}: could not run \`bun audit\` (offline, registry down, or ` +
        `unsupported bun). Skipping the dependency gate for this run.`
    )
    return
  }

  if (result.gated.length) {
    console.warn(
      `\n🔓 ${label}: ${result.gated.length} audit finding(s) allowed by an ` +
        `active gate:\n` +
        result.gated
          .map(
            (g) =>
              `   ${g.advisory.severity.toUpperCase()} ${g.advisory.package} ` +
              `(${g.advisory.ghsa ?? g.advisory.id}) — ${g.daysLeft}d left\n` +
              `            reason: ${g.reason}`
          )
          .join('\n')
    )
  }

  if (result.stale.length) {
    console.warn(
      `\n🧹 ${label}: ${result.stale.length} audit gate(s) match no current ` +
        `advisory — remove them:\n` +
        result.stale.map((g) => `   ${g.advisory} — ${g.reason}`).join('\n')
    )
  }

  // Everything below the blocking threshold, one line each, severity-sorted. These
  // used to be collected and never printed — invisible until the day one is
  // re-scored upward. Shown whether or not the build is failing.
  if (result.belowThreshold.length) {
    const groups = groupAdvisories(result.belowThreshold).sort((a, b) =>
      bySeverityThenNature(a.advisory, b.advisory)
    )
    console.warn(
      `\nℹ️  ${label}: ${groups.length} advisory(ies) below the ${result.level} ` +
        `threshold — not blocking:\n` +
        groups.map(compactLine).join('\n')
    )
  }

  /*
  Advisory COUNT PER PACKAGE, across every severity — the code-smell signal.

  A single moderate advisory is noise; a dependency that keeps generating them is
  telling you something the per-finding view cannot. Deciding to drop a library
  with a long tail of quasi-flaky advisories is a legitimate engineering call, and
  it needs the aggregate, which is exactly what a threshold-filtered report hides.
  Only printed when something actually repeats, so a healthy tree stays silent.
  */
  const perPackage = new Map<string, number>()
  for (const adv of [...result.blocking, ...result.belowThreshold]) {
    const key = `${adv.package}::${adv.ghsa ?? adv.id}`
    if (!perPackage.has(key)) perPackage.set(key, 0)
  }
  const tally = new Map<string, number>()
  for (const key of perPackage.keys()) {
    const pkg = key.split('::')[0]
    tally.set(pkg, (tally.get(pkg) ?? 0) + 1)
  }
  const repeat = Array.from(tally.entries())
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
  if (repeat.length) {
    console.warn(
      `\n📊 ${label}: advisories per package — a package that keeps producing them ` +
        `may be worth replacing, not just patching:\n` +
        repeat
          .map(([pkg, n]) => `   ${String(n).padStart(3)}  ${pkg}`)
          .join('\n')
    )
  }

  if (result.ok) {
    if (result.blocking.length === 0 && result.ran) {
      // Quiet success line so the build log shows the gate ran.
      console.log(
        `✅ ${label}: dependency audit clean (level: ${result.level}).`
      )
    }
    return
  }

  const invalidNote = result.invalid.length
    ? `\n\n   ${result.invalid.length} gate(s) ignored as invalid:\n` +
      result.invalid
        .map((i) => `   • ${i.gate.advisory}: ${i.problem}`)
        .join('\n')
    : ''
  const expiredNote = result.expired.length
    ? `\n\n   ${result.expired.length} gate(s) have EXPIRED (re-evaluate):\n` +
      result.expired
        .map(
          (g) =>
            `   • ${g.advisory.package} (${
              g.advisory.ghsa ?? g.advisory.id
            }) — ` + `expired ${g.daysAgo}d ago; was: ${g.reason}`
        )
        .join('\n')
    : ''

  const verb =
    result.mode === 'warn' ? 'proceeding anyway' : 'failing the build'
  const emoji = result.mode === 'warn' ? '⚠️' : '🛑'
  // Group + sort so the count is the real workload and the worst thing is first.
  const groups = groupAdvisories(result.blocking).sort((a, b) =>
    bySeverityThenNature(a.advisory, b.advisory)
  )
  const packages = new Set(result.blocking.map((a) => a.package)).size
  // Only mention the raw finding count when grouping actually collapsed something,
  // so the usual case stays quiet.
  const spread =
    groups.length === result.blocking.length
      ? `in ${packages} package${packages === 1 ? '' : 's'}`
      : `in ${packages} package${packages === 1 ? '' : 's'}, ` +
        `from ${result.blocking.length} findings`
  console.error(
    `\n${emoji}  ${label}: ${groups.length} unaddressed ` +
      `${result.level}+ dependency advisory(ies) ${spread} — ${verb}.\n\n` +
      groups.map(line).join('\n\n') +
      expiredNote +
      invalidNote +
      `\n\n${DUE_DILIGENCE}\n\n` +
      `   To accept a risk on a deadline, add to your site config's ` +
      `\`audit.allow\`:\n` +
      `     { advisory: '<GHSA-…|id|package>', reason: '…', expires: 'YYYY-MM-DD' }\n` +
      `   Turn the gate off with \`audit: false\` or TOSIJS_AUDIT=off (not recommended).\n`
  )
}
