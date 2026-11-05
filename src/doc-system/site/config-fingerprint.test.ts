import { test, expect } from 'bun:test'
import { configFingerprint } from './config-fingerprint.js'

test('the same config gives the same fingerprint', () => {
  const make = () => ({ name: 'x', docPaths: ['src'], prebuild: () => 1 })
  expect(configFingerprint(make())).toBe(configFingerprint(make()))
})

test('an edited value, or edited function, changes it', () => {
  const base = configFingerprint({ name: 'x', ogImage: undefined })
  expect(configFingerprint({ name: 'x', ogImage: '/icon.png' })).not.toBe(base)
  expect(configFingerprint({ f: () => 1 })).not.toBe(
    configFingerprint({ f: () => 2 })
  )
})

test('a circular config does not throw', () => {
  const config: any = { name: 'x' }
  config.self = config
  expect(typeof configFingerprint(config)).toBe('string')
})
