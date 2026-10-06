# code

A [CodeMirror 6](https://codemirror.net/) wrapper.

Sometimes, it's nice to be able to just toss a code-editor in a web-page.

`<tosi-code>`'s `value` is the code it contains. Its `mode` attribute sets the
language (`javascript`, `typescript`, `tjs`, `css`, `html`, `markdown`).

```html
<tosi-code style="width: 100%; height: 100%" mode="css">
body {
  box-sizing: border-box;
}
</tosi-code>
```

## Properties & events

| member | what it does |
| --- | --- |
| `value` | the code in the editor (get/set) |
| `mode` | `javascript`, `typescript`, `tjs`, `ajs`, `css`, `html`, `markdown` |
| `disabled` | makes the editor read-only |
| `original` + `showDiff(on)` | diff the current `value` against a baseline, as an overlay |
| `diffResolvable` | make that overlay **resolvable**: each change gets keep/revert buttons, and the choices are applied to `value` when the diff closes |
| `diffOriginalLabel` / `diffModifiedLabel` | what the two buttons say (default `Original`/`Modified`) |
| `editor` | the underlying CodeMirror [`EditorView`](https://codemirror.net/docs/ref/#view.EditorView) (`undefined` until loaded) — see **Extending the editor** below |
| `undo()` / `redo()` / `canUndo()` / `canRedo()` | history control |
| `tjsAutocomplete` | runtime-value autocomplete hooks (tjs mode) — see below |
| `change` event | fires when the text changes; `event.detail.value` is the new text |

In `tjs`/`ajs` mode the editor loads tjs-lang's CodeMirror language and completion
source (if `tjs-lang` is installed — it's an optional peer). Set `tjsAutocomplete`
to a `TjsAutocompleteConfig` and completion will suggest the **real members of live
runtime values** — including proxy members no static analysis can see:

```typescript
codeEl.tjsAutocomplete = { getLiveBindings: () => ({ app, elements }) }
```

## Selective revert

`showDiff(on)` shows a read-only diff. Set `diffResolvable` first and the overlay becomes a
review surface instead: every change carries keep/revert buttons, defaulting to **keep**, and
whatever you leave alone survives. This is what `<tosi-example>`'s **View changes** uses — you
tried four things and three worked, so revert the one you regret rather than all four.

The choices are applied when the diff **closes**, not as you click, and a `change` event fires
if the text moved. That is deliberate: writing each choice straight back into `value` would
feed the new text into the overlay's `modified`, and `<tosi-diff>` resets its decisions when
either input changes — so live application would wipe the choices making it and renumber the
hunks under the pointer.

```typescript
codeEl.original = savedSource
codeEl.diffResolvable = true
codeEl.diffOriginalLabel = 'Source'
codeEl.diffModifiedLabel = 'Yours'
codeEl.showDiff(true)
// …user reverts a hunk or two…
codeEl.showDiff(false)   // codeEl.value now reflects their choices
```

## Bundling

CodeMirror is a **lazy chunk**: with a bundler (ESM), a page that never uses
`<tosi-code>` doesn't load it. **This is not true of the IIFE** (`dist/iife.js`) —
bun's IIFE format cannot code-split, so CodeMirror is inlined there. That is a
deliberate trade: the doc-system's editor (and its save-to-source flow) is the
point of the IIFE, so it carries the editor. It costs ~376KB gzipped, up from
~118KB in 1.6.x.

## Migrating from the ACE editor (pre-1.7)

1.7 replaced ACE with CodeMirror 6. `value`, `original`/`showDiff()`, `mode` and
`disabled` are unchanged. Removed (each warns once, then no-ops):

| removed | replacement |
| --- | --- |
| `theme` | style with `--code-bg` / `--text-color` |
| `options` (ACE-shaped) | configure via `editor` (an `EditorView`) |
| `ace` | there is no ACE global; use `editor` |
| `editor.session.getUndoManager()` | `undo()` / `redo()` / `canUndo()` / `canRedo()` |

`editor` **changed type in place** — it was an ACE `Editor`, it is now a CodeMirror
`EditorView`. Code that reached into it needs revisiting; a grep for removed names
won't catch this one.

## Extending the editor

Import CodeMirror from **`tosijs-ui/codemirror`**, not from `@codemirror/*` directly:

```typescript
import { gutter, GutterMarker, StateField, StateEffect } from 'tosijs-ui/codemirror'

const view = codeEl.editor // undefined until the editor has loaded
view?.dispatch({ effects: StateEffect.appendConfig.of([myField, myGutter]) })
```

**This matters more than it looks.** CodeMirror 6 keys facets, `StateField`s and gutters by
**object identity**, not by module name. If your `@codemirror/view` resolves to a different
copy than the one `<tosi-code>` uses — which a package manager will happily arrange when the
versions don't dedupe — the view **silently ignores** your extension. No error, no warning;
the gutter simply never renders, and every reading of your code says it should.

The re-export removes that failure by construction: there is only ever one copy, because it is
the one this package resolves. Nothing to pin, no `overrides` to write.

Only `@codemirror/state` and `@codemirror/view` are re-exported — the two you need to extend a
view. The language, lint and search packages are internal composition details; ask if you need
one exposed.
