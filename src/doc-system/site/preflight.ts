/*
Machine-health preflight for the doc-site build and dev server.

The memory watchdog in `dev-server.ts` bounds what THIS process does to the
machine. It is blind to what the machine is already doing — and that is where the
real damage came from: three dev servers left running from before a leak fix
landed (a running process keeps the code it loaded at launch, so updating the
package does nothing for it) grew to 103GB, 57GB and 49GB of RSS on a 32GB box.
Demand hit ~210GB against 32GB of RAM, the compressor swelled to 18GB, free
memory fell to 14MB, and the page-out scanner reclaimed zero pages. macOS's
jetsam never stepped in — it just let the box thrash for twenty minutes until it
was power-cycled.

Nothing in the build noticed, because nothing in the build ever looked. So look:
sample the process table at build start and at dev-server launch, and refuse to
add load to a machine that is already dying. Say which processes, how big, how
old, and the exact command to kill them.

Build-time only (Bun/Node APIs). Never import this from browser code.
*/

import * as os from 'os'
import { $ } from 'bun'

export interface ProcInfo {
  pid: number
  rssMb: number
  /** elapsed time as `ps` reports it, e.g. `01:23:45` or `2-04:11:07` */
  etime: string
  command: string
}

export interface Assessment {
  level: 'ok' | 'warn' | 'fail'
  /** processes worth naming, worst first */
  offenders: ProcInfo[]
  /** human-readable reason, empty when ok */
  reason: string
}

/**
 * Parse `ps -eo pid=,rss=,etime=,args=` output. Bytes are KB in `ps`; the command
 * is everything after the third field, so it may contain spaces.
 */
export function parsePs(output: string): ProcInfo[] {
  const procs: ProcInfo[] = []
  for (const line of output.split('\n')) {
    const m = line.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/)
    if (!m) continue
    procs.push({
      pid: Number(m[1]),
      rssMb: Math.round(Number(m[2]) / 1024),
      etime: m[3],
      command: m[4],
    })
  }
  return procs
}

/** `ps` etime — `[[dd-]hh:]mm:ss` — as hours. */
export function etimeHours(etime: string): number {
  const [days, rest] = etime.includes('-')
    ? [Number(etime.split('-')[0]), etime.split('-')[1]]
    : [0, etime]
  const parts = rest.split(':').map(Number)
  const [h, m, s] =
    parts.length === 3 ? parts : [0, parts[0] ?? 0, parts[1] ?? 0]
  return days * 24 + h + m / 60 + s / 3600
}

/**
 * A local dev server / build script — the thing we know should never be sitting on
 * gigabytes for hours.
 *
 * Deliberately `bun` (and `deno`) only, NOT `node`. Plenty of legitimate,
 * long-lived node processes routinely exceed the ceiling — Claude Code, VS Code's
 * extension host, a TypeScript server on a large project — and hard-failing every
 * build because the editor is fat would be a guard nobody keeps. A runaway node
 * process is still caught, by the >50%-of-RAM trigger, which is not a judgement
 * call about what the process is for.
 *
 * `bun install`/`test`/`x` and friends are one-shot commands, not servers.
 */
const isDevProcess = (command: string) => {
  // Match the EXECUTABLE, not any occurrence of "bun" in the command line. `/\b(bun|deno)\b/`
  // matched `node ~/.bun/install/global/…/cli.js` — a real line from this machine's process
  // table — because the word boundary happily lands inside a path.
  const argv0 = command.trim().split(/\s+/)[0] ?? ''
  const exe = argv0.split('/').pop() ?? ''
  if (!/^(bun|deno)$/.test(exe)) return false
  // One-shot subcommands are not servers. `build` is here because WE spawn it: the
  // bundler child is a `bun build`, and a build peaking mid-run must never look like a
  // runaway dev server — least of all to its own parent.
  const sub = command.trim().split(/\s+/)[1] ?? ''
  return !/^(test|install|add|remove|update|pm|x|create|init|link|outdated|publish|upgrade|build|run)$/.test(
    sub
  )
}

/**
 * Processes whose enormous RSS is the POINT of the machine, not a symptom.
 *
 * A local LLM holding a 96GB model resident is not a runaway — it is what the box is
 * for. Counting it as a hog would fail every build on a machine working exactly as
 * intended, and the predictable response to that is `DEV_SKIP_PREFLIGHT=1` in a shell
 * profile, which throws the whole guard away. A guard that cries wolf on the
 * machine's purpose is a guard that gets disabled.
 *
 * Exempt processes are never offenders, and their memory is subtracted from the
 * budget instead (see `memoryBudgetMb`) — so they shrink the headroom we police
 * rather than triggering on it.
 */
const isExemptProcess = (command: string) =>
  /\b(ollama|llama[-_.]?(server|cli|cpp)|lms|LM Studio|mlx[-_]lm|vllm|koboldcpp|text-generation-webui)\b/i.test(
    command
  )

/**
 * How much RAM is actually available to *dev work* — the denominator every
 * percentage below is taken against.
 *
 * This is the whole trick, and it is worth being explicit about why it is not
 * `totalmem()`. **Percentages of physical RAM scale with the hardware; headroom does
 * not.** Buy 96GB more memory and spend all of it on a resident model, and the slack
 * available to a runaway build is exactly what it was before — but every
 * percentage-of-RAM threshold has quadrupled, so the guard gets four times laxer on
 * the machine where it needed to be just as strict. On a 128GB box with a 96GB model
 * up, a 50%-of-RAM "catastrophic" bar is 64GB: double the headroom that exists, so it
 * can never fire in time.
 *
 * Budget = RAM − (what exempt processes hold) − (`reservedMb`), floored at
 * `minBudgetPct` of RAM so a machine that is genuinely fully committed still gets
 * sane thresholds rather than absurd ones. On the 128GB/96GB box that yields a ~32GB
 * budget — the same absolute thresholds that are right on a 32GB laptop, because the
 * slack is the same. Unload the model and the budget floats back up on its own.
 *
 * `devLimitMb` is deliberately NOT a percentage: it survives a hardware change
 * precisely because it is absolute. 4GB is too big for a dev server on any machine.
 */
export function memoryBudgetMb(
  procs: ProcInfo[],
  opts: { totalRamMb: number; reservedMb?: number; minBudgetPct?: number }
): number {
  const { totalRamMb, reservedMb = 0, minBudgetPct = 25 } = opts
  const exemptMb = procs
    .filter((p) => isExemptProcess(p.command))
    .reduce((sum, p) => sum + p.rssMb, 0)
  const floor = Math.round((totalRamMb * minBudgetPct) / 100)
  return Math.max(totalRamMb - exemptMb - reservedMb, floor)
}

/**
 * Judge the process table against physical RAM.
 *
 * THREE per-process triggers. Note what is deliberately NOT here: a rule that SUMS
 * RSS across processes. It is the obvious idea and it is wrong on macOS — at the
 * moment of the fatal crash, total RSS across 629 processes was ~225GB against 32GB
 * of RAM, and the box was still limping. Compression and swap mean summed footprint
 * routinely exceeds physical RAM on a perfectly healthy machine, so an aggregate-RSS
 * rule would fire during ordinary work and get switched off within a week. A SINGLE
 * process at half the machine is genuinely anomalous; the sum is not. (For a real
 * machine-level signal, see `assessMemoryPressure` below — VM pressure, not RSS
 * arithmetic.)
 *
 * Every percentage is taken against the **dev memory budget** (`memoryBudgetMb`), NOT
 * against physical RAM — see that function for why. Exempt processes (a resident LLM,
 * say) can never be offenders; they shrink the budget instead.
 *
 * - **Any process over `catastrophicPct` of the budget** (default 50%). Nothing
 *   healthy is half the available machine. Not limited to dev processes — if
 *   something else is eating the box, adding a build to it is still the wrong move.
 * - **A dev process over `hugeDevPct` of the budget** (default 25%), *regardless of
 *   age*. The age gate below is a real blind spot: the runaway that took the machine
 *   down went 0→100GB in about twenty minutes, so it spent its entire climb through
 *   the 4–16GB band both too young to be "stale" and too small to be "catastrophic" —
 *   i.e. invisible for the whole ascent. No legitimate dev process is a quarter of
 *   the available machine, young or not.
 * - **A long-lived dev process over `devLimitMb`** (default: the dev server's own RSS
 *   ceiling). Absolute, not a percentage — 4GB is too big for a dev server on any
 *   machine, and an absolute limit survives a hardware upgrade. Age-gated so a build
 *   legitimately peaking mid-run isn't flagged.
 *
 * `selfPid` is excluded throughout — this process's own growth is the memory
 * watchdog's job, and it is bounded there.
 */
export function assessProcesses(
  procs: ProcInfo[],
  opts: {
    totalRamMb: number
    selfPid?: number
    devLimitMb?: number
    catastrophicPct?: number
    hugeDevPct?: number
    minAgeHours?: number
    /** RAM to hold back for known-heavy non-dev work, on top of exempt processes */
    reservedMb?: number
  }
): Assessment {
  const {
    totalRamMb,
    selfPid,
    devLimitMb = 4096,
    catastrophicPct = 50,
    hugeDevPct = 25,
    minAgeHours = 1,
    reservedMb = 0,
  } = opts
  const budgetMb = memoryBudgetMb(procs, { totalRamMb, reservedMb })
  const pct = (p: number) => Math.round((budgetMb * p) / 100)
  const catastrophicMb = pct(catastrophicPct)
  const hugeDevMb = pct(hugeDevPct)
  // A resident model is the machine's purpose, not a hog: never an offender.
  const others = procs.filter(
    (p) => p.pid !== selfPid && !isExemptProcess(p.command)
  )
  const bySize = (a: ProcInfo, b: ProcInfo) => b.rssMb - a.rssMb
  const budgetNote =
    budgetMb < totalRamMb
      ? ` (${gb(budgetMb)} of ${gb(
          totalRamMb
        )} RAM is available to dev work; ` +
        `the rest is held by a resident model or reserved)`
      : ''

  const catastrophic = others.filter((p) => p.rssMb >= catastrophicMb)
  const devProcs = others.filter((p) => isDevProcess(p.command))
  const hugeDev = devProcs.filter(
    (p) => p.rssMb >= hugeDevMb && !catastrophic.includes(p)
  )
  const staleDevServers = devProcs.filter(
    (p) =>
      !catastrophic.includes(p) &&
      !hugeDev.includes(p) &&
      p.rssMb >= devLimitMb &&
      etimeHours(p.etime) >= minAgeHours
  )

  // A DEV process this big is a runaway, and we refuse. A NON-dev process this big is
  // very often the machine doing its actual job — Docker Desktop's VM, a `java -Xmx8g`,
  // an Xcode Simulator, a Parallels guest, a database. Failing someone's build and
  // telling them to `kill` their database is how a guard gets switched off forever, so
  // those only ever WARN. The honest "this machine is dying" signal is VM pressure,
  // which stays fail-closed precisely because it doesn't care what the memory is for.
  const catastrophicDev = catastrophic.filter((p) => isDevProcess(p.command))
  const catastrophicOther = catastrophic.filter((p) => !isDevProcess(p.command))
  const devOffenders = [
    ...catastrophicDev,
    ...hugeDev,
    ...staleDevServers,
  ].sort(bySize)

  if (devOffenders.length) {
    const worst = devOffenders[0]
    return {
      level: 'fail',
      offenders: devOffenders,
      reason:
        `${devOffenders.length} dev process${
          devOffenders.length === 1 ? ' is' : 'es are'
        } too big to be healthy — the largest is ${gb(worst.rssMb)}, against ` +
        `${gb(budgetMb)} of memory available for dev work${budgetNote}`,
    }
  }
  if (catastrophicOther.length) {
    return {
      level: 'warn',
      offenders: catastrophicOther.sort(bySize),
      reason:
        `${catastrophicOther.length} process${
          catastrophicOther.length === 1 ? ' is' : 'es are'
        } using more than ${catastrophicPct}% of the memory available for dev work — ` +
        `which may be entirely deliberate (a VM, a simulator, a database), so this is a ` +
        `warning, not a refusal${budgetNote}`,
    }
  }
  return { level: 'ok', offenders: [], reason: '' }
}

const gb = (mb: number) =>
  mb >= 1024 ? `${(mb / 1024).toFixed(mb >= 10240 ? 0 : 1)}GB` : `${mb}MB`

// ── VM pressure (macOS) ─────────────────────────────────────────────────────
//
// The honest machine-level signal, and the reason there is no summed-RSS rule above.
//
// What "this box is dying" actually looked like in the panic log: the compressor had
// swelled to 18GB, free memory was down to 14MB, and the page-out scanner wanted
// 3,094 pages and reclaimed ZERO. That is a full VM stall — no amount of RSS
// arithmetic gets you there, because summed RSS was ~225GB while the machine was
// still (barely) alive.
//
// ⚠️ TRAP: do NOT use macOS's own memory-pressure flag. The panic log recorded
// `memoryPressure: false` at the moment of death — with 14MB free and reclaim
// completely stalled. `memory_pressure -Q` and the pressure-level sysctl would both
// have cheerfully said "fine". Read free pages + compressor + swap instead.

export interface VmPressure {
  freeMb: number
  compressorMb: number
  swapUsedMb: number
}

/** Parse `vm_stat`. Page size is in its header ("page size of 16384 bytes"). */
export function parseVmStat(output: string): {
  freeMb: number
  compressorMb: number
} {
  const pageSize = Number(output.match(/page size of (\d+) bytes/)?.[1] ?? 4096)
  const pages = (label: string): number => {
    const m = output.match(new RegExp(`${label}:\\s+(\\d+)`))
    return m ? Number(m[1]) : 0
  }
  const toMb = (p: number) => Math.round((p * pageSize) / 1024 / 1024)
  return {
    freeMb: toMb(pages('Pages free')),
    compressorMb: toMb(pages('Pages occupied by compressor')),
  }
}

/** Parse `sysctl vm.swapusage` → used MB. */
export function parseSwapUsage(output: string): number {
  const m = output.match(/used\s*=\s*([\d.]+)([MGK])/i)
  if (!m) return 0
  const n = Number(m[1])
  const unit = m[2].toUpperCase()
  return Math.round(unit === 'G' ? n * 1024 : unit === 'K' ? n / 1024 : n)
}

/**
 * Judge VM pressure.
 *
 * Requires BOTH a swollen compressor AND almost no free memory. Either alone is
 * normal: macOS keeps free memory low on purpose (it is caching, not idling), and a
 * few GB of compressor on a busy machine is routine. It is the combination — the
 * compressor has eaten a large slice of RAM *and* there is nothing left to hand out
 * — that means the VM system is about to stall. Swap is reported for context and as
 * a corroborating trigger, not on its own: a Mac can sit on GBs of swap indefinitely
 * while perfectly healthy.
 */
export function assessMemoryPressure(
  vm: VmPressure,
  opts: {
    totalRamMb: number
    compressorPct?: number
    freeFloorMb?: number
    swapFloorMb?: number
  }
): { level: 'ok' | 'fail'; reason: string } {
  const {
    totalRamMb,
    compressorPct = 40,
    freeFloorMb = 256,
    swapFloorMb = 8192,
  } = opts
  const compressorMb = Math.round((totalRamMb * compressorPct) / 100)
  const compressorSwollen = vm.compressorMb >= compressorMb
  const starved = vm.freeMb <= freeFloorMb
  const swapping = vm.swapUsedMb >= swapFloorMb

  if (compressorSwollen && (starved || swapping)) {
    return {
      level: 'fail',
      reason:
        `the VM system is stalling — compressor at ${gb(vm.compressorMb)} ` +
        `(over ${compressorPct}% of ${gb(totalRamMb)} RAM), ` +
        `${gb(vm.freeMb)} free, ${gb(vm.swapUsedMb)} swapped`,
    }
  }
  return { level: 'ok', reason: '' }
}

async function readVmPressure(): Promise<VmPressure | null> {
  if (process.platform !== 'darwin') return null
  try {
    const [vmstat, swap] = await Promise.all([
      $`vm_stat`.quiet().text(),
      $`sysctl vm.swapusage`.quiet().text(),
    ])
    return {
      ...parseVmStat(vmstat),
      swapUsedMb: parseSwapUsage(swap),
    }
  } catch {
    return null
  }
}

/** Best-effort cwd for a pid, so a flagged process can be traced to its project. */
async function cwdOf(pid: number): Promise<string> {
  try {
    const out = await $`lsof -a -d cwd -p ${pid} -Fn`.quiet().text()
    const line = out.split('\n').find((l) => l.startsWith('n'))
    return line ? line.slice(1) : ''
  } catch {
    return ''
  }
}

async function snapshot(): Promise<ProcInfo[]> {
  const out = await $`ps -eo pid=,rss=,etime=,args=`.quiet().text()
  return parsePs(out)
}

/** pids descended from `pid` — our own build children, which we must never judge. */
async function descendantsOf(pid: number): Promise<number[]> {
  const out = await $`pgrep -P ${pid}`
    .quiet()
    .text()
    .catch(() => '')
  const kids = out
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
  const all = [...kids]
  for (const kid of kids) all.push(...(await descendantsOf(kid)))
  return all
}

/**
 * Is a hard failure appropriate here, or only a warning?
 *
 * **Warn in CI, and ONLY in CI.** A runner is a fresh box thrown away in four minutes:
 * there is no walked-away-from dev server on it, nobody to read the advice, and nothing
 * to kill — but a busy runner would turn a green suite into a mystery "webServer
 * exited", and a guard that flakes the test lane is a guard someone disables globally.
 *
 * It is tempting to also downgrade when stdout is not a TTY ("nobody is watching"), and
 * that is a trap: **a piped dev server is not an unattended one, it is an AGENT'S one**
 * — `bun start > dev.log` is exactly how a coding agent launches it, and
 * agent-launched servers are the precise population that left three runaways on this
 * machine and took it down. Disabling the guard where there is no terminal would
 * disable it exactly where it has already failed once.
 */
const hardFailAppropriate = (): boolean =>
  !process.env.CI && !process.env.GITHUB_ACTIONS

/**
 * Check the machine before adding load to it.
 *
 * Returns **true when it is safe to proceed**. It never calls `process.exit` — this is
 * library code (`buildSite`/`devServer` are public exports of `tosijs-ui/site`), and an
 * adopter's `await buildSite(cfg); await publishToS3()` must not be killed from inside
 * a health check it did not ask for. The caller decides what a `false` means.
 *
 * Modes (`mode`, or `preflight` in SiteConfig):
 *   'fail' — refuse (return false). Auto-downgraded to 'warn' in CI / non-TTY.
 *   'warn' — print and proceed.
 *   'off'  — skip entirely. Also `DEV_SKIP_PREFLIGHT=1`.
 *
 * Best-effort by construction: `ps` is POSIX-only, and a health check that breaks the
 * build when IT fails is worse than no health check at all.
 */
export type PreflightMode = 'off' | 'warn' | 'fail'

export async function preflight(
  opts: {
    devLimitMb?: number
    label?: string
    mode?: PreflightMode | false
    /** injected for tests; defaults to a real `ps` snapshot */
    procs?: ProcInfo[]
    /** injected for tests; defaults to this machine's physical RAM */
    totalRamMb?: number
    /** injected for tests; defaults to a real vm_stat/swapusage read (null off darwin) */
    vm?: VmPressure | null
  } = {}
): Promise<boolean> {
  const configured = opts.mode === false ? 'off' : opts.mode ?? 'fail'
  const mode: PreflightMode =
    process.env.DEV_SKIP_PREFLIGHT === '1' ? 'off' : configured
  if (mode === 'off' || process.platform === 'win32') return true

  // A `fail` that nobody is watching is a `warn` that breaks the build.
  const canFail = mode === 'fail' && hardFailAppropriate()
  const totalRamMb = opts.totalRamMb ?? Math.round(os.totalmem() / 1024 / 1024)

  // VM pressure first: it is the only check that speaks to whether the MACHINE is
  // dying, as opposed to whether some process looks wrong. A box in a full VM stall
  // is unsafe to build on no matter how innocent the process table looks.
  const vm = opts.vm !== undefined ? opts.vm : await readVmPressure()
  if (vm) {
    const pressure = assessMemoryPressure(vm, { totalRamMb })
    if (pressure.level === 'fail') {
      console.error(
        `\n🛑 ${opts.label ?? 'Build'}: this machine is out of memory.\n\n` +
          `   ${pressure.reason}.\n\n` +
          `   The page-out scanner has nothing left to reclaim, so the machine is about\n` +
          `   to spend its time swapping instead of working — and macOS will thrash\n` +
          `   rather than kill anything. Free some memory (quit apps, kill stray dev\n` +
          `   servers — \`ps -eo pid,rss,args | sort -k2 -rn | head\`) and try again.\n\n` +
          `   Override with DEV_SKIP_PREFLIGHT=1.\n`
      )
      // VM pressure is fail-closed even in CI: it is not a heuristic about someone
      // else's process, it is the machine reporting that it has nothing left to give.
      if (mode === 'fail') return false
    }
  }

  let assessment: Assessment
  try {
    // Never judge our OWN children. buildSite spawns `bun build`, the example-check,
    // tsc, the ePub child and a gzip child — and the dev server's health tick fires
    // every 60s, so it can easily land mid-rebuild and see the bundler we ourselves
    // started. A build peaking mid-run must not look like a runaway to its own parent.
    const mine = new Set([process.pid, ...(await descendantsOf(process.pid))])
    const procs = (opts.procs ?? (await snapshot())).filter(
      (p) => !mine.has(p.pid)
    )
    assessment = assessProcesses(procs, {
      totalRamMb,
      selfPid: process.pid,
      devLimitMb: opts.devLimitMb,
      // Hold back RAM for known-heavy non-dev work the exempt list can't name.
      reservedMb: Number(process.env.DEV_RESERVED_MB || 0) || 0,
    })
  } catch {
    return true // couldn't look — never block the build on the check itself
  }
  if (assessment.level === 'ok') return true

  const lines: string[] = []
  for (const p of assessment.offenders) {
    const cwd = await cwdOf(p.pid)
    lines.push(
      `   ${String(p.pid).padStart(6)}  ${gb(p.rssMb).padStart(7)}  ` +
        `${p.etime.padStart(9)} old  ${p.command.slice(0, 60)}` +
        (cwd ? `\n${' '.repeat(10)}in ${cwd}` : '')
    )
  }
  // A warn-level assessment (a big NON-dev process — a VM, a simulator, a database)
  // never refuses. Say it once and get out of the way.
  if (assessment.level === 'warn' || !canFail) {
    console.warn(
      `\n⚠️  ${opts.label ?? 'Build'}: ${assessment.reason}.\n\n` +
        `      PID      RSS       AGE  COMMAND\n${lines.join('\n')}\n` +
        (canFail
          ? ''
          : `\n   (Proceeding anyway: CI. Nothing here to kill, nobody here to read this.)\n`)
    )
    return true
  }

  console.error(
    `\n🛑 ${opts.label ?? 'Build'} stopped: this machine is in trouble.\n\n` +
      `   ${assessment.reason}.\n\n` +
      `      PID      RSS       AGE  COMMAND\n${lines.join('\n')}\n\n` +
      `   A dev server left running keeps executing the code it loaded at launch —\n` +
      `   updating the package does nothing for it. Left for days, a per-rebuild leak\n` +
      `   compounds until the machine swaps itself to death, and macOS will thrash\n` +
      `   rather than kill it. Adding another build to that is how you lose the box.\n\n` +
      `   Kill them, then try again:\n\n` +
      `      kill ${assessment.offenders.map((p) => p.pid).join(' ')}\n\n` +
      `   Override with DEV_SKIP_PREFLIGHT=1 if you know these are fine.\n`
  )
  return false
}
