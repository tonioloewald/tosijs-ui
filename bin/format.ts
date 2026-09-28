#!/usr/bin/env bun
/*
tosijs-format — the house format step, shipped as a command (#187).

    tosijs-format           eslint --fix, then prettier --write (markdown excluded)
    tosijs-format --check   eslint, then prettier --check (markdown excluded); exit 1 on any finding

**Prettier never touches markdown** in this stack. The rule itself lives in the Prettier
CONFIG, where every entry point reads it (editors, lint-staged, a bare `prettier --write`):

    "overrides": [{ "files": ["*.md", "*.markdown", "*.mdx"], "options": { "requirePragma": true } }]

This command is a convenience on top: the house sequence in one step, excluding markdown on the
command line as well, so it holds even in a repo whose config hasn't got the override yet.
(1.16.0 first shipped this believing a v2 config could not exclude markdown; the pre-release
review showed `requirePragma` does, verified on 2.8.8 including editors' `--stdin-filepath`.)

Why markdown is excluded: markdown here is the PRODUCT (docs, a book, llms.txt). With
`proseWrap: preserve`, all Prettier did to it was escape literal characters, pad tables and
rewrite bullets and emphasis in authored prose.

ESLint runs only when the project has a flat config (`eslint.config.*`), over `.`, so the
project's own `ignores` decide the scope. Both tools come from the PROJECT's node_modules: this
is a formatting step, not a formatter, and the project pins the versions. Any step that fails
fails the command.
*/

import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { parseArgv } from './resolve-site-config.ts'

const { has } = parseArgv(process.argv.slice(2), {
  bin: 'tosijs-format',
  summary: 'the house format step: eslint, then prettier (never markdown)',
  flags: ['check'],
  usage:
    `  tosijs-format            eslint --fix ., then prettier --write . (markdown excluded)\n` +
    `  tosijs-format --check    check only: exit 1 on anything unformatted or any lint error\n\n` +
    `Uses the project's own prettier and eslint (node_modules/.bin). ESLint runs only when the\n` +
    `project has an eslint.config.* file.`,
})

const check = has('check')
const root = process.cwd()
const bin = (name: string) => join(root, 'node_modules', '.bin', name)

function run(argv: string[]): number {
  const r = Bun.spawnSync(argv, {
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit',
  })
  return r.exitCode ?? 1
}

if (!existsSync(bin('prettier'))) {
  console.error(
    '🛑 tosijs-format: prettier is not installed in this project (bun add -d prettier)'
  )
  process.exit(1)
}

let failed = false

/*
ESLint FIRST, then Prettier: `eslint --fix` rewrites code, and its output is not always what
Prettier would write, so running it second left files that `--check` then flagged (seen on the
first run of this command in tosijs-ui).
*/
const hasEslintConfig = readdirSync(root).some((f) =>
  /^eslint\.config\.[cm]?[jt]s$/.test(f)
)
if (hasEslintConfig) {
  if (!existsSync(bin('eslint'))) {
    console.error(
      '🛑 tosijs-format: eslint.config found but eslint is not installed (bun add -d eslint)'
    )
    failed = true
  } else if (run([bin('eslint'), '.', ...(check ? [] : ['--fix'])]) !== 0) {
    failed = true
  }
}

// The exclusion is the point of this command: prettier never touches markdown.
if (
  run([
    bin('prettier'),
    check ? '--check' : '--write',
    '.',
    '!**/*.{md,markdown,mdx}',
  ]) !== 0
) {
  failed = true
}

process.exit(failed ? 1 : 0)
