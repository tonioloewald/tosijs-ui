import { test, expect } from 'bun:test'
import { resolveIdleMs } from './dev-server'

const HOUR = 3600_000

test('defaults to 8 hours when neither config nor env says otherwise', () => {
  expect(resolveIdleMs(undefined, undefined)).toBe(8 * HOUR)
})

test('config sets the timeout; env overrides config', () => {
  expect(resolveIdleMs(2, undefined)).toBe(2 * HOUR)
  expect(resolveIdleMs(2, '4')).toBe(4 * HOUR)
})

test('an explicit zero or negative disables it — the only way to turn it off', () => {
  expect(resolveIdleMs(0, undefined)).toBe(0)
  expect(resolveIdleMs(-1, undefined)).toBe(0)
  expect(resolveIdleMs(undefined, '0')).toBe(0)
})

test('an empty env var means unset, not disabled', () => {
  expect(resolveIdleMs(2, '')).toBe(2 * HOUR)
  expect(resolveIdleMs(undefined, '  ')).toBe(8 * HOUR)
})

test('a garbage env value falls back to the default — never silently OFF', () => {
  // The guard exists to stop a forgotten server from becoming a runaway. A typo
  // that quietly disables it would be worse than having no guard at all, because
  // you would believe you were covered.
  expect(resolveIdleMs(undefined, '8h')).toBe(8 * HOUR)
  expect(resolveIdleMs(undefined, 'off')).toBe(8 * HOUR)
  expect(resolveIdleMs(4, 'nonsense')).toBe(8 * HOUR)
})

test('fractional hours work, for anyone who wants a short leash', () => {
  expect(resolveIdleMs(0.5, undefined)).toBe(0.5 * HOUR)
})
