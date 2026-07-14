import { test, expect } from 'bun:test'
import {
  memoryBudgetMb,
  parsePs,
  etimeHours,
  assessProcesses,
  parseVmStat,
  parseSwapUsage,
  assessMemoryPressure,
} from './preflight'

const RAM = 32768 // a 32GB machine, as in the incident

// `ps -eo pid=,rss=,etime=,args=`, rss in KB.
const PS = `
  15661 108447334  2-04:11:07 bun bin/site.ts
  15894 60197437  2-03:58:12 bun --watch bin/dev.ts
  10032 167731     03:53 bun bin/site.ts
    892 45210     10-00:00:01 /Applications/Safari.app/Contents/MacOS/Safari
`

test('parsePs reads pid, RSS (KB→MB), elapsed time, and a command with spaces', () => {
  const procs = parsePs(PS)
  expect(procs).toHaveLength(4)
  expect(procs[0]).toEqual({
    pid: 15661,
    rssMb: 105906,
    etime: '2-04:11:07',
    command: 'bun bin/site.ts',
  })
  expect(procs[2].rssMb).toBe(164)
})

test('parsePs ignores blank lines and headers', () => {
  expect(parsePs('\n\n   \n')).toEqual([])
  expect(parsePs('PID RSS ELAPSED COMMAND')).toEqual([])
})

test('etimeHours handles mm:ss, hh:mm:ss, and dd-hh:mm:ss', () => {
  expect(etimeHours('03:53')).toBeCloseTo(0.065, 2)
  expect(etimeHours('04:30:00')).toBeCloseTo(4.5, 5)
  expect(etimeHours('2-04:11:07')).toBeCloseTo(52.19, 1)
})

test('a healthy machine passes', () => {
  const procs = parsePs('  10032 167731     03:53 bun bin/site.ts\n')
  expect(assessProcesses(procs, { totalRamMb: RAM }).level).toBe('ok')
})

test('the incident: three stale servers over half the RAM fail, worst first', () => {
  const { level, offenders, reason } = assessProcesses(parsePs(PS), {
    totalRamMb: RAM,
  })
  expect(level).toBe('fail')
  // Both giants, not the healthy 164MB server and not Safari.
  expect(offenders.map((p) => p.pid)).toEqual([15661, 15894])
  expect(reason).toContain('50%')
})

test('a stale dev server over the RSS ceiling fails even when it is not half the RAM', () => {
  const procs = parsePs('  4242 6291456  08:00:00 bun --watch bin/dev.ts\n')
  const { level, offenders } = assessProcesses(procs, { totalRamMb: RAM })
  expect(level).toBe('fail')
  expect(offenders[0].pid).toBe(4242)
})

test('a big BUILD is not a stale server — age gates the dev-process trigger', () => {
  // 6GB, but two minutes old: a build peaking mid-run, not a leak.
  const procs = parsePs('  4242 6291456     02:00 bun bin/site.ts\n')
  expect(assessProcesses(procs, { totalRamMb: RAM }).level).toBe('ok')
})

test('a non-dev hog over half the RAM still fails — the machine is dying either way', () => {
  const procs = parsePs('  892 20971520  10-00:00:01 /Applications/Xcode.app\n')
  const { level, offenders } = assessProcesses(procs, { totalRamMb: RAM })
  expect(level).toBe('fail')
  expect(offenders[0].pid).toBe(892)
})

test('this process is never its own offender — the memory watchdog owns that', () => {
  const procs = parsePs('  15661 108447334  2-04:11:07 bun bin/site.ts\n')
  const { level } = assessProcesses(procs, { totalRamMb: RAM, selfPid: 15661 })
  expect(level).toBe('ok')
})

test('`bun install` is not a dev server, however long it has been wedged', () => {
  const procs = parsePs('  4242 6291456  08:00:00 bun install\n')
  expect(assessProcesses(procs, { totalRamMb: RAM }).level).toBe('ok')
})

test('a fat long-lived node process is NOT flagged as a stale dev server', () => {
  // Claude Code, the VS Code extension host, a TS server on a big repo — all
  // routinely over 4GB for hours. Failing every build over the editor is a guard
  // that gets disabled within a day.
  const procs = parsePs(
    '  4242 6291456  08:00:00 node /usr/local/lib/claude-code/cli.js\n'
  )
  expect(assessProcesses(procs, { totalRamMb: RAM }).level).toBe('ok')
})

test('…but a node process over half the RAM is still an emergency', () => {
  const procs = parsePs(
    '  4242 20971520  08:00:00 node /usr/local/lib/claude-code/cli.js\n'
  )
  expect(assessProcesses(procs, { totalRamMb: RAM }).level).toBe('fail')
})

test('a young runaway is caught mid-climb, not only once it is half the machine', () => {
  // The real runaway went 0→100GB in ~20 minutes, so it spent its whole climb through
  // the 4–16GB band too young to be "stale" and too small to be "catastrophic" — i.e.
  // invisible for the entire ascent. A quarter of the machine is not a build.
  const procs = parsePs('  101 9437184  00:04:00 bun bin/site.ts\n')
  const { level, reason } = assessProcesses(procs, { totalRamMb: RAM })
  expect(level).toBe('fail')
  expect(reason).toContain('quarter')
})

test('several mid-size dev servers are NOT summed — RSS arithmetic is not a signal', () => {
  // The tempting rule ("these three total 45GB on a 32GB box, fail") is WRONG on macOS:
  // at the moment of the fatal crash, summed RSS across 629 processes was ~225GB and the
  // machine was still limping. Compression and swap mean summed footprint routinely
  // exceeds physical RAM on a healthy box, so an aggregate-RSS rule would fire during
  // ordinary work and get switched off within a week. Machine-level danger is VM
  // pressure (see below), not a sum of RSS.
  const procs = parsePs(`
  101 15728640  00:20:00 bun bin/site.ts
  102 15728640  00:18:00 bun --watch bin/dev.ts
  103 15728640  00:12:00 bun bin/site.ts
`)
  // 15GB each: under the 16GB catastrophic bar... but each is over a quarter of RAM,
  // so the per-process huge-dev rule catches them individually anyway.
  const { level, offenders } = assessProcesses(procs, { totalRamMb: RAM })
  expect(level).toBe('fail')
  expect(offenders).toHaveLength(3)
})

test('a few healthy dev servers pass, however many of them there are', () => {
  const procs = parsePs(`
  101 167731  03:53 bun bin/site.ts
  102 204800  01:20:00 bun --watch bin/dev.ts
  103 122976  01:11:32 bun bin/site.ts
  104 180000  02:00:00 bun bin/site.ts
`)
  expect(assessProcesses(procs, { totalRamMb: RAM }).level).toBe('ok')
})

test('the ceiling scales with the machine, not a hard-coded 32GB', () => {
  // 9GB on a 16GB box is over half of it; on a 64GB box it is not (and it is
  // under the 4GB dev ceiling check only by virtue of being a non-dev process).
  const procs = parsePs('  892 9437184  10-00:00:01 /Applications/Xcode.app\n')
  expect(assessProcesses(procs, { totalRamMb: 16384 }).level).toBe('fail')
  expect(assessProcesses(procs, { totalRamMb: 65536 }).level).toBe('ok')
})

// ── VM pressure ─────────────────────────────────────────────────────────────
// The real machine-level signal. NOT summed RSS (see above) and NOT macOS's own
// memory-pressure flag, which recorded `memoryPressure: false` at the moment the
// machine died with 14MB free and reclaim fully stalled.

const VM_STAT_HEALTHY = `Mach Virtual Memory Statistics: (page size of 16384 bytes)
Pages free:                              120000.
Pages active:                            500000.
Pages inactive:                          300000.
Pages occupied by compressor:             40000.
`

// The recorded state at the crash: compressor ~18GB, free ~14MB.
const VM_STAT_DYING = `Mach Virtual Memory Statistics: (page size of 16384 bytes)
Pages free:                                 900.
Pages active:                            800000.
Pages occupied by compressor:            1179648.
`

test('parseVmStat reads the page size from the header, not a hard-coded 4096', () => {
  const { freeMb, compressorMb } = parseVmStat(VM_STAT_HEALTHY)
  expect(freeMb).toBe(1875) // 120000 pages * 16384B
  expect(compressorMb).toBe(625)
})

test('parseSwapUsage handles M and G units', () => {
  expect(
    parseSwapUsage(
      'vm.swapusage: total = 8192.00M  used = 2048.00M  free = 6144.00M'
    )
  ).toBe(2048)
  expect(
    parseSwapUsage('vm.swapusage: total = 16.00G  used = 12.50G  free = 3.50G')
  ).toBe(12800)
})

test('a healthy machine has no VM pressure', () => {
  const vm = { ...parseVmStat(VM_STAT_HEALTHY), swapUsedMb: 2048 }
  expect(assessMemoryPressure(vm, { totalRamMb: RAM }).level).toBe('ok')
})

test('THE CRASH: compressor at 18GB with 14MB free is a dying machine', () => {
  const vm = { ...parseVmStat(VM_STAT_DYING), swapUsedMb: 12000 }
  expect(vm.compressorMb).toBeGreaterThan(18000)
  expect(vm.freeMb).toBeLessThan(20)
  const { level, reason } = assessMemoryPressure(vm, { totalRamMb: RAM })
  expect(level).toBe('fail')
  expect(reason).toContain('stalling')
})

test('low free memory ALONE is not pressure — macOS keeps free low on purpose', () => {
  // Free memory is low on a healthy Mac because the OS is caching, not idling.
  // Firing on this alone would cry wolf every day.
  const vm = { freeMb: 100, compressorMb: 2048, swapUsedMb: 1024 }
  expect(assessMemoryPressure(vm, { totalRamMb: RAM }).level).toBe('ok')
})

test('a big compressor ALONE is not pressure — a busy machine compresses', () => {
  const vm = { freeMb: 4000, compressorMb: 16384, swapUsedMb: 1024 }
  expect(assessMemoryPressure(vm, { totalRamMb: RAM }).level).toBe('ok')
})

test('heavy swap ALONE is not pressure — a Mac can sit on GBs of swap indefinitely', () => {
  const vm = { freeMb: 4000, compressorMb: 2048, swapUsedMb: 20480 }
  expect(assessMemoryPressure(vm, { totalRamMb: RAM }).level).toBe('ok')
})

test('swollen compressor + heavy swap fails even when free memory looks survivable', () => {
  const vm = { freeMb: 1000, compressorMb: 16384, swapUsedMb: 12288 }
  expect(assessMemoryPressure(vm, { totalRamMb: RAM }).level).toBe('fail')
})

// ── the memory budget (the denominator) ─────────────────────────────────────
// Percentages of physical RAM scale with the hardware; headroom does not. Buy 96GB
// more memory, spend all of it on a resident model, and the slack available to a
// runaway build is exactly what it was — while every percentage-of-RAM threshold has
// quadrupled. So percentages are taken against RAM MINUS what the model holds.

const RAM_128 = 131072
const MODEL_96GB =
  '  700 100663296  04:00:00 /usr/local/bin/ollama runner --model llama-70b\n'

test('a resident 96GB model is never an offender — it is what the box is FOR', () => {
  // Under a naive 50%-of-128GB rule this trips a 64GB "catastrophic" bar permanently,
  // every build fails, and the user sets DEV_SKIP_PREFLIGHT=1 forever.
  const { level } = assessProcesses(parsePs(MODEL_96GB), {
    totalRamMb: RAM_128,
  })
  expect(level).toBe('ok')
})

test('the model shrinks the budget instead of triggering on it', () => {
  const procs = parsePs(MODEL_96GB)
  // 128GB - 96GB = 32GB of headroom for dev work.
  expect(memoryBudgetMb(procs, { totalRamMb: RAM_128 })).toBe(32768)
  // With no model up, the whole machine is the budget.
  expect(memoryBudgetMb([], { totalRamMb: RAM_128 })).toBe(RAM_128)
})

test('with the model up, a runaway is judged against the 32GB that is left', () => {
  // 20GB is under any percentage of 128GB physical RAM, but it is 60% of the 32GB
  // actually available — i.e. the machine is about to die, and the old denominator
  // could not see it.
  const procs = parsePs(
    MODEL_96GB + '  101 20971520  00:10:00 bun bin/site.ts\n'
  )
  const { level, offenders } = assessProcesses(procs, { totalRamMb: RAM_128 })
  expect(level).toBe('fail')
  expect(offenders.map((p) => p.pid)).toEqual([101]) // the model is NOT listed
})

test('the same runaway on the same box is fine when the model is NOT loaded', () => {
  // 20GB of 128GB, nothing else resident: unremarkable. The budget floats back up.
  const procs = parsePs('  101 20971520  00:10:00 bun bin/site.ts\n')
  expect(assessProcesses(procs, { totalRamMb: RAM_128 }).level).toBe('ok')
})

test('a fully committed machine still gets sane thresholds, not absurd ones', () => {
  // A 124GB model on a 128GB box would leave a 4GB budget — making "half the budget"
  // 2GB, so an ordinary tsc build would fail. Floor the budget at 25% of RAM.
  const procs = parsePs('  700 130023424  04:00:00 ollama runner\n')
  expect(memoryBudgetMb(procs, { totalRamMb: RAM_128 })).toBe(32768) // the floor
})

test('reservedMb holds back RAM for heavy work the exempt list cannot name', () => {
  expect(
    memoryBudgetMb([], { totalRamMb: RAM_128, reservedMb: 64 * 1024 })
  ).toBe(65536)
})

test('devLimitMb stays ABSOLUTE — it survives a hardware upgrade', () => {
  // A stale 6GB dev server is wrong on a 32GB laptop and equally wrong on a 128GB
  // workstation. This is why it is not a percentage of anything.
  const stale = '  4242 6291456  08:00:00 bun --watch bin/dev.ts\n'
  expect(assessProcesses(parsePs(stale), { totalRamMb: RAM }).level).toBe(
    'fail'
  )
  expect(assessProcesses(parsePs(stale), { totalRamMb: RAM_128 }).level).toBe(
    'fail'
  )
})
