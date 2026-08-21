import { test, expect, beforeEach } from 'bun:test'
import { initLocalization, localize, i18n, applyLocalized } from './localize.js'

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

// ── literal '#' (tosijs-ui#55, reported by snowfox) ──────────────────────────
//
// `#` separates a string from its annotation (`Okay#confirm`), and every `#` used to be
// stripped — so any literal `#` was destroyed. The suite covered annotations thoroughly
// and had no fixture with a literal `#` on either side, which is why this survived: the
// tests encoded the feature, not its boundary.

const literalTSV = [
  'en-US\tfr',
  'English\tFrench',
  'English\tFrançais',
  '🇺🇸\t🇫🇷',
  'C# Tutorial\tTutoriel C#',
  'Sharp\tDièse #1',
  'Issue #42\tProblème #42',
  'Okay#confirm\t"',
].join('\n')

test('a literal # in the SOURCE survives, unlocalized', () => {
  // The reported case. An annotation is a suffix identifier — "# Tutorial" contains a
  // space, so it is prose, not an annotation.
  expect(localize('C# Tutorial')).toBe('C# Tutorial')
  expect(localize('Issue #42')).toBe('Issue #42') // space BEFORE the #
  expect(localize('#hashtag')).toBe('#hashtag') // nothing before the #
  expect(localize('C#')).toBe('C#') // empty annotation
})

test('REGRESSION: a literal # in the TRANSLATION survives even when the source has none', () => {
  /*
  The worse half. Annotations were stripped from the translated VALUE too, so a translator
  writing an ordinary string containing `#` had it silently truncated — with nothing in the
  source to hint why. Escaping cannot fix this: it would require every translator, in every
  language, to escape a marker that is meaningless to them.

  An annotation cannot appear in a translation, because the translation is what the
  annotation resolved TO.
  */
  initLocalization(literalTSV)
  i18n.locale.value = 'fr'
  expect(localize('Sharp')).toBe('Dièse #1') // source has NO '#'
  expect(localize('C# Tutorial')).toBe('Tutoriel C#')
  expect(localize('Issue #42')).toBe('Problème #42')
})

test('real annotations still resolve and are still stripped from the key', () => {
  initLocalization(literalTSV)
  i18n.locale.value = 'fr'
  // ditto mark inherits the base translation; the annotation never reaches the output
  expect(localize('Okay#confirm')).toBe('Okay')
  i18n.locale.value = 'en-US'
  expect(localize('Okay#confirm')).toBe('Okay')
})

test('an unmatched annotation falls back to the bare string', () => {
  initLocalization(literalTSV)
  i18n.locale.value = 'fr'
  expect(localize('Sharp#nosuch')).toBe('Dièse #1')
})

test('\\# escapes a # that would otherwise read as an annotation', () => {
  // The residue: a literal that genuinely looks like a suffix annotation.
  expect(localize('tag\\#42')).toBe('tag#42')
  expect(localize('issue\\#7')).toBe('issue#7')
})

test('the ellipsis path keeps literal # too', () => {
  // `…` recurses before annotation handling, so it has to survive the same treatment.
  expect(localize('C# Tutorial…')).toBe('C# Tutorial…')
})

const patternTSV = [
  'en-US\tfr',
  'English\tFrench',
  'English\tFrançais',
  '🇺🇸\t🇫🇷',
  // French puts the noun before the adjective — which is the whole reason the KEY has to be
  // the sentence rather than two words a caller sticks together.
  'Add {item}\tAjouter {item}',
  'Sort ascending by {column}\tTrier par {column} par ordre croissant',
].join('\n')

test('placeholders are filled AFTER translation', () => {
  initLocalization(patternTSV)
  i18n.locale.value = 'fr'
  expect(localize('Add {item}', { item: 'ligne' })).toBe('Ajouter ligne')
  // The translation moved the placeholder to the middle. Concatenation could not have.
  expect(localize('Sort ascending by {column}', { column: 'prix' })).toBe(
    'Trier par prix par ordre croissant'
  )
})

test('an untranslated pattern still interpolates', () => {
  initLocalization(patternTSV)
  i18n.locale.value = 'en-US'
  expect(localize('Remove {item}', { item: 'tag' })).toBe('Remove tag')
})

test('an unknown placeholder is left visible, not blanked', () => {
  // A typo in a translation should look like a typo, not like missing data.
  expect(localize('Add {itme}', { item: 'x' })).toBe('Add {itme}')
})

test('no values argument means no interpolation at all', () => {
  // Braces in an ordinary string are not placeholders.
  expect(localize('use {} for an empty object')).toBe(
    'use {} for an empty object'
  )
})
