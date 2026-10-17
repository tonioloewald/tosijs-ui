import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {
  resolveDataStore,
  resolveDataFile,
  dataContentProblem,
  writeDataFile,
  listDataFiles,
  saveDataFile,
  dataHistory,
  readDataAt,
  isGitWorkTree,
  type DataStore,
} from './data-store.js'

/*
`editableData` (#3365): folders an editor on the dev page may save to. Every refusal here is a
way a writer could otherwise reach something that runs, so each is asserted on its own.
*/

let root: string
const write = (rel: string, text = '{}') => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
  fs.writeFileSync(path.join(root, rel), text)
}
const git = (...args: string[]) => {
  const r = Bun.spawnSync(['git', ...args], { cwd: root })
  if (r.exitCode !== 0) throw new Error(r.stderr.toString())
  return r.stdout.toString()
}

beforeEach(() => {
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'data-store-')))
  write('static/levels/ocean.json', '{"name":"ocean"}')
  write('static/levels/deep/trench.json')
  write('static/levels/notes.txt', 'hi')
  write('static/scenes/a.json')
  write('package.json')
})
afterEach(() => fs.rmSync(root, { recursive: true, force: true }))

const store = (setting: any = ['static/levels']) =>
  resolveDataStore(setting, root) as DataStore

describe('the folder setting', () => {
  test('a list of folders, or options; none means no store', () => {
    expect(resolveDataStore(undefined, root)).toBe(null)
    const s = store(['static/levels', 'static/scenes/'])
    expect(s.dirs.map((d) => d.name)).toEqual([
      'static/levels',
      'static/scenes',
    ])
    expect(s.extensions).toEqual(['.json'])
    expect(s.commit).toBe(false)
    const o = store({
      dirs: ['static/levels'],
      extensions: ['csv', '.JSON'],
      commit: true,
    })
    expect(o.extensions).toEqual(['.csv', '.json'])
    expect(o.commit).toBe(true)
  })

  test('refuses folders that are not plainly inside the project', () => {
    fs.mkdirSync(path.join(root, 'node_modules/x'), { recursive: true })
    fs.mkdirSync(path.join(root, 'withgit/.git'), { recursive: true })
    fs.symlinkSync(os.tmpdir(), path.join(root, 'escape'))
    for (const [dirs, why] of [
      [[], 'at least one folder'],
      [['.'], 'not the project itself'],
      [['..'], 'inside the project'],
      [['/etc'], 'relative to the project'],
      [['missing'], 'does not exist'],
      [['package.json'], 'not a folder'],
      [['node_modules/x'], 'inside .git or node_modules'],
      [['withgit'], 'contains .git'],
      [['escape'], 'inside the project'],
    ] as [string[], string][]) {
      expect(() => resolveDataStore(dirs, root)).toThrow(why)
    }
  })

  test('refuses a folder that overlaps the build output, which every build deletes', () => {
    fs.mkdirSync(path.join(root, 'docs/levels'), { recursive: true })
    for (const dirs of [['docs'], ['docs/levels'], ['.']])
      expect(() => resolveDataStore(dirs, root, 'docs')).toThrow(
        dirs[0] === '.' ? 'not the project itself' : 'overlaps the build output'
      )
    // A folder that CONTAINS the output is refused too.
    fs.mkdirSync(path.join(root, 'site/out'), { recursive: true })
    expect(() => resolveDataStore(['site'], root, 'site/out')).toThrow(
      'overlaps the build output'
    )
    expect(resolveDataStore(['static/levels'], root, 'docs')).not.toBe(null)
  })

  test('refuses any format that runs or renders', () => {
    for (const ext of ['.js', '.ts', '.html', '.svg', '.md', '.css', '.sh']) {
      expect(() =>
        resolveDataStore({ dirs: ['static/levels'], extensions: [ext] }, root)
      ).toThrow(`"${ext}" is not a data format`)
    }
  })
})

describe('which files', () => {
  test('files in the folders and their subfolders, with an allowed extension', () => {
    const s = store()
    expect(resolveDataFile(s, 'static/levels/ocean.json')).toEqual({
      path: path.join(root, 'static/levels/ocean.json'),
      rel: 'static/levels/ocean.json',
    })
    expect(resolveDataFile(s, '/static/levels/deep/trench.json')).toMatchObject(
      {
        rel: 'static/levels/deep/trench.json',
      }
    )
    // A new file in a named folder.
    expect(resolveDataFile(s, 'static/levels/new.json')).toMatchObject({
      rel: 'static/levels/new.json',
    })
  })

  test('refuses everything else, saying why', () => {
    const s = store()
    fs.symlinkSync(
      path.join(root, 'package.json'),
      path.join(root, 'static/levels/link.json')
    )
    fs.symlinkSync(
      path.join(root, 'static/scenes'),
      path.join(root, 'static/levels/out')
    )
    for (const [file, why] of [
      [undefined, 'name a file'],
      ['static/scenes/a.json', 'not inside an editableData folder'],
      ['static/levels/../scenes/a.json', '..'],
      ['static/levels/notes.txt', 'only .json'],
      ['static/levels/.hidden.json', 'dot-files'],
      ['static/levels/package.json', 'configuration'],
      ['static/levels/tsconfig.json', 'configuration'],
      ['static/levels/vite.config.json', 'configuration'],
      ['static/levels/firebase.json', 'configuration'],
      ['static/levels/turbo.json', 'configuration'],
      ['static/levels/a;b.json', 'file names may use'],
      ['static/levels/missing/x.json', 'does not exist'],
      ['static/levels/link.json', 'symlink'],
      // A folder symlinked into a named one is judged by where it really is.
      ['static/levels/out/a.json', 'not inside an editableData folder'],
      ['package.json', 'configuration'],
    ] as [any, string][]) {
      const result = resolveDataFile(s, file)
      expect('refused' in result ? result.refused : 'ALLOWED').toContain(why)
    }
  })

  test('a JSON save must parse, and a save has a size limit', () => {
    expect(dataContentProblem('a.json', '{"ok":1}')).toBe(null)
    expect(dataContentProblem('a.json', '{"ok":')).toContain('not valid JSON')
    expect(dataContentProblem('a.csv', 'a,b\n')).toBe(null)
    expect(dataContentProblem('a.json', 42)).toBe('content must be a string')
    expect(dataContentProblem('a.txt', 'x'.repeat(17 * 1024 * 1024))).toContain(
      'MB'
    )
  })

  test('a save replaces the file whole and leaves no temporary file', () => {
    const target = path.join(root, 'static/levels/ocean.json')
    writeDataFile(target, '{"name":"abyss"}')
    expect(fs.readFileSync(target, 'utf8')).toBe('{"name":"abyss"}')
    expect(
      fs.readdirSync(path.dirname(target)).filter((f) => f.endsWith('.tmp'))
    ).toEqual([])
  })

  test('the list holds exactly the editable files', () => {
    const files = listDataFiles(store(['static/levels', 'static/scenes'])).map(
      (f) => f.file
    )
    expect(files.sort()).toEqual([
      'static/levels/deep/trench.json',
      'static/levels/ocean.json',
      'static/scenes/a.json',
    ])
  })
})

describe('versions', () => {
  beforeEach(() => {
    git('init', '-q')
    git('config', 'user.email', 'test@example.com')
    git('config', 'user.name', 'Test')
    git('config', 'commit.gpgsign', 'false')
    // A developer's global core.hooksPath must not reach these repositories.
    git('config', 'core.hooksPath', '.git/hooks')
    git('add', '.')
    git('commit', '-qm', 'start')
  })

  const versioned = () => store({ dirs: ['static/levels'], commit: true })
  const target = (s: DataStore, rel: string) => {
    const t = resolveDataFile(s, rel)
    if ('refused' in t) throw new Error(t.refused)
    return t
  }
  const head = () => git('rev-parse', 'HEAD').trim()

  test('each save is its own commit, and other staged work stays staged', async () => {
    const s = versioned()
    expect(isGitWorkTree(root)).toBe(true)
    write('static/scenes/a.json', '{"staged":true}')
    git('add', 'static/scenes/a.json')

    const file = 'static/levels/ocean.json'
    const { commit } = await saveDataFile(
      s,
      target(s, file),
      '{"v":2}',
      'this machine'
    )
    expect(commit).toMatch(/^[0-9a-f]{40}$/)
    expect(git('show', '--format=%B', '--name-only', 'HEAD')).toContain(
      `data: save ${file}\n\nSaved through the dev server by this machine.`
    )
    expect(git('show', '--name-only', '--format=', 'HEAD').trim()).toBe(file)
    expect(git('diff', '--cached', '--name-only').trim()).toBe(
      'static/scenes/a.json'
    )

    // An unchanged save is not a version.
    expect(await saveDataFile(s, target(s, file), '{"v":2}', 'x')).toEqual({
      commit: null,
    })
    // A new file is added and committed.
    expect(
      (await saveDataFile(s, target(s, 'static/levels/new.json'), '{}', 'x'))
        .commit
    ).toMatch(/^[0-9a-f]{40}$/)
  })

  test('without commit, a save only writes', async () => {
    const s = store()
    const before = head()
    expect(
      await saveDataFile(
        s,
        target(s, 'static/levels/ocean.json'),
        '{"v":9}',
        'x'
      )
    ).toEqual({})
    expect(
      fs.readFileSync(path.join(root, 'static/levels/ocean.json'), 'utf8')
    ).toBe('{"v":9}')
    expect(head()).toBe(before)
  })

  test('saves made at once each get their own version, the same file included', async () => {
    const s = versioned()
    const file = 'static/levels/ocean.json'
    // Two saves of ONE file at once: each commit must hold its own content.
    const [a, b] = await Promise.all([
      saveDataFile(s, target(s, file), '{"save":"a"}', 'a'),
      saveDataFile(s, target(s, file), '{"save":"b"}', 'b'),
    ])
    expect(git('show', `${a.commit}:${file}`)).toBe('{"save":"a"}')
    expect(git('show', `${b.commit}:${file}`)).toBe('{"save":"b"}')
    const others = ['c', 'd', 'e'].map((n) => `static/levels/${n}.json`)
    const commits = await Promise.all(
      others.map((n) => saveDataFile(s, target(s, n), `{"n":"${n}"}`, 'x'))
    )
    expect(new Set(commits.map((c) => c.commit)).size).toBe(3)
  })

  test('history lists a file’s versions, and any version can be read back', async () => {
    const s = versioned()
    const file = 'static/levels/ocean.json'
    const { commit: second } = await saveDataFile(
      s,
      target(s, file),
      '{"v":2}',
      'x'
    )
    const versions = await dataHistory(s, file)
    expect(versions.map((v) => v.subject)).toEqual([
      `data: save ${file}`,
      'start',
    ])
    expect(versions[0].commit).toBe(second!)
    expect(await readDataAt(s, file, versions[1].commit)).toBe(
      '{"name":"ocean"}'
    )
    expect(await readDataAt(s, file, second!)).toBe('{"v":2}')
    expect(await readDataAt(s, file, 'HEAD~1')).toBe(null) // only hashes
    expect(await readDataAt(s, file, 'deadbeef')).toBe(null)
  })

  test('a commit that fails still saves, and says why it did not commit', async () => {
    const s = versioned()
    fs.writeFileSync(
      path.join(root, '.git/hooks/pre-commit'),
      '#!/bin/sh\necho hook says no >&2\nexit 1\n',
      { mode: 0o755 }
    )
    const before = head()
    const saved = await saveDataFile(
      s,
      target(s, 'static/levels/ocean.json'),
      '{"v":3}',
      'x'
    )
    expect(saved.commit).toBe(null)
    expect(saved.commitError).toContain('hook says no')
    expect(
      fs.readFileSync(path.join(root, 'static/levels/ocean.json'), 'utf8')
    ).toBe('{"v":3}')
    expect(head()).toBe(before)
  })

  test('never commits into a rebase, merge, cherry-pick, revert, bisect or detached HEAD', async () => {
    const s = versioned()
    const file = 'static/levels/ocean.json'
    const states: [string, () => void, () => void][] = [
      [
        'rebase',
        () => fs.mkdirSync(path.join(root, '.git/rebase-merge')),
        () =>
          fs.rmSync(path.join(root, '.git/rebase-merge'), { recursive: true }),
      ],
      [
        'merge',
        () => fs.writeFileSync(path.join(root, '.git/MERGE_HEAD'), head()),
        () => fs.rmSync(path.join(root, '.git/MERGE_HEAD')),
      ],
      [
        'cherry-pick',
        () =>
          fs.writeFileSync(path.join(root, '.git/CHERRY_PICK_HEAD'), head()),
        () => fs.rmSync(path.join(root, '.git/CHERRY_PICK_HEAD')),
      ],
      [
        'revert',
        () => fs.writeFileSync(path.join(root, '.git/REVERT_HEAD'), head()),
        () => fs.rmSync(path.join(root, '.git/REVERT_HEAD')),
      ],
      [
        'bisect',
        () => fs.writeFileSync(path.join(root, '.git/BISECT_LOG'), ''),
        () => fs.rmSync(path.join(root, '.git/BISECT_LOG')),
      ],
      [
        'detached HEAD',
        () => git('checkout', '-q', '--detach'),
        () => git('checkout', '-q', '-'),
      ],
    ]
    let n = 0
    for (const [state, enter, leave] of states) {
      enter()
      const before = head()
      const saved = await saveDataFile(s, target(s, file), `{"n":${++n}}`, 'x')
      expect(saved.commit).toBe(null)
      expect(saved.commitError).toContain(state)
      expect(head()).toBe(before)
      expect(fs.readFileSync(path.join(root, file), 'utf8')).toBe(`{"n":${n}}`)
      leave()
    }
    // And once the repository is clear, saving commits again.
    expect(
      (await saveDataFile(s, target(s, file), '{"n":0}', 'x')).commit
    ).toMatch(/^[0-9a-f]{40}$/)
  })
})
