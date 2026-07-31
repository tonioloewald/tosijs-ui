/*
Release notes assembled from commit annotations.

The pure half of `tosijs-release-notes`: parsing, grouping, and the two gates. It lives
in src/ rather than bin/ for two reasons — the bare `bun test` lane has `root = "./src"`,
so a test beside the bin would never run in CI (this repo's own docs call an ungated lane
one that always rots), and putting it here means it compiles into dist/ where adopters
can import the pieces directly rather than shelling out to the CLI.

See the bin for the annotation format and rationale.
*/

import { $ } from 'bun'

export type Tag = 'break' | 'new' | 'fix' | 'change' | 'note'

export interface Bullet {
  tag: Tag
  text: string
  sha: string
  issues: number[]
}

export interface CommitRecord {
  sha: string
  subject: string
  bullets: Bullet[]
  /** files touched, for the claim-vs-diff check */
  files: string[]
}

const TAGS: Tag[] = ['break', 'new', 'fix', 'change', 'note']

const HEADINGS: Record<Exclude<Tag, 'note'>, string> = {
  break: 'Breaking',
  new: 'Added',
  fix: 'Fixed',
  change: 'Changed',
}

/*
Parse the bullets out of one commit message.

A bullet runs until the next bullet or a blank line, so it can wrap — release-note text
that has to fit on one line stops being written properly. Leading `-`/`*` is optional
because people type both.
*/
export function parseBullets(message: string, sha = ''): Bullet[] {
  const lines = message.split('\n')
  const out: Bullet[] = []
  let current: Bullet | null = null

  const push = () => {
    if (current && current.text.trim()) {
      current.text = current.text.trim().replace(/\s+/g, ' ')
      current.issues = [
        ...new Set(
          [...current.text.matchAll(/(?:closes|fixes|resolves)\s+#(\d+)/gi)].map(
            (m) => Number(m[1])
          )
        ),
      ]
      out.push(current)
    }
    current = null
  }

  for (const line of lines) {
    const m = line.match(
      new RegExp(`^\\s*[-*]?\\s*\\[(${TAGS.join('|')})\\]\\s*(.*)$`, 'i')
    )
    if (m) {
      push()
      current = {
        tag: m[1].toLowerCase() as Tag,
        text: m[2],
        sha,
        issues: [],
      }
    } else if (current) {
      // A blank line ends the bullet; anything else continues it.
      if (!line.trim()) push()
      else current.text += ' ' + line.trim()
    }
  }
  push()
  return out
}

/** Does this diff plausibly support a code claim, or is it markdown only? */
export function isDocsOnly(files: string[]): boolean {
  if (files.length === 0) return false
  return files.every(
    (f) =>
      /\.(md|mdx|txt)$/i.test(f) ||
      f === 'CHANGELOG.md' ||
      f.startsWith('docs/') ||
      f.endsWith('.json')
  )
}

export async function lastVersionTag(): Promise<string> {
  const r = await $`git describe --tags --abbrev=0`.nothrow().quiet()
  return r.exitCode === 0 ? r.stdout.toString().trim() : ''
}

export async function collect(since: string): Promise<CommitRecord[]> {
  const range = since ? `${since}..HEAD` : 'HEAD'
  const raw = (
    await $`git log ${range} --format=%H%x1f%s%x1f%b%x1e`.quiet().text()
  )
    .split('\x1e')
    .filter((c) => c.trim())

  const records: CommitRecord[] = []
  for (const chunk of raw) {
    const [sha, subject, body] = chunk.split('\x1f')
    /*
    Blank line between subject and body, deliberately.

    A bullet continues across wrapped lines, so joining these with a single newline made
    a bullet in the SUBJECT swallow the entire commit body as continuation text — which
    is what happens on the historical commits that used the annotation as the subject
    line. The blank line terminates it, exactly as git's own format implies.
    */
    const bullets = parseBullets(`${subject}\n\n${body ?? ''}`, sha.trim())
    if (!bullets.length) continue
    const files = (
      await $`git show --name-only --format= ${sha.trim()}`.quiet().text()
    )
      .split('\n')
      .filter(Boolean)
    records.push({ sha: sha.trim(), subject, bullets, files })
  }
  return records
}

export function renderSection(
  version: string,
  records: CommitRecord[]
): string {
  const all = records.flatMap((r) => r.bullets)
  const lines: string[] = [`## ${version}`, '']

  for (const tag of ['break', 'new', 'fix', 'change'] as const) {
    const hits = all.filter((b) => b.tag === tag)
    if (!hits.length) continue
    lines.push(`### ${HEADINGS[tag]}`, '')
    for (const b of hits) lines.push(`- ${b.text} (${b.sha.slice(0, 8)})`)
    lines.push('')
  }

  const issues = [...new Set(all.flatMap((b) => b.issues))].sort((a, b) => a - b)
  if (issues.length) {
    lines.push(`Closes ${issues.map((n) => `#${n}`).join(', ')}.`, '')
  }
  return lines.join('\n')
}

/*
The coverage gate.

An annotation exists but does not appear in the written section => the release would ship
without mentioning it. Matching is deliberately loose (a distinctive run of words from the
bullet, normalized) because the whole point is that a human REWRITES these into prose —
demanding a literal match would just train people to paste.
*/
export function uncovered(records: CommitRecord[], changelog: string): Bullet[] {
  const hay = changelog.toLowerCase().replace(/[^a-z0-9]+/g, ' ')
  return records
    .flatMap((r) => r.bullets)
    .filter((b) => b.tag !== 'note')
    .filter((b) => {
      const words = b.text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .split(' ')
        .filter((w) => w.length > 3)
      if (!words.length) return false
      // Covered if a distinctive 3-word run from the bullet survives into the prose,
      // or if it names an issue the section names.
      for (let i = 0; i + 2 < words.length; i++) {
        if (hay.includes(words.slice(i, i + 3).join(' '))) return false
      }
      return !b.issues.some((n) => changelog.includes(`#${n}`))
    })
}

/** Commits asserting a code change whose diff is markdown only. */
export function unsupportedClaims(records: CommitRecord[]): CommitRecord[] {
  return records.filter(
    (r) =>
      r.bullets.some((b) => b.tag === 'fix' || b.tag === 'new') &&
      isDocsOnly(r.files)
  )
}

