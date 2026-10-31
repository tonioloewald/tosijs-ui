/*
When each page's source last changed, for the sitemap's `lastmod` and the JSON-LD
`dateModified` (#3565).

The date is the last COMMIT that touched the source file, which is what a reader would call the
page's last change: a file's mtime moves on every checkout, so a fresh clone or a CI build would
date every page today, and a search engine told every page changed learns to ignore the field. A
file with uncommitted edits gets its mtime, because its last commit is no longer what is served.
No git, or a file git does not track: no date, and the field is left out rather than invented.

One `git log` for the whole corpus, limited to the docs' own paths. Build-time only.
*/

import { statSync } from 'fs'
import * as path from 'path'

/** Run a git command in `cwd`; '' when git is missing or the command fails. */
type Git = (args: string[], cwd: string) => string

const runGit: Git = (args, cwd) => {
  try {
    const result = Bun.spawnSync(['git', ...args], {
      cwd,
      stdout: 'pipe',
      stderr: 'ignore',
    })
    return result.exitCode === 0 ? result.stdout.toString() : ''
  } catch {
    return ''
  }
}

/**
 * Last-modified ISO dates keyed by the paths given (as given, relative to `cwd`). Paths with no
 * date are absent.
 */
export function sourceDates(
  paths: string[],
  cwd: string,
  git: Git = runGit,
  mtime: (file: string) => Date | undefined = (file) => {
    try {
      return statSync(file).mtime
    } catch {
      return undefined
    }
  }
): Map<string, string> {
  const dates = new Map<string, string>()
  const wanted = [...new Set(paths.filter(Boolean))]
  if (!wanted.length) return dates
  const root = git(['rev-parse', '--show-toplevel'], cwd).trim()
  if (!root) return dates
  // git prints names relative to the repository root; the docs' paths are relative to cwd.
  const fromRoot = new Map<string, string>()
  for (const p of wanted)
    fromRoot.set(path.relative(root, path.resolve(cwd, p)), p)

  /*
  Newest first: a commit's date line, then the files it touched. The first date seen for a file
  is its last change. A path that is a directory (an auto-created section) takes the newest
  change of anything inside it.
  */
  const log = git(
    ['log', '--format=%x00%cI', '--name-only', '--no-renames', '--', ...wanted],
    cwd
  )
  let date = ''
  for (const line of log.split('\n')) {
    if (line.startsWith('\0')) {
      date = line.slice(1).trim()
      continue
    }
    if (!line || !date) continue
    for (const [rel, given] of fromRoot)
      if (!dates.has(given) && (line === rel || line.startsWith(rel + '/')))
        dates.set(given, date)
  }

  const edited = new Map<string, string>()
  const dirty = git(
    ['status', '--porcelain', '--untracked-files=no', '--', ...wanted],
    cwd
  )
  for (const line of dirty.split('\n')) {
    const file = line.slice(3).trim()
    if (!file) continue
    for (const [rel, given] of fromRoot)
      if (file === rel || file.startsWith(rel + '/')) {
        const changed = mtime(path.resolve(root, file))?.toISOString()
        if (changed && (!edited.has(given) || changed > edited.get(given)!))
          edited.set(given, changed)
      }
  }
  for (const [given, changed] of edited) dates.set(given, changed)
  return dates
}
