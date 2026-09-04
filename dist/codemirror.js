/*
CodeMirror, re-exported — so extending `<tosi-code>.editor` uses OUR copy.

CodeMirror 6 keys facets, `StateField`s and gutters by **object identity**, not by module
name. So an extension built from a second copy of `@codemirror/state` or `@codemirror/view`
is not merely mismatched — it is silently ignored. No error, no warning, nothing in the
console; the gutter just never renders.

That is not hypothetical. Reported against 1.13 (tosijs-ui#131) by a consumer adding a gutter
to the exposed `EditorView`:

    consumer's  node_modules/@codemirror/view                 6.43.6
    ours        node_modules/tosijs-ui/node_modules/…/view    6.43.10   ← nested duplicate

`@codemirror/state` happened to dedupe (both 6.7.1), so `StateEffect.appendConfig` and
`StateField` worked and only the VIEW-side gutter failed. A partial dedupe is the worst case:
enough works that the remaining failure looks like a bug in the gutter code.

WHY THIS RATHER THAN PEER DEPENDENCIES, which #131 proposed and which is the obvious fix:

  - A required peer would make every consumer install two CodeMirror packages, including the
    overwhelming majority who never render a `<tosi-code>`. `elementCreator()` registers
    eagerly, so importing tosijs-ui is not evidence of using the editor.
  - An OPTIONAL peer is worse than either: the component silently does nothing until you
    discover you needed 12 packages. That is recorded in CLAUDE.md as a decision, not an
    oversight.
  - Re-exporting removes the failure by construction instead of policing it. There is no
    version to match and no `overrides` to write, because there is only ever one copy: the
    one this module resolves.

The scope is deliberately the two packages a consumer needs to EXTEND a view — `state` and
`view`, exactly as #131 identified. The language/lint/search/lang-* packages are internal
composition details; re-exporting them would advertise a surface we do not intend to keep
stable. Ask if you need one and it can be added with a reason.

    import { gutter, GutterMarker } from 'tosijs-ui/codemirror'
    import { StateField, StateEffect } from 'tosijs-ui/codemirror'

    const view = codeEl.editor            // the exposed EditorView
    view?.dispatch({ effects: StateEffect.appendConfig.of([field, myGutter]) })
*/
export * from '@codemirror/state';
export * from '@codemirror/view';
