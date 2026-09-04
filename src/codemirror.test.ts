import { test, expect, describe } from 'bun:test'

/*
#131: extending `<tosi-code>.editor` must use OUR CodeMirror, or it silently no-ops.

CodeMirror 6 keys facets, StateFields and gutters by OBJECT IDENTITY. A second copy of
`@codemirror/state` or `@codemirror/view` produces extensions the view does not recognise —
no error, no warning, the gutter simply never renders.

These assert identity, which is the only property that matters. A test that merely imported
the re-export and checked the symbols exist would pass against two separate copies, i.e.
against the exact bug.
*/
describe('tosijs-ui/codemirror re-export (#131)', () => {
  test('re-exported view symbols are the SAME objects the editor uses', async () => {
    const reexported = await import('./codemirror.js')
    const direct = await import('@codemirror/view')
    expect(reexported.gutter).toBe(direct.gutter)
    expect(reexported.GutterMarker).toBe(direct.GutterMarker)
    expect(reexported.EditorView).toBe(direct.EditorView)
  })

  test('re-exported state symbols are the same objects too', async () => {
    const reexported = await import('./codemirror.js')
    const direct = await import('@codemirror/state')
    expect(reexported.StateField).toBe(direct.StateField)
    expect(reexported.StateEffect).toBe(direct.StateEffect)
    expect(reexported.EditorState).toBe(direct.EditorState)
  })

  test('it carries the surface a consumer needs to extend a view', async () => {
    const m = (await import('./codemirror.js')) as Record<string, unknown>
    // The exact symbols from the reported repro — a gutter driven by a StateField.
    for (const name of [
      'gutter',
      'GutterMarker',
      'EditorView',
      'StateField',
      'StateEffect',
      'EditorState',
      'Compartment',
    ]) {
      expect(typeof m[name]).not.toBe('undefined')
    }
  })
})
