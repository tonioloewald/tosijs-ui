import { test, expect } from 'bun:test'
import type { AutocompleteConfig } from 'tjs-lang/editors/codemirror'
import type { TjsAutocompleteConfig } from './code-editor-cm'

/*
`tjs-lang` is an OPTIONAL peer, so nothing we ship may import a type from it — a consumer
whose only import is `tosiCode` would get TS2307 for a language toolchain they never asked
for, and declaring the peer optional does not help because TypeScript does not care what npm
thinks is optional (tjs-lang#13).

The type is therefore declared locally, and this is the anti-drift guard. tjs-lang is a
devDependency, so the comparison is always available here.
*/

test('our TjsAutocompleteConfig is assignable to theirs, and theirs to ours', () => {
  const ours: TjsAutocompleteConfig = {
    getMetadata: () => ({}),
    getMembers: async () => [
      { label: 'x', type: 'property', detail: 'string' },
    ],
  }
  const asTheirs: AutocompleteConfig = ours
  const backAgain: TjsAutocompleteConfig = asTheirs
  expect(typeof backAgain.getMetadata).toBe('function')
})
