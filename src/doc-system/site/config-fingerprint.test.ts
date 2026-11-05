import { test, expect } from 'bun:test'
import {
  buildRequestRefusal,
  configFingerprint,
  staleConfigMessage,
} from './config-fingerprint.js'

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

const server = { root: '/work/site', pid: 42, config: 'abc' }
const params = (query: string) => new URLSearchParams(query)

test('a /__build request with a different config fingerprint is refused before building (#3863)', () => {
  const refusal = buildRequestRefusal(
    params('root=/work/site&config=other'),
    server
  )
  expect(refusal).toMatchObject({ ok: false, config: 'abc', pid: 42 })
  expect(String(refusal!.detail)).toContain('Restart it')
})

test('a request for another tree is refused too, and a matching one builds', () => {
  expect(
    buildRequestRefusal(params('root=/elsewhere&config=abc'), server)
  ).toMatchObject({ ok: false, root: '/work/site' })
  expect(
    buildRequestRefusal(params('root=/work/site&config=abc'), server)
  ).toBe(null)
})

test('a reply with no fingerprint, or another one, fails the delegated build (#3863)', () => {
  const where = { port: 8787, pid: 42 }
  expect(staleConfigMessage(undefined, 'abc', where)).toContain(
    'cannot say which site config'
  )
  expect(staleConfigMessage('other', 'abc', where)).toContain(
    'different site config'
  )
  expect(staleConfigMessage('abc', 'abc', where)).toBe(null)
})
