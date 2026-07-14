export interface ProcInfo {
    pid: number;
    rssMb: number;
    /** elapsed time as `ps` reports it, e.g. `01:23:45` or `2-04:11:07` */
    etime: string;
    command: string;
}
export interface Assessment {
    level: 'ok' | 'warn' | 'fail';
    /** processes worth naming, worst first */
    offenders: ProcInfo[];
    /** human-readable reason, empty when ok */
    reason: string;
}
/**
 * Parse `ps -eo pid=,rss=,etime=,args=` output. Bytes are KB in `ps`; the command
 * is everything after the third field, so it may contain spaces.
 */
export declare function parsePs(output: string): ProcInfo[];
/** `ps` etime — `[[dd-]hh:]mm:ss` — as hours. */
export declare function etimeHours(etime: string): number;
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
export declare function memoryBudgetMb(procs: ProcInfo[], opts: {
    totalRamMb: number;
    reservedMb?: number;
    minBudgetPct?: number;
}): number;
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
export declare function assessProcesses(procs: ProcInfo[], opts: {
    totalRamMb: number;
    selfPid?: number;
    devLimitMb?: number;
    catastrophicPct?: number;
    hugeDevPct?: number;
    minAgeHours?: number;
    /** RAM to hold back for known-heavy non-dev work, on top of exempt processes */
    reservedMb?: number;
}): Assessment;
export interface VmPressure {
    freeMb: number;
    compressorMb: number;
    swapUsedMb: number;
}
/** Parse `vm_stat`. Page size is in its header ("page size of 16384 bytes"). */
export declare function parseVmStat(output: string): {
    freeMb: number;
    compressorMb: number;
};
/** Parse `sysctl vm.swapusage` → used MB. */
export declare function parseSwapUsage(output: string): number;
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
export declare function assessMemoryPressure(vm: VmPressure, opts: {
    totalRamMb: number;
    compressorPct?: number;
    freeFloorMb?: number;
    swapFloorMb?: number;
}): {
    level: 'ok' | 'fail';
    reason: string;
};
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
export type PreflightMode = 'off' | 'warn' | 'fail';
export declare function preflight(opts?: {
    devLimitMb?: number;
    label?: string;
    mode?: PreflightMode | false;
    /** injected for tests; defaults to a real `ps` snapshot */
    procs?: ProcInfo[];
    /** injected for tests; defaults to this machine's physical RAM */
    totalRamMb?: number;
    /** injected for tests; defaults to a real vm_stat/swapusage read (null off darwin) */
    vm?: VmPressure | null;
}): Promise<boolean>;
