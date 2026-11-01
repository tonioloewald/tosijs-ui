import { describe, expect, test } from 'bun:test'
import { exampleTabsProblem, isLiveFence } from './example-policy.js'

describe("#246: the 'no-code' policy", () => {
  test('html and css run; nothing that is a script does, whatever its mode', () => {
    expect(isLiveFence('html', undefined, 'no-code')).toBe(true)
    expect(isLiveFence('css', 'iframe', 'no-code')).toBe(true)
    for (const lang of ['js', 'ts', 'tjs', 'test'])
      for (const mode of [undefined, 'inline', 'iframe', 'ide'])
        expect(isLiveFence(lang, mode, 'no-code')).toBe(false)
  })

  test('`:static` still opts html out', () => {
    expect(isLiveFence('html', 'static', 'no-code')).toBe(false)
  })
})

describe('#246: example tab names', () => {
  test('a list of known tabs is fine', () => {
    expect(exampleTabsProblem(['html', 'css', 'chat'])).toBeUndefined()
    expect(exampleTabsProblem([])).toBeUndefined()
  })

  test('an unknown name, or not a list, is named', () => {
    expect(exampleTabsProblem(['preview', 'html'])).toContain(
      'unknown example tab "preview"'
    )
    expect(exampleTabsProblem('html')).toContain('must be an array')
  })
})
