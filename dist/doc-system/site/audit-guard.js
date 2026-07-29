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
import { $ } from 'bun';
const SEVERITY_RANK = {
    info: 0,
    low: 1,
    moderate: 2,
    high: 3,
    critical: 4,
};
/*
CWEs that routinely escalate beyond what the vector admits. Prototype pollution is
the canonical case and it is not hypothetical: in the sample set, protobufjs had an
advisory scored A:H (availability-only) tagged CWE-1321, AND a separate C:H/I:H
advisory titled "code generation gadget AFTER prototype pollution" — the escalation
chain the first vector does not encode. A vector-only reading calls that benign.
*/
const ESCALATABLE_CWE = new Set(['1321', '915', '502', '94', '78', '77']);
function parseVector(v) {
    if (!v)
        return null;
    const out = {};
    let version = '';
    for (const part of v.split('/')) {
        const [k, val] = part.split(':');
        if (!k || !val)
            continue;
        if (k === 'CVSS')
            version = val;
        else
            out[k] = val;
    }
    if (!Object.keys(out).length)
        return null;
    out.__version = version || '?';
    return out;
}
/** Classify one advisory's nature from its CVSS vector + CWEs. Fails CLOSED. */
export function classifyRisk(raw) {
    const vec = parseVector(raw.cvss?.vectorString ?? '');
    const cwes = (raw.cwe ?? []).map((c) => String(c).replace(/^CWE-/i, ''));
    const escalatable = cwes.some((c) => ESCALATABLE_CWE.has(c));
    if (!vec) {
        return {
            nature: 'unknown',
            label: 'UNCLASSIFIED',
            basis: 'no CVSS vector in advisory — treat as worst case',
        };
    }
    // CVSS 4.0 renamed the impact metrics: VC/VI/VA (vulnerable system) and
    // SC/SI/SA (subsequent system). 2.0/3.x use plain C/I/A. Support both; any
    // other shape is unknown rather than assumed benign.
    const v = vec.__version;
    const isV4 = v.startsWith('4');
    const conf = isV4 ? vec.VC ?? vec.SC : vec.C;
    const integ = isV4 ? vec.VI ?? vec.SI : vec.I;
    const avail = isV4 ? vec.VA ?? vec.SA : vec.A;
    if (conf === undefined || integ === undefined || avail === undefined) {
        return {
            nature: 'unknown',
            label: 'UNCLASSIFIED',
            basis: `CVSS ${v} vector missing impact metrics — treat as worst case`,
        };
    }
    const hit = (x) => x === 'L' || x === 'H';
    if (hit(conf) || hit(integ)) {
        return {
            nature: 'compromise',
            label: 'LEAK/ALTER',
            basis: `CVSS ${v} C:${conf} I:${integ}`,
        };
    }
    if (escalatable) {
        return {
            nature: 'unknown',
            label: 'DoS?+ESCALATABLE',
            basis: `CVSS ${v} A:${avail} only, but CWE-${cwes.join('/')} can escalate`,
        };
    }
    return {
        nature: 'dos',
        label: 'DoS-only',
        basis: `CVSS ${v} C:N I:N A:${avail}`,
    };
}
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
export const AUDIT_TIMEOUT_MS = 20_000;
const defaultRunner = async () => {
    // Both 0 (clean) and 1 (vulnerabilities found) produce valid JSON on stdout; any
    // other exit is treated as "couldn't check" via a parse failure below.
    const proc = $ `bun audit --json`.nothrow().quiet();
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), AUDIT_TIMEOUT_MS).unref?.());
    const r = await Promise.race([proc, timeout]);
    if (r === null)
        throw new Error('bun audit timed out');
    return r.stdout.toString();
};
/** Extract a GHSA id from an advisory URL, if the URL carries one. */
function parseGhsa(url) {
    const m = url?.match(/GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}/i);
    return m ? m[0] : undefined;
}
/**
 * Parse `bun audit --json` output — `{ "<pkg>": [advisory, …] }` — into a flat
 * advisory list. Returns null when the text is not a JSON object (offline, an
 * error dump, an incompatible bun): the caller reads null as "couldn't check".
 */
export function parseAuditJson(text) {
    const trimmed = text.trim();
    if (trimmed === '')
        return []; // clean tree can print nothing
    let data;
    try {
        data = JSON.parse(trimmed);
    }
    catch {
        return null;
    }
    if (data === null || typeof data !== 'object' || Array.isArray(data))
        return null;
    const out = [];
    for (const [pkg, advisories] of Object.entries(data)) {
        if (!Array.isArray(advisories))
            continue;
        for (const a of advisories) {
            if (!a || typeof a !== 'object')
                continue;
            const adv = a;
            const severity = String(adv.severity ?? 'info').toLowerCase();
            out.push({
                package: pkg,
                id: Number(adv.id) || 0,
                url: String(adv.url ?? ''),
                title: String(adv.title ?? ''),
                severity: severity in SEVERITY_RANK ? severity : 'info',
                vulnerableVersions: adv.vulnerable_versions != null
                    ? String(adv.vulnerable_versions)
                    : undefined,
                ghsa: parseGhsa(String(adv.url ?? '')),
                risk: classifyRisk({
                    cvss: adv.cvss,
                    cwe: Array.isArray(adv.cwe) ? adv.cwe : null,
                }),
            });
        }
    }
    return out;
}
/** yyyy-mm-dd for a Date, in UTC (so gate expiry is timezone-stable). */
function isoDay(d) {
    return d.toISOString().slice(0, 10);
}
function daysBetween(fromIso, toIso) {
    const a = Date.parse(fromIso + 'T00:00:00Z');
    const b = Date.parse(toIso + 'T00:00:00Z');
    return Math.round((b - a) / 86400000);
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Does a gate refer to this advisory? By GHSA, numeric id, or package name. */
function gateMatches(gate, adv) {
    const ref = gate.advisory?.trim();
    if (!ref)
        return false;
    if (adv.ghsa && ref.toLowerCase() === adv.ghsa.toLowerCase())
        return true;
    if (adv.id && ref === String(adv.id))
        return true;
    if (ref === adv.package)
        return true;
    return false;
}
/** Resolve the effective mode from config + the TOSIJS_AUDIT env override. */
export function resolveAuditMode(config) {
    const env = process.env.TOSIJS_AUDIT?.toLowerCase();
    if (env === 'off' || env === 'warn' || env === 'fail')
        return env;
    if (config === false)
        return 'off';
    if (config === true || config === undefined)
        return 'fail'; // on by default
    return config.mode ?? 'fail';
}
/**
 * Run `bun audit`, classify findings against the configured threshold and the
 * time-boxed allowlist, and return a structured verdict. Never exits.
 */
export async function auditDependencies(config, opts = {}) {
    const mode = resolveAuditMode(config);
    const cfg = config && typeof config === 'object' ? config : {};
    const level = cfg.level ?? 'high';
    const now = opts.now ?? new Date();
    const today = isoDay(now);
    const base = {
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
    };
    if (mode === 'off')
        return base;
    let text;
    try {
        text = await (opts.runAudit ?? defaultRunner)();
    }
    catch {
        return base; // couldn't even spawn — fail open
    }
    const advisories = parseAuditJson(text);
    if (advisories === null)
        return base; // unparseable — fail open
    const result = { ...base, ran: true };
    const threshold = SEVERITY_RANK[level];
    // Validate gates once; an invalid gate (no reason / no valid date) never
    // suppresses — that is what "explicitly and specifically gated" means.
    const gates = cfg.allow ?? [];
    const validGates = [];
    for (const gate of gates) {
        const problems = [];
        if (!gate.advisory?.trim())
            problems.push('no advisory id/package');
        if (!gate.reason?.trim())
            problems.push('no reason');
        if (!gate.expires?.trim() || !DATE_RE.test(gate.expires.trim())) {
            problems.push('no valid expires (YYYY-MM-DD)');
        }
        else if (Number.isNaN(Date.parse(gate.expires.trim() + 'T00:00:00Z'))) {
            problems.push('unparseable expires date');
        }
        if (problems.length) {
            result.invalid.push({ gate, problem: problems.join('; ') });
        }
        else {
            validGates.push(gate);
        }
    }
    const usedGates = new Set();
    for (const adv of advisories) {
        if (SEVERITY_RANK[adv.severity] < threshold) {
            result.belowThreshold.push(adv);
            continue;
        }
        const gate = validGates.find((g) => gateMatches(g, adv));
        if (!gate) {
            result.blocking.push(adv);
            continue;
        }
        usedGates.add(gate);
        const expires = gate.expires.trim();
        if (today >= expires) {
            // Gate has expired (inclusive of the expiry day) — re-evaluate; it blocks.
            result.expired.push({
                advisory: adv,
                reason: gate.reason,
                daysAgo: daysBetween(expires, today),
            });
            result.blocking.push(adv);
        }
        else {
            result.gated.push({
                advisory: adv,
                reason: gate.reason,
                daysLeft: daysBetween(today, expires),
            });
        }
    }
    // Valid gates that suppressed nothing this run — the advisory is gone; delete them.
    result.stale = validGates.filter((g) => !usedGates.has(g));
    result.ok = result.blocking.length === 0;
    return result;
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
].join('\n');
function line(adv) {
    // The risk label is triage sugar, not a verdict — this finding blocks either way.
    const risk = adv.risk ? `  [${adv.risk.label}]` : '';
    const basis = adv.risk ? `\n            ${adv.risk.basis}` : '';
    return (`   ${adv.severity.toUpperCase().padEnd(8)} ${adv.package}` +
        `${adv.vulnerableVersions ? ` (${adv.vulnerableVersions})` : ''}${risk}\n` +
        `            ${adv.title}${basis}\n` +
        `            ${adv.ghsa ?? adv.id} — ${adv.url}`);
}
/**
 * Print the verdict. Blocking findings first (why the build is failing), then
 * active gates, expired/invalid gates, stale gates, and — when blocking — the
 * due-diligence footer. Returns nothing; the caller decides what to do with `ok`.
 */
export function reportAudit(result, label = 'Build') {
    if (!result.ran) {
        console.warn(`⚠️  ${label}: could not run \`bun audit\` (offline, registry down, or ` +
            `unsupported bun). Skipping the dependency gate for this run.`);
        return;
    }
    if (result.gated.length) {
        console.warn(`\n🔓 ${label}: ${result.gated.length} audit finding(s) allowed by an ` +
            `active gate:\n` +
            result.gated
                .map((g) => `   ${g.advisory.severity.toUpperCase()} ${g.advisory.package} ` +
                `(${g.advisory.ghsa ?? g.advisory.id}) — ${g.daysLeft}d left\n` +
                `            reason: ${g.reason}`)
                .join('\n'));
    }
    if (result.stale.length) {
        console.warn(`\n🧹 ${label}: ${result.stale.length} audit gate(s) match no current ` +
            `advisory — remove them:\n` +
            result.stale.map((g) => `   ${g.advisory} — ${g.reason}`).join('\n'));
    }
    if (result.ok) {
        if (result.blocking.length === 0 && result.ran) {
            // Quiet success line so the build log shows the gate ran.
            console.log(`✅ ${label}: dependency audit clean (level: ${result.level}).`);
        }
        return;
    }
    const invalidNote = result.invalid.length
        ? `\n\n   ${result.invalid.length} gate(s) ignored as invalid:\n` +
            result.invalid.map((i) => `   • ${i.gate.advisory}: ${i.problem}`).join('\n')
        : '';
    const expiredNote = result.expired.length
        ? `\n\n   ${result.expired.length} gate(s) have EXPIRED (re-evaluate):\n` +
            result.expired
                .map((g) => `   • ${g.advisory.package} (${g.advisory.ghsa ?? g.advisory.id}) — ` +
                `expired ${g.daysAgo}d ago; was: ${g.reason}`)
                .join('\n')
        : '';
    const verb = result.mode === 'warn' ? 'proceeding anyway' : 'failing the build';
    const emoji = result.mode === 'warn' ? '⚠️' : '🛑';
    console.error(`\n${emoji}  ${label}: ${result.blocking.length} unaddressed ` +
        `${result.level}+ dependency advisory(ies) — ${verb}.\n\n` +
        result.blocking.map(line).join('\n\n') +
        expiredNote +
        invalidNote +
        `\n\n${DUE_DILIGENCE}\n\n` +
        `   To accept a risk on a deadline, add to your site config's ` +
        `\`audit.allow\`:\n` +
        `     { advisory: '<GHSA-…|id|package>', reason: '…', expires: 'YYYY-MM-DD' }\n` +
        `   Turn the gate off with \`audit: false\` or TOSIJS_AUDIT=off (not recommended).\n`);
}
