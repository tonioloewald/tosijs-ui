/*#
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
| `editor` | the underlying CodeMirror [`EditorView`](https://codemirror.net/docs/ref/#view.EditorView) (`undefined` until loaded) |
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
*/

/*{ "parent": "Components" }*/

import {
  Component as WebComponent,
  ElementCreator,
  elements,
  PartsMap,
  varDefault,
} from 'tosijs'
import { tosiDiff, TosiDiff } from './diff'
import type { CmHandle, TjsAutocompleteConfig } from './code-editor-cm'
export type { TjsAutocompleteConfig } from './code-editor-cm'

const { div } = elements

// Warn once per removed member, not once per access — a live-example page holds
// dozens of editors and a render-loop read would otherwise flood the console.
const warned = new Set<string>()
const warnRemoved = (member: string, advice: string): void => {
  if (warned.has(member)) return
  warned.add(member)
  console.warn(
    `<tosi-code>.${member} was removed in tosijs-ui 1.7 (the editor is now CodeMirror 6, not ACE) — ${advice}. See CHANGELOG 1.7.0.`
  )
}

interface CodeEditorParts extends PartsMap {
  host: HTMLDivElement
  diffHost: HTMLDivElement
}

export class CodeEditor extends WebComponent<CodeEditorParts> {
  static preferredTagName = 'tosi-code'

  private source = ''
  private _handle: CmHandle | undefined
  private _loadPromise: Promise<CmHandle | undefined> | undefined
  // Bumped on every connect. The lazy chunk resolves asynchronously, so by the time it
  // does, this element may have been removed — or removed and re-added, starting a newer
  // load. Mounting a stale load would build an EditorView nothing ever destroys.
  private _loadGeneration = 0
  private _appliedMode = ''
  private _appliedDisabled: boolean | undefined
  private _tjsAutocomplete: TjsAutocompleteConfig | undefined

  /**
   * Runtime-introspection hooks for tjs autocomplete (`getLiveBindings` /
   * `getMembers`) — lets completion suggest the REAL members of live values (e.g.
   * a tosijs proxy or a DOM element) that static analysis can't see. Only used in
   * tjs mode; setting it re-applies the tjs extension so it takes effect live.
   */
  get tjsAutocomplete(): TjsAutocompleteConfig | undefined {
    return this._tjsAutocomplete
  }
  set tjsAutocomplete(config: TjsAutocompleteConfig | undefined) {
    this._tjsAutocomplete = config
    if (this._handle && this.isTjsMode()) this.applyTjsExtension()
  }

  get value(): string {
    return this._handle ? this._handle.getValue() : this.source
  }

  set value(text: string) {
    if (this._handle) {
      this._handle.setValue(text)
    } else {
      this.source = text
    }
  }

  // Baseline for `showDiff()` — the version to diff the current `value` against.
  // Defaults to the current value (no diff) until a caller sets it.
  private _original: string | undefined
  get original(): string {
    return this._original ?? this.value
  }
  set original(text: string) {
    this._original = text
  }

  // Diff overlay — built only on the editor's public surface (`value` + `original`)
  // and the tosi-diff component, never the underlying editor's API, so it stays
  // editor-agnostic.
  //
  // It lives in the SHADOW root (the `diffHost` part), not the light DOM. Under the
  // old Ace editor this component had no `content`, so tosijs's default `slot()`
  // filled the shadow root and Ace mounted into the light DOM — a light-DOM overlay
  // projected through that slot. CodeMirror mounts into `[part=host]` inside the
  // shadow root, and this component now declares its own `content`, so there is no
  // slot: `this.append(overlay)` would put it in the light DOM where nothing renders
  // it. (Re-adding a slot is NOT the fix — it would also project the element's
  // textContent, i.e. the initial code, and double-render it under the editor.)
  private diffOverlay: TosiDiff | undefined

  // Set once hydration has actually happened (end of connectedCallback).
  //
  // This CANNOT be a `try { this.parts.x } catch` probe, which is what it used to be.
  // tosijs's `parts` proxy caches its query root on FIRST access — so touching it before
  // hydration permanently roots the proxy at the light-DOM element, and every later
  // `this.parts.*` throws, including the `this.parts.host` that mounts CodeMirror. The
  // editor then never mounts at all. Merely reading `el.showingDiff` on a constructed,
  // not-yet-inserted element was enough to brick it — silently, and unrecoverably.
  private _partsHydrated = false

  // A showDiff() call made before hydration, replayed once we're ready (rather than
  // silently dropped, which is what used to happen).
  private _pendingDiff: boolean | undefined

  private get partsReady(): boolean {
    return this._partsHydrated
  }

  get showingDiff(): boolean {
    if (!this.partsReady) return this._pendingDiff ?? false
    return !this.parts.diffHost.hidden
  }

  showDiff(on: boolean): void {
    if (!this.partsReady) {
      this._pendingDiff = on
      return
    }
    const { diffHost } = this.parts
    if (on) {
      if (this.diffOverlay === undefined) {
        this.diffOverlay = tosiDiff()
        diffHost.append(this.diffOverlay)
      }
      this.diffOverlay.original = this.original
      this.diffOverlay.modified = this.value
    }
    diffHost.hidden = !on
  }

  static initAttributes = {
    mode: 'javascript',
    disabled: false,
  }

  role = 'code editor'

  /** The underlying CodeMirror EditorView (undefined until loaded). */
  get editor(): CmHandle['view'] | undefined {
    return this._handle?.view
  }

  // ── Removed in 1.7 (ACE → CodeMirror 6) ────────────────────────────────────
  // `^1.6.x` resolves 1.7.0, so existing consumers auto-upgrade into this. Left as
  // warn-once no-ops rather than simply deleted, so `theme`/`options`/`ace` fail
  // with an actionable message instead of silently doing nothing (or, for `ace`,
  // a bare `TypeError` on undefined). See CHANGELOG 1.7.0 → Breaking.

  /** @deprecated Removed in 1.7 — CodeMirror themes via `--code-bg`/`--text-color`. */
  get theme(): string {
    warnRemoved(
      'theme',
      'style the editor with --code-bg / --text-color instead'
    )
    return ''
  }
  set theme(_: string) {
    warnRemoved(
      'theme',
      'style the editor with --code-bg / --text-color instead'
    )
  }

  /** @deprecated Removed in 1.7 — ACE-shaped options have no CodeMirror equivalent. */
  get options(): Record<string, unknown> {
    warnRemoved(
      'options',
      'configure CodeMirror via the `editor` (EditorView) instead'
    )
    return {}
  }
  set options(_: Record<string, unknown>) {
    warnRemoved(
      'options',
      'configure CodeMirror via the `editor` (EditorView) instead'
    )
  }

  /** @deprecated Removed in 1.7 — there is no ACE global; use `editor` (an EditorView). */
  get ace(): undefined {
    warnRemoved('ace', 'use `editor`, which is now a CodeMirror EditorView')
    return undefined
  }

  // History control — so consumers use these instead of reaching into `editor`.
  undo(): void {
    this._handle?.undo()
  }
  redo(): void {
    this._handle?.redo()
  }
  canUndo(): boolean {
    return this._handle?.canUndo() ?? false
  }
  canRedo(): boolean {
    return this._handle?.canRedo() ?? false
  }

  // `diffHost` starts hidden — an always-present absolutely-positioned overlay would
  // otherwise sit on top of the editor and swallow every click.
  content = () => [
    div({ part: 'host' }),
    div({ part: 'diffHost', hidden: true }),
  ]

  static shadowStyleSpec = {
    ':host': {
      display: 'block',
      position: 'relative',
      width: '100%',
      height: '100%',
    },
    '[part="host"]': { height: '100%' },
    '[part="diffHost"]': {
      position: 'absolute',
      inset: '0',
      zIndex: '5',
      overflow: 'auto',
      background: varDefault.tosiDiffBg(varDefault.background('#fff')),
    },
    '.cm-editor': { height: '100%' },
    '.cm-scroller': {
      outline: 'none',
      fontFamily: "Menlo, Monaco, Consolas, 'Courier New', monospace",
    },
  }

  onResize() {
    this._handle?.refresh()
  }

  connectedCallback() {
    super.connectedCallback()
    // super.connectedCallback() hydrates, so `this.parts` is safe from here on.
    this._partsHydrated = true

    if (this.source === '') {
      this.value = this.textContent !== null ? this.textContent.trim() : ''
    }

    // Replay a showDiff() that arrived before we were hydrated.
    if (this._pendingDiff !== undefined) {
      const pending = this._pendingDiff
      this._pendingDiff = undefined
      this.showDiff(pending)
    }

    if (this._loadPromise === undefined) {
      // Lazy chunk — CodeMirror only enters the bundle here, on first editor use.
      const generation = ++this._loadGeneration
      this._loadPromise = import('./code-editor-cm').then(
        ({ createCmEditor }) => {
          // The chunk fetch is async, and the pre-load window is WIDE on a cold fetch —
          // doc-browser navigation and closeEditor() both remove editors mid-flight. If we
          // mounted regardless:
          //   append → remove          → an EditorView built into a detached shadow root,
          //                              with no disconnectedCallback left to destroy it.
          //   append → remove → append → TWO views in the host; `_handle` points only at
          //                              the second, so the first (and its darkmode
          //                              listener) is retained forever.
          // That is precisely the leak disconnectedCallback exists to prevent, relocated
          // into the load window. Bail if a newer connect superseded us, or we're detached.
          if (generation !== this._loadGeneration || !this.isConnected)
            return undefined
          const handle = createCmEditor(this.parts.host, {
            value: this.source,
            mode: this.mode,
            readOnly: this.disabled,
            root: this.shadowRoot ?? undefined,
            onChange: (value) =>
              this.dispatchEvent(
                new CustomEvent('change', { detail: { value } })
              ),
          })
          this._handle = handle
          this._appliedMode = this.mode
          this._appliedDisabled = this.disabled
          this.applyTjsExtension()
          return handle
        }
      )
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    // Without this, `CmHandle.destroy()` has no call sites: the EditorView (and its
    // darkmode listener) outlive the element, so every doc-page navigation leaked all
    // ~20 editors on the page.
    if (this._handle) {
      // Preserve the live text first — `value` falls back to `source` once the handle
      // is gone, and `source` would otherwise hold a stale pre-edit value.
      this.source = this._handle.getValue()
      this._handle.destroy()
      this._handle = undefined
    }
    // Re-connecting rebuilds the editor (a destroyed view can't be reused).
    this._loadPromise = undefined
    this._appliedMode = ''
    this._appliedDisabled = undefined
    // NB: do NOT clear `diffOverlay` — hydrate() runs once, so the shadow DOM (and the
    // overlay inside `diffHost`) survives disconnect. Clearing it would append a second
    // overlay on reconnect.
  }

  private isTjsMode(): boolean {
    return this.mode === 'tjs' || this.mode === 'ajs'
  }

  /**
   * When in tjs mode, lazily upgrade the editor to tjs-lang's CodeMirror language +
   * autocomplete. No-op (keeps TS highlighting) if not tjs, if tjs-lang isn't
   * installed, or if the mode/handle changed before the async load resolved.
   */
  private applyTjsExtension(): void {
    const handle = this._handle
    if (!handle || !this.isTjsMode()) return
    import('./code-editor-cm')
      .then(({ loadTjsExtension }) =>
        loadTjsExtension(this._tjsAutocomplete ?? {})
      )
      .then((ext) => {
        if (ext && this._handle === handle && this.isTjsMode()) {
          handle.setLanguageExtension(ext)
        }
      })
  }

  render(): void {
    super.render()

    if (this._handle) {
      if (this.disabled !== this._appliedDisabled) {
        this._handle.setReadOnly(this.disabled)
        this._appliedDisabled = this.disabled
      }
      if (this.mode !== this._appliedMode) {
        this._handle.setMode(this.mode)
        this._appliedMode = this.mode
        this.applyTjsExtension()
      }
    }
  }
}

export const codeEditor =
  CodeEditor.elementCreator() as ElementCreator<CodeEditor>
