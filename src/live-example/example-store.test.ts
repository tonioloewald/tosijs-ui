import { expect, test, describe, beforeEach } from 'bun:test'
import {
  exampleEditKey,
  saveExampleEdit,
  loadExampleEdit,
  clearExampleEdit,
  hasExampleEdit,
} from './example-store'

describe('example-store', () => {
  beforeEach(() => localStorage.clear())

  test('key is stable and includes source + ordinal', () => {
    expect(exampleEditKey('src/rating.ts', 0)).toBe(
      'tosi-example-edit:src/rating.ts#0'
    )
    expect(exampleEditKey('src/rating.ts', '0')).toBe(
      exampleEditKey('src/rating.ts', 0)
    )
  })

  test('save → load round-trips', () => {
    const key = exampleEditKey('a.md', 1)
    expect(hasExampleEdit(key)).toBe(false)
    expect(loadExampleEdit(key)).toBeNull()
    saveExampleEdit(key, { js: 'const a = 1', css: '.x{}' })
    expect(hasExampleEdit(key)).toBe(true)
    expect(loadExampleEdit(key)).toEqual({ js: 'const a = 1', css: '.x{}' })
  })

  test('clear removes the entry', () => {
    const key = exampleEditKey('a.md', 2)
    saveExampleEdit(key, { js: 'x' })
    clearExampleEdit(key)
    expect(hasExampleEdit(key)).toBe(false)
    expect(loadExampleEdit(key)).toBeNull()
  })

  test('keys are independent per example', () => {
    saveExampleEdit(exampleEditKey('a.md', 0), { js: 'zero' })
    saveExampleEdit(exampleEditKey('a.md', 1), { js: 'one' })
    expect(loadExampleEdit(exampleEditKey('a.md', 0))?.js).toBe('zero')
    expect(loadExampleEdit(exampleEditKey('a.md', 1))?.js).toBe('one')
  })

  test('corrupt JSON loads as null, not a throw', () => {
    const key = exampleEditKey('a.md', 3)
    localStorage.setItem(key, '{not json')
    expect(loadExampleEdit(key)).toBeNull()
  })
})
