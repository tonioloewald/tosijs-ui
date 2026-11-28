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
