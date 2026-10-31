/*
The parent side of the accessibility mode's axe audit (#3521, item 6). The browser work is in
`a11y-audit-cli.ts`, in a child process.

When it runs: with `accessibility` on, on the first full build in a process, and never under a
dev server (a watch rebuild, or `bun start`'s first build). Auditing every page in a browser
takes seconds per page; that is a release step, not something to repeat on each keystroke.

What it never does is report a pass it did not earn: when Playwright, axe-core or Chromium is
missing, the result says the audit did not run and why, and the build prints that.
*/

import { spawn } from 'bun'
import { existsSync } from 'fs'
import { tmpdir } from 'os'
import * as path from 'path'

/** The child's exit code when it could not run at all (a missing package or browser). */
export const NOT_RUN_EXIT = 3

/** axe-core's tags for WCAG 2.0, 2.1 and 2.2 at levels A and AA. */
export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

export interface AxeFinding {
  /** the page's path, as served */
  page: string
  rule: string
  impact: string | null
  help: string
  /** a CSS selector for each element that fails the rule */
  targets: string[]
}

/** A page the audit could not check fully: it never loaded, or never stopped being busy. */
export interface UnsettledPage {
  page: string
  reason: string
}

export type AxeAuditResult =
  | { ran: true; violations: AxeFinding[]; unsettled: UnsettledPage[] }
  | { ran: false; reason: string }

export async function auditBuiltSite(opts: {
  outputDir: string
  basePath?: string
  /** page paths to audit, e.g. `/`, `/lighting/` */
  pages: string[]
  /** the project Playwright and axe-core are resolved from (default: the working directory) */
  projectDir?: string
  /** how long a page may take to load, or stay `aria-busy="true"` (default 30s) */
  slowPageMs?: number
}): Promise<AxeAuditResult> {
  const cliTs = `${import.meta.dir}/a11y-audit-cli.ts`
  const cli = existsSync(cliTs) ? cliTs : `${import.meta.dir}/a11y-audit-cli.js`
  const payloadPath = path.join(tmpdir(), `tosijs-a11y-${process.pid}.json`)
  await Bun.write(
    payloadPath,
    JSON.stringify({
      outputDir: path.resolve(opts.outputDir),
      basePath: opts.basePath ?? '',
      pages: opts.pages,
      slowPageMs: opts.slowPageMs,
    })
  )
  // `--no-install`: without it Bun resolves a package the project does not have from its global
  // cache, so "not installed" would never be said and the audit would use a Playwright nobody chose.
  const child = spawn(['bun', '--no-install', cli, payloadPath], {
    cwd: opts.projectDir,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  if (code === NOT_RUN_EXIT) return { ran: false, reason: stderr.trim() }
  const line = stdout.trim().split('\n').pop() ?? ''
  try {
    if (code === 0) {
      const { violations, unsettled = [] } = JSON.parse(line)
      return { ran: true, violations, unsettled }
    }
  } catch {
    // fall through: a run that printed no result did not run
  }
  return {
    ran: false,
    reason: `the audit failed (exit ${code}): ${stderr.trim().slice(0, 400)}`,
  }
}

/** The report: one line per rule per page, worst impact first. */
export function formatAxeFindings(violations: AxeFinding[]): string {
  const rank = ['critical', 'serious', 'moderate', 'minor']
  return [...violations]
    .sort(
      (a, b) =>
        rank.indexOf(a.impact ?? 'minor') - rank.indexOf(b.impact ?? 'minor') ||
        a.page.localeCompare(b.page)
    )
    .map(
      (v) =>
        `    ${v.page}  ${v.rule} (${v.impact ?? 'unknown'}): ${v.help}\n` +
        v.targets
          .slice(0, 3)
          .map((t) => `        ${t}`)
          .join('\n') +
        (v.targets.length > 3
          ? `\n        … and ${v.targets.length - 3} more`
          : '')
    )
    .join('\n')
}
