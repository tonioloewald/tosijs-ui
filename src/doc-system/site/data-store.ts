/*
WHICH files `editableData` may touch, and how a save becomes a version (#3365).

`/__docstore/source` writes only scraped doc sources (#128), so an editor running on the dev
page (a level editor, say) could not save the JSON it edits. This is the sibling for data: a
list of folders the project names, behind the same gate (`sourceRequestAdmission`).

An allow-list at every level, as #128 argues for source:

- Folders: inside the project, never the project itself, never inside or containing `.git` or
  `node_modules`. Resolved through symlinks, at launch.
- Extensions: data formats only, from DATA_EXTENSIONS. Nothing a browser or a tool executes or
  renders (`.js`, `.html`, `.svg`, `.md`, whose fences run as live examples). A config naming
  anything else stops the server rather than being trimmed quietly.
- Names: no dot-files and no names tools read as configuration (`package.json`,
  `tsconfig.json`, `*.config.*`), so a folder that happens to hold one cannot be used to write it.
- Paths: plain characters only, no `..`, and the real path (symlinks resolved) must still be
  inside a named folder. An existing symlink is never written through.

FAILS CLOSED: anything unexpected is a refusal with a reason, never a best effort.
*/

import * as fs from 'fs'
import * as path from 'path'

/** Formats a data folder may hold. Text only: the endpoint takes and returns strings. */
export const DATA_EXTENSIONS = [
  '.json',
  '.jsonc',
  '.json5',
  '.ndjson',
  '.txt',
  '.csv',
  '.tsv',
  '.yaml',
  '.yml',
  '.toml',
] as const

/** The largest save accepted, in bytes. A level is kilobytes; this stops a runaway client. */
export const MAX_DATA_BYTES = 16 * 1024 * 1024

export interface EditableDataOptions {
  /** Folders, relative to the project root. */
  dirs: string[]
  /** Extensions to allow, from DATA_EXTENSIONS. Default `['.json']`. */
  extensions?: string[]
  /** Commit each save to git, so every save is a version. Default false. */
  commit?: boolean
}

export interface DataStore {
  root: string
  /** Real paths of the folders, and the names they were configured as. */
  dirs: { real: string; name: string }[]
  extensions: string[]
  commit: boolean
}

const CONFIG_NAMES = [
  /^package(-lock)?\.json$/,
  /^[tj]sconfig(\..*)?\.json$/,
  /^bunfig\.toml$/,
  /^deno\.jsonc?$/,
  /\.config\.[^.]+$/,
]

/** The folder setting, checked and resolved, or null when the project has none. Throws. */
export function resolveDataStore(
  setting: string[] | EditableDataOptions | undefined,
  root: string
): DataStore | null {
  if (setting == null) return null
  const options: EditableDataOptions = Array.isArray(setting)
    ? { dirs: setting }
    : setting
  const fail = (why: string): never => {
    throw new Error(`editableData: ${why}`)
  }
  if (!Array.isArray(options.dirs) || options.dirs.length === 0)
    fail('name at least one folder, e.g. editableData: ["static/levels"]')
  const extensions = (options.extensions ?? ['.json']).map((e) =>
    (e.startsWith('.') ? e : '.' + e).toLowerCase()
  )
  for (const ext of extensions) {
    if (!(DATA_EXTENSIONS as readonly string[]).includes(ext))
      fail(
        `${JSON.stringify(
          ext
        )} is not a data format this endpoint will write. ` +
          `Allowed: ${DATA_EXTENSIONS.join(' ')}`
      )
  }
  const realRoot = fs.realpathSync(root)
  const dirs = options.dirs.map((name) => {
    if (typeof name !== 'string' || path.isAbsolute(name))
      fail(`${JSON.stringify(name)} must be a folder relative to the project`)
    let real: string
    try {
      real = fs.realpathSync(path.resolve(realRoot, name))
    } catch {
      return fail(`${JSON.stringify(name)} does not exist`)
    }
    if (!fs.statSync(real).isDirectory())
      fail(`${JSON.stringify(name)} is not a folder`)
    if (!real.startsWith(realRoot + path.sep))
      fail(
        `${JSON.stringify(
          name
        )} must be inside the project, and not the project itself`
      )
    const parts = path.relative(realRoot, real).split(path.sep)
    if (parts.some((p) => p === '.git' || p === 'node_modules'))
      fail(`${JSON.stringify(name)} is inside .git or node_modules`)
    for (const inner of ['.git', 'node_modules'])
      if (fs.existsSync(path.join(real, inner)))
        fail(`${JSON.stringify(name)} contains ${inner}`)
    return { real, name: name.replace(/\/+$/, '') }
  })
  return {
    root: realRoot,
    dirs,
    extensions,
    commit: options.commit === true,
  }
}

/**
 * The absolute path a client's file name may be read or written at, or the reason it may not.
 * `file` is project-relative (`static/levels/ocean.json`).
 */
export function resolveDataFile(
  store: DataStore,
  file: unknown
): { path: string; rel: string } | { refused: string } {
  if (typeof file !== 'string' || file === '') return { refused: 'name a file' }
  const rel = file.replace(/^\.?\/+/, '')
  if (!/^[\w\- ./]+$/.test(rel))
    return { refused: 'file names may use letters, digits, - _ . / and spaces' }
  const parts = rel.split('/')
  if (parts.some((p) => p === '' || p === '.' || p === '..'))
    return { refused: 'no empty, . or .. path segments' }
  if (parts.some((p) => p.startsWith('.')))
    return { refused: 'no dot-files or dot-folders' }
  const base = parts[parts.length - 1]
  if (CONFIG_NAMES.some((re) => re.test(base)))
    return { refused: `${base} is a name tools read as configuration` }
  if (!store.extensions.includes(path.extname(base).toLowerCase()))
    return {
      refused: `only ${store.extensions.join(' ')} files are editable here`,
    }
  const target = path.resolve(store.root, rel)
  let realParent: string
  try {
    realParent = fs.realpathSync(path.dirname(target))
  } catch {
    return { refused: 'that folder does not exist' }
  }
  const dir = store.dirs.find(
    (d) => realParent === d.real || realParent.startsWith(d.real + path.sep)
  )
  if (!dir) return { refused: 'not inside an editableData folder' }
  const real = path.join(realParent, base)
  try {
    if (fs.lstatSync(real).isSymbolicLink())
      return { refused: 'a symlink is never written through' }
  } catch {
    // Does not exist yet: a new file in a named folder.
  }
  return { path: real, rel: path.relative(store.root, real) }
}

/** Why `content` may not be saved as `rel`, or null. JSON must parse: a half-edit is not a level. */
export function dataContentProblem(
  rel: string,
  content: unknown
): string | null {
  if (typeof content !== 'string') return 'content must be a string'
  if (Buffer.byteLength(content) > MAX_DATA_BYTES)
    return `content is over ${MAX_DATA_BYTES / 1024 / 1024} MB`
  if (path.extname(rel).toLowerCase() === '.json') {
    try {
      JSON.parse(content)
    } catch (e) {
      return `not valid JSON: ${(e as Error).message}`
    }
  }
  return null
}

/** Write through a temporary file and a rename, so a reader never sees half a file. */
export function writeDataFile(target: string, content: string): void {
  const temp = path.join(
    path.dirname(target),
    `.${path.basename(target)}.${process.pid}.${Date.now()}.tmp`
  )
  fs.writeFileSync(temp, content)
  try {
    fs.renameSync(temp, target)
  } catch (e) {
    fs.rmSync(temp, { force: true })
    throw e
  }
}

/** Every editable file in the named folders, project-relative, newest first. */
export function listDataFiles(
  store: DataStore
): { file: string; size: number; modified: string }[] {
  const found: { file: string; size: number; modified: string; ms: number }[] =
    []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile()) {
        const rel = path.relative(store.root, full).split(path.sep).join('/')
        if ('path' in resolveDataFile(store, rel)) {
          const stat = fs.statSync(full)
          found.push({
            file: rel,
            size: stat.size,
            modified: stat.mtime.toISOString(),
            ms: stat.mtimeMs,
          })
        }
      }
    }
  }
  for (const dir of store.dirs) walk(dir.real)
  return found.sort((a, b) => b.ms - a.ms).map(({ ms: _ms, ...f }) => f)
}

/** Run git in the project and return stdout, or throw with its stderr. Bounded in time. */
async function git(
  root: string,
  args: string[],
  timeoutMs = 20_000
): Promise<string> {
  const proc = Bun.spawn(['git', ...args], {
    cwd: root,
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'ignore',
    // A signing prompt or an editor must fail, not wait for a terminal nobody is watching.
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_EDITOR: 'false' },
  })
  const timer = setTimeout(() => proc.kill(), timeoutMs)
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  clearTimeout(timer)
  if (code !== 0)
    throw new Error(
      (err.trim() || out.trim() || `git ${args[0]} exited ${code}`).slice(
        0,
        500
      )
    )
  return out
}

/** Whether `root` is in a git work tree, for `commit: true` to be checked at launch. */
export function isGitWorkTree(root: string): boolean {
  const result = Bun.spawnSync(['git', 'rev-parse', '--is-inside-work-tree'], {
    cwd: root,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  return result.exitCode === 0 && result.stdout.toString().trim() === 'true'
}

// Saves commit one at a time: two concurrent commits fight over .git/index.lock.
let commitQueue: Promise<unknown> = Promise.resolve()

/**
 * Commit this one file, leaving anything else staged as it was. The commit hash, or null when
 * the save changed nothing. Repository hooks run, as they would for any commit.
 */
export function commitDataFile(
  store: DataStore,
  rel: string,
  savedBy: string
): Promise<string | null> {
  const run = async () => {
    await git(store.root, ['add', '--', rel])
    const changed = await git(store.root, [
      'diff',
      '--cached',
      '--name-only',
      '--',
      rel,
    ])
    if (!changed.trim()) return null
    await git(store.root, [
      'commit',
      '-m',
      `data: save ${rel}`,
      '-m',
      `Saved through the dev server by ${savedBy}.`,
      '--',
      rel,
    ])
    return (await git(store.root, ['rev-parse', 'HEAD'])).trim()
  }
  const result = commitQueue.then(run, run)
  commitQueue = result.catch(() => undefined)
  return result
}

/** One file's committed versions, newest first. */
export async function dataHistory(
  store: DataStore,
  rel: string,
  limit = 100
): Promise<
  { commit: string; date: string; author: string; subject: string }[]
> {
  const out = await git(store.root, [
    'log',
    `-n${limit}`,
    '--format=%H%x1f%aI%x1f%an%x1f%s',
    '--',
    rel,
  ])
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [commit, date, author, subject] = line.split('\x1f')
      return { commit, date, author, subject }
    })
}

/** A file as it was at `commit`, or null if the commit is not a hash or lacks the file. */
export async function readDataAt(
  store: DataStore,
  rel: string,
  commit: string
): Promise<string | null> {
  if (!/^[0-9a-f]{4,40}$/i.test(commit)) return null
  try {
    // `./` makes the path relative to the project, which need not be the repository's root.
    return await git(store.root, ['show', `${commit}:./${rel}`])
  } catch {
    return null
  }
}
