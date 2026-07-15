import { test, expect } from 'bun:test'
import { pageTitle } from './doc-title'

test('headTitle wins verbatim, no suffix', () => {
  expect(
    pageTitle({ title: 'Home', headTitle: 'My Project — fast web components' }, 'My Project')
  ).toBe('My Project — fast web components')
})

test('a whitespace-only headTitle is not an override — falls through to the derived title', () => {
  // ' ' is truthy, so a naive `if (doc.headTitle)` would set a BLANK <title>.
  expect(pageTitle({ title: 'Rating', headTitle: ' ' }, 'tosijs-ui')).toBe(
    'Rating — tosijs-ui'
  )
  expect(pageTitle({ title: 'Rating', headTitle: '' }, 'tosijs-ui')).toBe(
    'Rating — tosijs-ui'
  )
  // and a padded one is trimmed
  expect(pageTitle({ title: 'x', headTitle: '  Exact Title  ' })).toBe('Exact Title')
})

test('a distinct doc title gets the project suffix', () => {
  expect(pageTitle({ title: 'Rating' }, 'tosijs-ui')).toBe('Rating — tosijs-ui')
})

test('no doubling when the title already contains the project name', () => {
  // The shipped bug: doc.title === projectName produced "tosijs-ui — tosijs-ui".
  expect(pageTitle({ title: 'tosijs-ui' }, 'tosijs-ui')).toBe('tosijs-ui')
  expect(pageTitle({ title: 'tosijs-ui reference' }, 'tosijs-ui')).toBe(
    'tosijs-ui reference'
  )
})

test('no doubling when the PROJECT name contains the title (the other direction)', () => {
  // A one-way `title.includes(project)` check missed this.
  expect(pageTitle({ title: 'tosijs' }, 'tosijs-ui')).toBe('tosijs')
})

test('containment is case-insensitive', () => {
  expect(pageTitle({ title: 'Tosijs-UI' }, 'tosijs-ui')).toBe('Tosijs-UI')
  expect(pageTitle({ title: 'tosijs-ui' }, 'Tosijs-UI')).toBe('tosijs-ui')
})

test('no project name → the title alone', () => {
  expect(pageTitle({ title: 'Home' })).toBe('Home')
  expect(pageTitle({ title: 'Home' }, '')).toBe('Home')
})

test('a whitespace-only project name is treated as absent, not appended', () => {
  // Untrimmed, ' ' is truthy → "Home —  " (dangling separator); and for a multi-word
  // title, `title.includes(' ')` would wrongly suppress a real suffix.
  expect(pageTitle({ title: 'Home' }, ' ')).toBe('Home')
  expect(pageTitle({ title: 'Getting Started' }, '   ')).toBe('Getting Started')
})

test('a padded project name is trimmed before use', () => {
  expect(pageTitle({ title: 'Rating' }, '  tosijs-ui  ')).toBe('Rating — tosijs-ui')
  expect(pageTitle({ title: 'tosijs-ui' }, ' tosijs-ui ')).toBe('tosijs-ui')
})
