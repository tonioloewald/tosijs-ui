import { describe, expect, test } from 'bun:test'
import * as root from './index'

/*
#4389 (1.20.0): every `xin*` / `Xin*` root alias warns once, naming its replacement, and still
works as the survivor. Only five warned; the other 28 were silent re-exports.
*/
const aliases = Object.keys(root).filter((name) => /^(xin|Xin)[A-Z]/.test(name))

const captureWarnings = (run: () => void): string[] => {
  const said: string[] = []
  const { warn, error } = console
  console.warn = (...args: unknown[]) =>
    void said.push(args.map(String).join(' '))
  console.error = console.warn
  try {
    run()
  } finally {
    console.warn = warn
    console.error = error
  }
  return said
}

describe('the xin aliases (#4389)', () => {
  test('there are 33, as the lean review counted', () => {
    expect(aliases.length).toBe(33)
  })

  for (const name of aliases) {
    const survivor = name.replace(/^xin/, 'tosi').replace(/^Xin/, 'Tosi')
    const replacement = name === 'XinWord' ? 'RichText' : survivor
    test(`${name} warns once, naming ${replacement}, and works`, () => {
      const alias = (root as any)[name]
      const real = (root as any)[replacement]
      expect(real).toBeDefined()
      const said = captureWarnings(() => {
        if (/^xin/.test(name)) {
          const first = alias()
          const second = alias()
          expect(first.tagName).toBe(real().tagName)
          expect(second.tagName).toBe(first.tagName)
        } else {
          const instance = real.elementCreator()()
          expect(instance instanceof alias).toBe(true)
          expect(alias.elementCreator()().tagName).toBe(instance.tagName)
        }
      })
      const mentions = said.filter((line) => line.includes(name))
      expect(mentions.length).toBe(1)
      expect(mentions[0]).toContain(replacement)
    })
  }
})

test('enableLiveTheme and disableLiveTheme warn once between them, naming applyTheme (#4392)', () => {
  const said = captureWarnings(() => {
    root.enableLiveTheme()
    root.disableLiveTheme()
    root.enableLiveTheme()
    root.disableLiveTheme()
  })
  const mentions = said.filter((line) => line.includes('enableLiveTheme'))
  expect(mentions.length).toBe(1)
  expect(mentions[0]).toContain('applyTheme')
})

/*
1.20.0 review, M1: a subclass of an alias is a subclass. The `get` trap bound statics to the
survivor, so `class MyForm extends XinForm` built and registered a <tosi-form>.
*/
describe('subclassing an Xin* alias (review M1)', () => {
  const classAliases = aliases.filter((name) => /^Xin/.test(name))
  let n = 0
  for (const name of classAliases) {
    test(`a subclass of ${name} registers and builds its own element`, () => {
      const alias = (root as any)[name]
      const tag = `alias-sub-${++n}-${name.toLowerCase()}`
      let Sub: any
      captureWarnings(() => {
        Sub = class extends alias {
          static preferredTagName = tag
          ownMethod() {
            return 'mine'
          }
        }
        const el = Sub.elementCreator()()
        expect(el.tagName.toLowerCase()).toBe(tag)
        expect(el.ownMethod()).toBe('mine')
        expect(el instanceof Sub).toBe(true)
        expect(el instanceof alias).toBe(true)
      })
      expect(customElements.get(tag)).toBe(Sub)
      const replacement =
        name === 'XinWord' ? 'RichText' : name.replace(/^Xin/, 'Tosi')
      const survivorElement = (root as any)[replacement].elementCreator()()
      expect(survivorElement instanceof Sub).toBe(false)
    })
  }
})

/*
1.20.0 review, B2: the library must never read an alias itself, or an app that never names one
is told to stop using it. <tosi-select localized> read XinLocalized, and the iframe registration
read every class alias's statics.
*/
describe('the library reads no alias of its own (review B2)', () => {
  test('no source file outside its own export line names an alias', async () => {
    const { Glob } = await import('bun')
    const { readFileSync } = await import('fs')
    const names = new Set(aliases)
    const strip = (source: string) =>
      source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1')
        .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    const offenders: string[] = []
    for (const file of new Glob('src/**/*.ts').scanSync({
      cwd: process.cwd(),
    })) {
      if (file.endsWith('.test.ts') || file.endsWith('.d.ts')) continue
      const lines = strip(readFileSync(file, 'utf8')).split('\n')
      lines.forEach((line, i) => {
        for (const m of line.matchAll(/\b(?:xin|Xin)[A-Z]\w*\b/g)) {
          if (!names.has(m[0])) continue // tosijs's own names, such as XinStyleSheet
          if (new RegExp(`^export (const|type) ${m[0]}\\b`).test(line)) continue
          // A re-export passes the binding on without reading it.
          if (/^export (type )?\{[^}]*\} from /.test(line)) continue
          offenders.push(`${file}:${i + 1}: ${line.trim()}`)
        }
      })
    }
    expect(offenders).toEqual([])
  })

  /*
  In a child process: each alias warns once per process, and the tests above have used every one
  up, so in this process the check could not fail.
  */
  test('a localized select and the iframe registration log no deprecation', () => {
    const root = process.cwd()
    const probe = `
      const said = []
      console.warn = console.error = (...a) => said.push(a.map(String).join(' '))
      const ui = await import('${root}/src/index.ts')
      const { registerComponentsInIframe } = await import('${root}/src/live-example/execution.ts')
      const select = ui.tosiSelect({ localized: true, options: 'a,b' })
      document.body.append(select)
      select.remove()
      const registered = []
      registerComponentsInIframe({
        customElements: { get: () => undefined, define: (t) => registered.push(t) },
        document: { querySelectorAll: () => [] },
      }, { 'tosijs-ui': ui })
      process.stdout.write(JSON.stringify({ registered: registered.length, said: said.filter((l) => l.includes('is deprecated')) }))
    `
    const run = Bun.spawnSync(
      ['bun', '--preload', `${root}/src/test-setup.ts`, '-e', probe],
      { cwd: root }
    )
    const out = run.stdout.toString()
    const result = JSON.parse(
      out.slice(out.lastIndexOf('{"registered"')) || '{}'
    )
    expect(result.registered).toBeGreaterThan(10)
    expect(result.said).toEqual([])
  })
})
