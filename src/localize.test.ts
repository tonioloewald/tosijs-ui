import { test, expect, beforeEach } from 'bun:test'
import { initLocalization, localize, i18n, applyLocalized } from './localize'

// Wait long enough for the MutationObserver to flush its records.
const flushMutations = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0))

const testTSV = [
  'en-US\tfr\tde',
  'English\tFrench\tGerman',
  'English\tFrançais\tDeutsch',
  '🇺🇸\t🇫🇷\t🇩🇪',
  "Okay\tD'accord\tOkay",
  'Cancel\tAnnuler\tAbbrechen',
  'Yes\tOui\tJa',
  'Okay#confirm\t"\t"\t',
  'Okay#accept\tBien\t"',
].join('\n')

beforeEach(() => {
  initLocalization(testTSV)
  i18n.locale.value = 'en-US'
  if (typeof document !== 'undefined') {
    document.body.innerHTML = ''
  }
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
  expect(localize('Okay#confirm')).toBe("D'accord")
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
  expect(localize('Okay#unknown')).toBe("D'accord")
})

test('# annotation strips annotation even with no translations', () => {
  // A string not in the map at all but with # annotation
  expect(localize('Missing#tag')).toBe('Missing')
})

test('case preservation with # annotations', () => {
  i18n.locale.value = 'fr'
  // lowercase input -> lowercase output
  expect(localize('okay#confirm')).toBe("d'accord")
})

test('ellipsis works with # annotations', () => {
  i18n.locale.value = 'fr'
  expect(localize('Okay#confirm…')).toBe("D'accord…")
})

// --- data-tosi-localized directive ---------------------------------------

test('data-tosi-localized: applyLocalized writes every mapped attribute', () => {
  i18n.locale.value = 'fr'
  const btn = document.createElement('button')
  btn.setAttribute(
    'data-tosi-localized',
    JSON.stringify({ title: 'Cancel', 'aria-label': 'Yes' })
  )
  applyLocalized(btn)
  expect(btn.getAttribute('title')).toBe('Annuler')
  expect(btn.getAttribute('aria-label')).toBe('Oui')
})

test('data-tosi-localized: re-applies on locale change', async () => {
  const btn = document.createElement('button')
  btn.setAttribute('data-tosi-localized', JSON.stringify({ title: 'Cancel' }))
  document.body.appendChild(btn)
  applyLocalized(btn)
  expect(btn.getAttribute('title')).toBe('Cancel')
  i18n.locale.value = 'fr'
  await flushMutations()
  expect(btn.getAttribute('title')).toBe('Annuler')
  i18n.locale.value = 'de'
  await flushMutations()
  expect(btn.getAttribute('title')).toBe('Abbrechen')
})

test('data-tosi-localized: mutating the attribute re-applies', async () => {
  i18n.locale.value = 'fr'
  const btn = document.createElement('button')
  btn.setAttribute('data-tosi-localized', JSON.stringify({ title: 'Cancel' }))
  document.body.appendChild(btn)
  // Drive the apply path directly. The MutationObserver fires it in a real
  // browser; happy-dom holds the callback in a WeakRef that gets collected
  // between tests, so we don't rely on it here.
  applyLocalized(btn)
  expect(btn.getAttribute('title')).toBe('Annuler')
  btn.setAttribute('data-tosi-localized', JSON.stringify({ title: 'Yes' }))
  applyLocalized(btn)
  expect(btn.getAttribute('title')).toBe('Oui')
})

test('data-tosi-localized: locale change descends into open shadow roots', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = host.attachShadow({ mode: 'open' })
  const inner = document.createElement('span')
  inner.setAttribute('data-tosi-localized', JSON.stringify({ title: 'Cancel' }))
  root.appendChild(inner)
  // No MutationObserver inside shadow roots, so apply manually first…
  applyLocalized(inner)
  expect(inner.getAttribute('title')).toBe('Cancel')
  // …then a locale change should sweep all open shadow roots.
  i18n.locale.value = 'fr'
  await flushMutations()
  expect(inner.getAttribute('title')).toBe('Annuler')
})

test('data-tosi-localized: invalid JSON warns and does not throw', () => {
  const original = console.warn
  let warned = false
  console.warn = () => {
    warned = true
  }
  try {
    const btn = document.createElement('button')
    btn.setAttribute('data-tosi-localized', '{not json')
    expect(() => applyLocalized(btn)).not.toThrow()
    expect(warned).toBe(true)
  } finally {
    console.warn = original
  }
})

test('data-tosi-localized: walk finds elements nested under a fresh parent', async () => {
  const wrapper = document.createElement('div')
  const btn = document.createElement('button')
  btn.setAttribute('data-tosi-localized', JSON.stringify({ title: 'Cancel' }))
  wrapper.appendChild(btn)
  document.body.appendChild(wrapper)
  // Force the document walk via a locale change.
  i18n.locale.value = 'fr'
  await flushMutations()
  expect(btn.getAttribute('title')).toBe('Annuler')
})

test('data-tosi-localized: ellipsis is preserved through the directive', () => {
  i18n.locale.value = 'fr'
  const btn = document.createElement('button')
  btn.setAttribute('data-tosi-localized', JSON.stringify({ title: 'Cancel…' }))
  applyLocalized(btn)
  expect(btn.getAttribute('title')).toBe('Annuler…')
})

test('data-tosi-localized: non-string values are skipped silently', () => {
  i18n.locale.value = 'fr'
  const btn = document.createElement('button')
  btn.setAttribute(
    'data-tosi-localized',
    JSON.stringify({ title: 'Cancel', tabIndex: 0 })
  )
  applyLocalized(btn)
  expect(btn.getAttribute('title')).toBe('Annuler')
  expect(btn.hasAttribute('tabIndex')).toBe(false)
})

test('ditto resolution works regardless of row order', () => {
  // annotated rows appear BEFORE their base row
  const reversedTSV = [
    'en-US\tfr\tde',
    'English\tFrench\tGerman',
    'English\tFrançais\tDeutsch',
    '🇺🇸\t🇫🇷\t🇩🇪',
    'Okay#confirm\t"\t"',
    "Okay\tD'accord\tOkay",
  ].join('\n')
  initLocalization(reversedTSV)
  i18n.locale.value = 'fr'
  expect(localize('Okay#confirm')).toBe("D'accord")
})
