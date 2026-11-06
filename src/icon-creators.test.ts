import { test, expect, spyOn } from 'bun:test'
import {
  readdirSync,
  readFileSync,
  mkdtempSync,
  writeFileSync,
  rmSync,
} from 'fs'
import { tmpdir } from 'os'
import * as path from 'path'
import builtInIcons from './icon-data.js'
import * as perIcon from './icons/data/index.js'
import wholeSet from './icons/data/index.js'
import { iconData } from './icon-store.js'
import { resolveIcon } from './icon-core.js'

const all = builtInIcons as Record<string, string>
const { default: _whole, ...exported } = perIcon as Record<string, any>
const creatorsDir = path.join(import.meta.dir, 'icons')
// `delete` and `package` are reserved, so their modules export `deleteIcon` and `packageIcon`.
const fromModule = (name: string) => exported[name] ?? exported[name + 'Icon']

test('the per-icon data modules are the combined data, icon for icon (#3885)', () => {
  // The 1.4.1 copies were written once and drifted: 54 of 313 differed, 6 were missing.
  expect(Object.keys(exported).length).toBe(Object.keys(all).length)
  const wrong = Object.keys(all).filter(
    (name) => fromModule(name) !== all[name]
  )
  expect(wrong).toEqual([])
  // The whole set that `tosijs-ui/icons` registers is built from the same modules.
  expect(wholeSet).toEqual(all)
})

test('every icon creator module brings everything its icon needs (#3885)', () => {
  const imports = new Map<string, string[]>()
  for (const file of readdirSync(creatorsDir)) {
    if (!file.endsWith('.ts') || file.endsWith('.test.ts')) continue
    const text = readFileSync(path.join(creatorsDir, file), 'utf8')
    imports.set(
      file.slice(0, -3),
      [...text.matchAll(/^import '\.\/(\w+)\.js'$/gm)].map((m) => m[1])
    )
  }
  expect([...imports.keys()].sort()).toEqual(Object.keys(all).sort())
  const closure = (name: string, seen = new Set<string>()): Set<string> => {
    if (seen.has(name)) return seen
    seen.add(name)
    for (const dep of imports.get(name) ?? []) closure(dep, seen)
    return seen
  }

  // Draw each icon with ONLY what its module registers: a missing dependency warns that the
  // icon does not exist (or, before the full set loads, draws the pending placeholder).
  const saved = { ...iconData }
  const warn = spyOn(console, 'warn').mockImplementation(() => {})
  const broken: string[] = []
  try {
    for (const name of imports.keys()) {
      for (const key of Object.keys(iconData)) delete iconData[key]
      for (const dep of closure(name)) iconData[dep] = all[dep]
      warn.mockClear()
      const icon = resolveIcon(name, [])
      if (
        warn.mock.calls.length > 0 ||
        icon.classList.contains('tosi-icon-pending')
      ) {
        broken.push(name)
      }
    }
  } finally {
    warn.mockRestore()
    for (const key of Object.keys(iconData)) delete iconData[key]
    Object.assign(iconData, saved)
  }
  expect(broken).toEqual([])
})

/*
What only a fresh process can show: this one has the whole set registered, because some test
file imports `icons.ts`. A page that imported only `tosiTag` has not.
*/
test('a component draws its own icons without the whole set, and any other name arrives late (#3885)', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'tosi-icons-'))
  const src = import.meta.dir
  try {
    const script = path.join(dir, 'probe.ts')
    writeFileSync(
      script,
      `
      import { tosiTag } from ${JSON.stringify(path.join(src, 'tag.ts'))}
      import { icons, defineIcons } from ${JSON.stringify(
        path.join(src, 'icon-core.ts')
      )}
      import { allIconsRegistered, loadAllIcons } from ${JSON.stringify(
        path.join(src, 'icon-store.ts')
      )}
      const { iconData } = await import(${JSON.stringify(
        path.join(src, 'icon-store.ts')
      )})
      const out: Record<string, unknown> = {}
      out.registered = Object.keys(iconData).sort()
      out.complete = allIconsRegistered()
      const tag = tosiTag({ caption: 'hi', removeable: true })
      document.body.append(tag)
      defineIcons({ calendar: '<svg class="mine" viewBox="0 0 24 24"></svg>' })
      const host = document.createElement('div')
      document.body.append(host)
      const folder = icons.folder()
      host.append(folder)
      out.pendingFirst = folder.classList.contains('tosi-icon-pending')
      await loadAllIcons()
      out.complete2 = allIconsRegistered()
      const drawn = host.firstElementChild as Element
      out.replaced = drawn !== folder && !drawn.classList.contains('tosi-icon-pending')
      out.folderPaths = drawn.querySelectorAll('path, polyline, line').length
      out.keptMine = iconData.calendar.includes('class="mine"')
      console.log(JSON.stringify(out))
      `
    )
    const run = Bun.spawnSync(
      ['bun', '--preload', path.join(src, 'test-setup.ts'), script],
      { cwd: path.join(src, '..') }
    )
    expect(run.stderr.toString()).toBe('')
    const out = JSON.parse(run.stdout.toString().trim().split('\n').pop()!)
    expect(out.registered).toEqual(['x'])
    expect(out.complete).toBe(false)
    expect(out.pendingFirst).toBe(true)
    expect(out.complete2).toBe(true)
    expect(out.replaced).toBe(true)
    expect(out.folderPaths).toBeGreaterThan(0)
    // An icon the app defined is not replaced when the built-ins arrive.
    expect(out.keptMine).toBe(true)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
