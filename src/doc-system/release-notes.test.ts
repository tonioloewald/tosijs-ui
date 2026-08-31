import { test, expect } from 'bun:test'
import {
  parseBullets,
  isDocsOnly,
  renderSection,
  uncovered,
  unsupportedClaims,
  isPrereleaseTag,
} from './release-notes.js'

test('one bullet per thing — the reason a type: prefix is not enough', () => {
  // The commit that motivated this: subject says `fix(...)`, body does five things.
  const bullets = parseBullets(`fix(tunnel): one port resolver

[fix] the bin derived localPort as a fixed 8788 while the server used PORT+1
[new] --status reports the ports it would use
[note] extracted resolveTunnelLocalPort so they cannot drift again
`)
  expect(bullets.map((b) => b.tag)).toEqual(['fix', 'new', 'note'])
  expect(bullets[0].text).toContain('8788')
})

test('a bullet may wrap; a blank line ends it', () => {
  const [b] = parseBullets(`x

[fix] this explanation is long enough that it
      wraps onto a second line

not part of the bullet
`)
  expect(b.text).toBe(
    'this explanation is long enough that it wraps onto a second line'
  )
})

test('leading dashes and mixed case are accepted', () => {
  expect(parseBullets('- [New] a thing').map((b) => b.tag)).toEqual(['new'])
  expect(parseBullets('* [FIX] a thing').map((b) => b.tag)).toEqual(['fix'])
})

test('issue references are collected for close-on-tag', () => {
  const [b] = parseBullets('[fix] ports disagreed. closes #39')
  expect(b.issues).toEqual([39])
  const [c] = parseBullets('[fix] a. fixes #1 and resolves #2')
  expect(c.issues).toEqual([1, 2])
})

test('a commit with no annotations contributes nothing', () => {
  expect(parseBullets('chore: tidy up\n\njust some words')).toEqual([])
})

test('[note] is recorded but never published', () => {
  const records = [
    {
      sha: 'a'.repeat(40),
      subject: 's',
      files: ['src/x.ts'],
      bullets: parseBullets('[new] visible thing\n[note] internal thing', 'a'),
    },
  ]
  const out = renderSection('1.2.0', records)
  expect(out).toContain('visible thing')
  expect(out).not.toContain('internal thing')
})

test('the section groups by tag, breaking first', () => {
  const records = [
    {
      sha: 'b'.repeat(40),
      subject: 's',
      files: ['src/x.ts'],
      bullets: parseBullets(
        '[fix] f thing\n[break] b thing\n[new] n thing\n[change] c thing',
        'b'
      ),
    },
  ]
  const out = renderSection('2.0.0', records)
  expect(out.indexOf('Breaking')).toBeLessThan(out.indexOf('Added'))
  expect(out.indexOf('Added')).toBeLessThan(out.indexOf('Fixed'))
  expect(out.indexOf('Fixed')).toBeLessThan(out.indexOf('Changed'))
})

// ── the coverage gate ────────────────────────────────────────────────────────

const rec = (msg: string, files = ['src/x.ts']) => [
  { sha: 'c'.repeat(40), subject: 's', files, bullets: parseBullets(msg, 'c') },
]

test('an annotation absent from the changelog is reported', () => {
  const missed = uncovered(rec('[fix] the tunnel port defaults disagreed'), '')
  expect(missed).toHaveLength(1)
})

test('prose that REWROTE the bullet still counts as covered', () => {
  // The gate must not force paste-matching — rewriting is the point.
  const changelog =
    '## 1.9.0\n\nThe tunnel port defaults disagreed between the bin and the server, so ...'
  expect(
    uncovered(rec('[fix] the tunnel port defaults disagreed'), changelog)
  ).toHaveLength(0)
})

test('naming the issue counts as covering it', () => {
  const changelog = '## 1.9.0\n\nSomething entirely differently worded. (#39)'
  expect(
    uncovered(rec('[fix] ports disagreed badly. closes #39'), changelog)
  ).toHaveLength(0)
})

test('[note] is never demanded of the changelog', () => {
  expect(uncovered(rec('[note] refactored internals'), '')).toHaveLength(0)
})

// ── the claim-vs-diff check ──────────────────────────────────────────────────

test('REGRESSION: a [fix] whose diff is markdown-only is flagged', () => {
  // This is commit 52286147 in this repo: it asserted the `?t=` gate was "now gated on
  // preview.tunnel and GET" while its diff never touched dev-server.ts. The claim shipped
  // in two releases before a review caught that the code had never been written.
  const flagged = unsupportedClaims(
    rec('[fix] `?t=` is now gated on preview.tunnel and GET', [
      'CHANGELOG.md',
      'README.md',
    ])
  )
  expect(flagged).toHaveLength(1)
})

test('a docs(...) commit fixing DOCS is not flagged', () => {
  /*
  `doc-site-system.md` is a published page on this site, so correcting a misleading security
  claim in it is a `[fix]` an adopter should see — and its diff is markdown by definition.
  Without this exemption every documentation fix blocks a release, and a gate that fires on
  correct work is one someone eventually routes around.
  */
  const withSubject = (subject: string, msg: string, files: string[]) => [
    {
      sha: 'c'.repeat(40),
      subject,
      files,
      bullets: parseBullets(msg, 'c'),
    },
  ]
  expect(
    unsupportedClaims(
      withSubject(
        'docs(security): our haltija gate covers the bridge, not the port',
        '[fix] the tunnel docs read as a complete security story; they are not',
        ['src/doc-system/doc-site-system.md', 'UPSTREAM.md']
      )
    )
  ).toHaveLength(0)

  // But the hazard it was built for still fires: a commit claiming a CODE fix.
  expect(
    unsupportedClaims(
      withSubject(
        'fix(auth): gate `?t=` on preview.tunnel',
        '[fix] `?t=` is now gated on preview.tunnel and GET',
        ['CHANGELOG.md']
      )
    )
  ).toHaveLength(1)
})

test('a real code change is not flagged', () => {
  expect(
    unsupportedClaims(
      rec('[fix] gated the token', ['src/dev-server.ts', 'CHANGELOG.md'])
    )
  ).toHaveLength(0)
})

test('a docs-only commit that only claims docs is fine', () => {
  expect(
    unsupportedClaims(rec('[change] documented the boundary', ['docs/x.md']))
  ).toHaveLength(0)
})

test('isDocsOnly does not treat an empty diff as docs', () => {
  // An empty file list means "we could not tell", not "it was docs" — flagging a merge
  // or an empty commit as a false claim would train people to ignore the check.
  expect(isDocsOnly([])).toBe(false)
  expect(isDocsOnly(['docs/a.md', 'b.md'])).toBe(true)
  expect(isDocsOnly(['docs/a.md', 'src/b.ts'])).toBe(false)
})

test('REGRESSION: a bullet in the SUBJECT does not swallow the commit body', () => {
  // Historical commits here put the annotation on the subject line. Joining subject and
  // body with a single newline made every body paragraph read as bullet continuation, so
  // one release note came out as three paragraphs of implementation detail.
  const [b] = parseBullets(`[fix] aria-selected on custom cells

The grid rewrite skipped selectBinding for cells produced by a custom dataCell factory,
so they never received the attribute.`)
  expect(b.text).toBe('aria-selected on custom cells')
})

test('REGRESSION: prerelease tags are not release baselines', () => {
  // `git describe --tags` returns the NEAREST tag, prereleases included — so on an rc
  // line the baseline became the previous rc and `release-check` reported "0 annotations,
  // all accounted for" over an empty range, at exactly the boundary it exists to guard.
  expect(isPrereleaseTag('v1.9.0-rc.3')).toBe(true)
  expect(isPrereleaseTag('v1.9.0-beta.1')).toBe(true)
  expect(isPrereleaseTag('1.10.0-alpha.0')).toBe(true)
  expect(isPrereleaseTag('v1.9.0')).toBe(false)
  expect(isPrereleaseTag('v1.10.0')).toBe(false)
})

test('REGRESSION: prose that reworded around short words still counts as covered', () => {
  // The needle was filtered to words >3 chars while the haystack kept everything, so a
  // run like "exactly release boundary" could not match "exactly the release boundary".
  // The gate then flagged entries that were plainly written up — which is exactly how a
  // gate trains people to ignore it. Found by using it on this release.
  const records = [
    {
      sha: 'd'.repeat(40),
      subject: 's',
      files: ['src/x.ts'],
      bullets: parseBullets(
        '[fix] reported an unearned pass at exactly the release boundary',
        'd'
      ),
    },
  ]
  const changelog =
    '## 1.9.0\n\nIt cleared an empty range at exactly the release boundary.'
  expect(uncovered(records, changelog)).toHaveLength(0)
})

// ── does the version match what changed? (#78, #79) ──────────────────────────

import { classifyBump, bumpConcerns, SENSITIVE_PATHS } from './release-notes'

const bullet = (tag: any, text = 'x', sha = 'abc1234') => ({
  tag,
  text,
  sha,
  issues: [],
})

test('classifyBump reads the component that moved', () => {
  expect(classifyBump('1.9.8', '1.9.9')).toBe('patch')
  expect(classifyBump('1.9.8', '1.10.0')).toBe('minor')
  expect(classifyBump('1.9.8', '2.0.0')).toBe('major')
  expect(classifyBump('v1.9.8', 'v1.10.0')).toBe('minor')
  expect(classifyBump('1.9.8', '1.10.0-beta.1')).toBe('prerelease')
})

test('REGRESSION: a [break] in a patch is blocked', () => {
  /*
  1.9.9 was prepared, gated, tagged and pushed as a PATCH while containing a relocated build
  artifact and a loosened security default. It was caught because a human asked for a review
  anyway — the review's own trigger keys on the version letter, so it only fires when the
  letter is already right (#78).
  */
  const [concern] = bumpConcerns({
    bump: 'patch',
    bullets: [bullet('break', 'bundle output moved out of dist')],
    changedPaths: ['src/thing.ts'],
  })
  expect(concern.level).toBe('block')
  expect(concern.reason).toContain('never breaks')
})

test('REGRESSION: touching a dev-tooling security path in a patch WARNS', () => {
  /*
  The rule was written down two releases before it was mis-applied, by its author. Knowing a
  rule and applying it are different acts (#79) — hence the check.

  It used to BLOCK, and that was wrong. Every path on this list is development tooling — a dev
  server, a tunnel, a deploy script — none of which runs in an end user's browser as part of an
  adopter's app. Halting a release over it spends the maintainer's attention on the release with
  the least at stake, and a guard that cries wolf gets overridden or deleted, taking the case it
  was RIGHT about with it. Warning keeps the signal without charging for it.

  A blocking gate here would need to key on code an adopter SHIPS, which none of these are.
  */
  const concerns = bumpConcerns({
    bump: 'patch',
    bullets: [bullet('new', 'a new option')],
    changedPaths: ['src/doc-system/site/dev-auth.ts'],
  })
  expect(concerns.some((c) => c.level === 'warn')).toBe(true)
  expect(concerns.some((c) => c.level === 'block')).toBe(false)
  expect(concerns[0].evidence[0]).toContain('dev-auth')
})

test('a [change] in a patch warns rather than blocks', () => {
  // Widening the `marked` peer range was a [change] and a perfectly good patch.
  const concerns = bumpConcerns({
    bump: 'patch',
    bullets: [bullet('change', 'marked peer widened to 17/18')],
    changedPaths: ['package.json'],
  })
  expect(concerns).toHaveLength(1)
  expect(concerns[0].level).toBe('warn')
})

test('an ordinary additive patch is clean', () => {
  // The rule is that additive non-breaking work SHIPS as a patch — this must not nag.
  expect(
    bumpConcerns({
      bump: 'patch',
      bullets: [bullet('new', 'a new property'), bullet('fix', 'a fix')],
      changedPaths: ['src/data-table.ts', 'README.md'],
    })
  ).toEqual([])
})

test('minors and majors are not second-guessed', () => {
  for (const bump of ['minor', 'major', 'prerelease'] as const) {
    expect(
      bumpConcerns({
        bump,
        bullets: [bullet('break', 'breaking')],
        changedPaths: ['src/doc-system/site/dev-auth.ts'],
      })
    ).toEqual([])
  }
})

test('the sensitive list is short, named, and covers what bit us', () => {
  // A clever heuristic would be unexplainable when it fires. This must stay obvious.
  expect(SENSITIVE_PATHS).toContain('dev-auth')
  expect(SENSITIVE_PATHS).toContain('tunnel')
  expect(SENSITIVE_PATHS.length).toBeLessThan(10)
})
