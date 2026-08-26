#!/usr/bin/env bun
/*#
# release-notes

<!--{ "parent": "Appendices" }-->

Assembles a CHANGELOG section from **annotations in commit messages**, so release notes
stop being something you write from memory at the end — and stop being something you can
forget.

    tosijs-release-notes               # notes since the last version tag
    tosijs-release-notes --check       # verify every annotation is accounted for (exit 1 if not)
    tosijs-release-notes --since=v1.8.0
    tosijs-release-notes --write       # prepend the section to CHANGELOG.md

## The annotation

Put one bullet in the commit body per **separately interesting** thing:

    fix(tunnel): one port resolver for server and bin

    [fix] tunnel bin derived localPort as a fixed 8788 while the server used PORT+1 —
          they agreed only when PORT was 8787. closes #39
    [new] `--status` reports the ports it would use
    [note] extracted resolveTunnelLocalPort so the two cannot drift again

`[note]` is internal: recorded, never published.

**One bullet per thing, not one per commit** — this is the whole point, and the reason a
`type:` prefix alone is not enough. The subject line says what kind of commit it is; the
bullets say what a *reader of the release* gets. A commit that fixes three things has
three bullets, and a conventional-commit prefix can only ever represent one of them.

| tag | goes in | means |
| --- | --- | --- |
| `[break]` | Breaking | requires action from an adopter |
| `[new]` | Added | new capability |
| `[fix]` | Fixed | it was broken |
| `[change]` | Changed | behaves differently, nothing to do |
| `[note]` | *(withheld)* | internal; refactors, tests, chores |

`closes #12` / `fixes #12` anywhere in a bullet is collected, so the release step knows
which issues to close.

## Why not generate the prose too

Because the sentence worth reading is *"1.8.0's site entry point does not import at all in
a clean install — upgrade whether or not you want the new feature"*, and nothing derives
that from a diff. So this assembles a **skeleton and a coverage gate**, and a human (or
agent) writes the paragraph that says who should care. `--check` fails when an annotation
since the last tag appears nowhere in the new section, which kills forgetting without
pretending to automate judgement.

## `--check` also flags claims a diff does not support

A commit whose bullets claim `[fix]` or `[new]` while its diff touches only markdown is
reported. This is not a style rule: three entries in tosijs-ui's own 1.9.0 notes described
fixes that were never written, and the worst of them — an auth gate — was asserted by a
commit whose diff never touched the file it named. Cheap to detect, and the failure it
catches is expensive.
*/

/*{ "parent": "Appendices" }*/

import { $ } from 'bun'
import {
  collect,
  renderSection,
  uncovered,
  classifyBump,
  bumpConcerns,
  unsupportedClaims,
  lastVersionTag,
} from '../dist/doc-system/release-notes.js'

// ── CLI ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const flag = (n: string) =>
  args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3)
const has = (n: string) => args.includes(`--${n}`)

const since = flag('since') ?? (await lastVersionTag())
const pkg = await Bun.file('package.json')
  .json()
  .catch(() => ({ version: 'Unreleased' }))
const version = flag('version') ?? pkg.version

const records = await collect(since)
const total = records.flatMap((r) => r.bullets)
const publishable = total.filter((b) => b.tag !== 'note')

if (has('check')) {
  const changelog = await Bun.file('CHANGELOG.md')
    .text()
    .catch(() => '')
  const missed = uncovered(records, changelog)
  const unsupported = unsupportedClaims(records)
  let bad = 0

  if (missed.length) {
    bad += missed.length
    console.error(
      `\n🛑 ${missed.length} annotation(s) since ${
        since || 'the start'
      } are not mentioned in CHANGELOG.md:\n`
    )
    for (const b of missed)
      console.error(`   [${b.tag}] ${b.text}  (${b.sha.slice(0, 8)})`)
    console.error(
      `\n   Write them up, or mark them [note] if they are internal.\n`
    )
  }

  if (unsupported.length) {
    bad += unsupported.length
    console.error(
      `\n⚠️  ${unsupported.length} commit(s) claim a [fix]/[new] but touch only docs:\n`
    )
    for (const r of unsupported)
      console.error(`   ${r.sha.slice(0, 8)}  ${r.subject}`)
    console.error(
      `\n   A claim whose diff cannot support it is how three fixes that were never\n` +
        `   written got published. Check each one against the code.\n`
    )
  }

  /*
  Does the version match what actually changed?

  The nine-lens review triggers on the version LETTER, so it only fires when the letter is
  already right — which is exactly the judgement most in need of review. 1.9.9 was prepared,
  gated, tagged and pushed as a patch while relocating a build artifact and loosening a
  security default, and was caught only because a human asked for a review anyway (#78, #79).

  So this keys on the diff and the annotations rather than on what the release was called.
  */
  const version = (await Bun.file('package.json').json()).version as string
  const changedPaths = since
    ? (await $`git diff --name-only ${since}...HEAD`.nothrow().quiet().text())
        .split('\n')
        .filter(Boolean)
    : []
  const concerns = since
    ? bumpConcerns({
        bump: classifyBump(since, version),
        bullets: total,
        changedPaths,
      })
    : []

  for (const c of concerns) {
    const blocking = c.level === 'block'
    if (blocking) bad += 1
    console.error(
      `\n${blocking ? '🛑' : '⚠️ '} ${version} looks like a patch, but ${
        c.reason
      }:\n`
    )
    for (const e of c.evidence) console.error(`   ${e}`)
    console.error(
      /*
      Advice you can actually follow. The blocking branch used to offer "explain in the notes
      why this does not reach anyone" — which `bumpConcerns` cannot honour, because it never
      sees the notes. A gate whose stated remedy is unrunnable leaves you re-reading your own
      tool to find out what it wants, which is the same defect this repo fixed in the tunnel's
      401 page.
      */
      blocking
        ? `\n   Cut a minor — this is not something the notes can talk you out of.\n`
        : `\n   Check it is genuinely additive, and say what moved in the notes.\n`
    )
  }

  if (bad) process.exit(1)
  console.log(
    `✅ ${publishable.length} annotation(s) since ${
      since || 'the start'
    }, all accounted for`
  )
  process.exit(0)
}

const section = renderSection(version, records)
if (has('write')) {
  const path = 'CHANGELOG.md'
  const existing = await Bun.file(path)
    .text()
    .catch(() => '# Changelog\n')
  const [head, ...rest] = existing.split('\n## ')
  await Bun.write(
    path,
    `${head.trimEnd()}\n\n${section}\n${
      rest.length ? '## ' + rest.join('\n## ') : ''
    }`
  )
  console.log(`Prepended ${publishable.length} note(s) to ${path}`)
} else {
  console.log(section)
}
