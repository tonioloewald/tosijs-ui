import { test, expect } from 'bun:test'
import { resolveIdleMs, resolveLimitMb } from './dev-server'

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

// ── the RSS ceiling ─────────────────────────────────────────────────────────
// This was `Number(env ?? config ?? 4096)`, which failed in BOTH directions.

test('the ceiling defaults to 4096MB', () => {
  expect(resolveLimitMb(undefined, undefined)).toBe(4096)
  expect(resolveLimitMb(2048, undefined)).toBe(2048)
  expect(resolveLimitMb(2048, '1024')).toBe(1024) // env wins
})

test('AN EMPTY ENV VAR IS UNSET, NOT ZERO — the ceiling must not become 0', () => {
  // `??` let '' through to Number('') === 0, making the ceiling ZERO: `rss >= 0` is
  // true on the first sample, so the dev server killed itself on every rebuild.
  // `DEV_MEMORY_LIMIT_MB=` is an utterly ordinary shell accident.
  expect(resolveLimitMb(undefined, '')).toBe(4096)
  expect(resolveLimitMb(2048, '   ')).toBe(2048)
})

test('a garbage ceiling falls back to the default — never silently OFF', () => {
  // Number('4gb') is NaN, and every `rss >= NaN` is false — so the guard vanished
  // for the one person who was actively trying to configure it.
  expect(resolveLimitMb(undefined, '4gb')).toBe(4096)
  expect(resolveLimitMb(undefined, 'none')).toBe(4096)
})

test('only an explicit non-positive number disables the ceiling', () => {
  expect(resolveLimitMb(undefined, '0')).toBe(0)
  expect(resolveLimitMb(0, undefined)).toBe(0)
})
