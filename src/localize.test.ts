/* eslint-disable */
import { test, expect, beforeEach } from 'bun:test'
import { initLocalization, localize, i18n } from './localize'

const testTSV = [
  'en-US\tfr\tde',
  'English\tFrench\tGerman',
  'English\tFrançais\tDeutsch',
  '🇺🇸\t🇫🇷\t🇩🇪',
  'Okay\tD\'accord\tOkay',
  'Cancel\tAnnuler\tAbbrechen',
  'Yes\tOui\tJa',
  'Okay#confirm\t"\t"\t',
  'Okay#accept\tBien\t"',
].join('\n')

beforeEach(() => {
  initLocalization(testTSV)
  i18n.locale.value = 'en-US'
})

test('basic localization works', () => {
  i18n.locale.value = 'fr'
  expect(localize('Cancel')).toBe('Annuler')
  expect(localize('Yes')).toBe('Oui')
})

test('localize returns ref string for reference locale', () => {
  expect(localize('Cancel')).toBe('Cancel')
})

test('# annotation: returns base string for reference locale', () => {
  expect(localize('Okay#confirm')).toBe('Okay')
  expect(localize('Okay#accept')).toBe('Okay')
})

test('# annotation with ditto: inherits base translation', () => {
  i18n.locale.value = 'fr'
  // Okay#confirm has " for French, so it inherits from Okay -> D'accord
  expect(localize('Okay#confirm')).toBe('D\'accord')
})

test('# annotation with specific override', () => {
  i18n.locale.value = 'fr'
  // Okay#accept has "Bien" for French (specific override)
  expect(localize('Okay#accept')).toBe('Bien')
})

test('# annotation with ditto for German', () => {
  i18n.locale.value = 'de'
  // Okay#accept has " for German, so it inherits from Okay -> Okay
  expect(localize('Okay#accept')).toBe('Okay')
})

test('# annotation fallback when annotated key not in map', () => {
  i18n.locale.value = 'fr'
  // Okay#unknown is not in the TSV at all, falls back to Okay -> D'accord
  expect(localize('Okay#unknown')).toBe('D\'accord')
})

test('# annotation strips annotation even with no translations', () => {
  // A string not in the map at all but with # annotation
  expect(localize('Missing#tag')).toBe('Missing')
})

test('case preservation with # annotations', () => {
  i18n.locale.value = 'fr'
  // lowercase input -> lowercase output
  expect(localize('okay#confirm')).toBe('d\'accord')
})

test('ellipsis works with # annotations', () => {
  i18n.locale.value = 'fr'
  expect(localize('Okay#confirm…')).toBe('D\'accord…')
})

test('ditto resolution works regardless of row order', () => {
  // annotated rows appear BEFORE their base row
  const reversedTSV = [
    'en-US\tfr\tde',
    'English\tFrench\tGerman',
    'English\tFrançais\tDeutsch',
    '🇺🇸\t🇫🇷\t🇩🇪',
    'Okay#confirm\t"\t"',
    'Okay\tD\'accord\tOkay',
  ].join('\n')
  initLocalization(reversedTSV)
  i18n.locale.value = 'fr'
  expect(localize('Okay#confirm')).toBe('D\'accord')
})
