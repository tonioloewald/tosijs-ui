/**
 * Unit coverage for the ACE → CodeMirror 6 migration (1.7).
 *
 * This is the ONLY lane CI runs, and before this file the headline breaking change
 * of the release had zero coverage in it: `smoke.test.ts` only asserted
 * `instanceof HTMLElement` and never awaited the lazy CodeMirror chunk, the
 * code-editor doc page has no ```test blocks (so the haltija tier never touches it),
 * and `tests/code-editor.pw.ts` only runs when a human has `bun start` up.
 *
 * CodeMirror does mount under happy-dom, so the editor contract is testable here.
 */
import { test, expect, describe, beforeEach } from 'bun:test'
import { codeEditor, CodeEditor } from './code-editor'

// The editor is a lazy dynamic import; give it a turn to resolve and mount.
async function mounted(el: CodeEditor): Promise<CodeEditor> {
  for (let i = 0; i < 50 && el.editor === undefined; i++) {
    await new Promise((r) => setTimeout(r, 10))
  }
  return el
}

describe('<tosi-code> (CodeMirror 6)', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  test('mounts CodeMirror and round-trips value', async () => {
    const el = codeEditor({ mode: 'javascript' }) as CodeEditor
    el.value = 'const a = 1'
    document.body.append(el)
    await mounted(el)

    expect(el.editor).toBeDefined()
    expect(el.value).toBe('const a = 1')

    el.value = 'const b = 2'
    expect(el.value).toBe('const b = 2')
  })

  test('undo/redo history is exposed as methods (not via the raw editor)', async () => {
    const el = codeEditor() as CodeEditor
    el.value = 'first'
    document.body.append(el)
    await mounted(el)

    // Undo history tracks USER edits. It used to be exercised here with `el.value =
    // 'second'`, but a programmatic set is no longer undoable — loading a document is
    // not an edit you Ctrl+Z back out of (see "the `change` event" tests below). So
    // make a real edit, the way a user does.
    expect(el.canUndo()).toBe(false)
    el.editor!.dispatch({
      changes: { from: 0, to: el.editor!.state.doc.length, insert: 'second' },
    })
    expect(el.canUndo()).toBe(true)

    el.undo()
    expect(el.value).toBe('first')
    expect(el.canRedo()).toBe(true)
    el.redo()
    expect(el.value).toBe('second')
  })

  test('disabled maps to CodeMirror readOnly', async () => {
    const el = codeEditor({ disabled: true }) as CodeEditor
    document.body.append(el)
    await mounted(el)
    expect(el.editor!.state.readOnly).toBe(true)

    el.disabled = false
    await new Promise((r) => setTimeout(r, 20))
    expect(el.editor!.state.readOnly).toBe(false)
  })

  // Regression for the 1.7 leak: CmHandle.destroy() existed but had ZERO call sites,
  // so every <tosi-code> outlived its element — pinned by a per-editor MutationObserver
  // on document.body. A doc page mounts ~20 editors, so each SPA navigation leaked all
  // of them, and every darkmode toggle then dispatched into every editor ever created.
  test('disconnecting destroys the editor and preserves the text', async () => {
    const el = codeEditor() as CodeEditor
    el.value = 'keep me'
    document.body.append(el)
    await mounted(el)
    expect(el.editor).toBeDefined()

    el.remove()
    // The EditorView is gone…
    expect(el.editor).toBeUndefined()
    // …but the text survives (it must not fall back to a stale pre-edit value).
    expect(el.value).toBe('keep me')
  })

  test('re-connecting rebuilds a working editor with the retained text', async () => {
    const el = codeEditor() as CodeEditor
    el.value = 'round trip'
    document.body.append(el)
    await mounted(el)

    el.remove()
    expect(el.editor).toBeUndefined()

    document.body.append(el)
    await mounted(el)
    expect(el.editor).toBeDefined()
    expect(el.value).toBe('round trip')
  })

  // ── The lazy-load window ──────────────────────────────────────────────────────
  // Every other test here awaits the mount, which is exactly why the disconnect race
  // slipped through. These deliberately do NOT await it: the chunk fetch is async and
  // wide open on a cold load, and doc-browser navigation removes editors mid-flight.

  test('remove-before-mount does not build an orphan editor', async () => {
    const el = codeEditor() as CodeEditor
    document.body.append(el)
    el.remove() // still in the pre-load window — the chunk has not resolved
    await mounted(el)

    // A stale load that mounted anyway would build an EditorView into a detached
    // shadow root, with no disconnectedCallback left to ever destroy it.
    expect(el.editor).toBeUndefined()
    expect(el.querySelectorAll('.cm-editor').length).toBe(0)
    expect(el.shadowRoot?.querySelectorAll('.cm-editor').length ?? 0).toBe(0)
  })

  test('remove-then-readd before mount leaves exactly ONE editor', async () => {
    const el = codeEditor() as CodeEditor
    el.value = 'const a = 1'
    document.body.append(el)
    el.remove()
    document.body.append(el) // second connect, second load, first still in flight
    await mounted(el)

    // The stale load must not mount alongside the live one: two views in the host with
    // `_handle` pointing only at the second orphans the first (and its darkmode
    // listener) forever — the very leak disconnectedCallback exists to prevent.
    const views = el.shadowRoot?.querySelectorAll('.cm-editor').length ?? 0
    expect(views).toBe(1)
    expect(el.editor).toBeDefined()
    expect(el.value).toBe('const a = 1')
  })

  // ── Pre-hydration access ──────────────────────────────────────────────────────

  test('reading showingDiff before insertion does not brick the editor', async () => {
    const el = codeEditor() as CodeEditor
    // tosijs's `parts` proxy caches its query root on first access, so a pre-hydration
    // probe used to root it at the light-DOM element permanently — after which
    // `this.parts.host` throws and CodeMirror never mounts at all.
    expect(el.showingDiff).toBe(false)

    el.value = 'const a = 1'
    document.body.append(el)
    await mounted(el)

    expect(el.editor).toBeDefined()
    expect(el.value).toBe('const a = 1')
  })

  test('showDiff() before insertion is replayed after hydration, not dropped', async () => {
    const el = codeEditor() as CodeEditor
    el.original = 'const a = 1'
    el.value = 'const a = 2'
    el.showDiff(true) // pre-hydration: used to be silently dropped

    document.body.append(el)
    await mounted(el)

    expect(el.editor).toBeDefined()
    expect(el.showingDiff).toBe(true)
    expect(el.shadowRoot?.querySelector('tosi-diff')).toBeTruthy()
  })

  // The removed ACE surface must fail loudly-but-safely, not silently no-op.
  test('removed ACE members (theme/options/ace) warn instead of throwing', async () => {
    const el = codeEditor() as CodeEditor
    document.body.append(el)
    await mounted(el)

    const warnings: string[] = []
    const original = console.warn
    console.warn = (...args: unknown[]) => warnings.push(args.join(' '))
    try {
      ;(el as any).theme = 'ace/theme/monokai'
      ;(el as any).options = { fontSize: 14 }
      expect((el as any).ace).toBeUndefined()
    } finally {
      console.warn = original
    }
    expect(warnings.length).toBeGreaterThan(0)
    expect(warnings.join('\n')).toContain('removed in tosijs-ui 1.7')
  })
})

describe('the `change` event means the USER changed it', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  test('a programmatic `value` set does NOT fire `change`', async () => {
    // The documented contract is `code.addEventListener('change', e => save(e.detail.value))`.
    // If merely LOADING a document fires it, every app that populates an editor records a
    // spurious save / dirty-flag on open.
    const el = codeEditor({ mode: 'javascript' }) as CodeEditor
    document.body.append(el)
    await mounted(el)

    let fired = 0
    el.addEventListener('change', () => (fired += 1))
    el.value = 'const loadedFromDisk = 1'
    await new Promise((r) => setTimeout(r, 20))

    expect(el.value).toBe('const loadedFromDisk = 1') // it DID change the doc…
    expect(fired).toBe(0) // …but it was not the user
  })

  test('a read-only editor never fires `change` when written to', async () => {
    // `EditorState.readOnly` gates USER input, not `view.dispatch` — so a disabled
    // editor happily emitted `change`. The library writes into a read-only *output*
    // editor after every example run.
    const el = codeEditor({ mode: 'javascript', disabled: true }) as CodeEditor
    document.body.append(el)
    await mounted(el)

    let fired = 0
    el.addEventListener('change', () => (fired += 1))
    el.value = 'the example output'
    await new Promise((r) => setTimeout(r, 20))

    expect(fired).toBe(0)
  })

  test('a real user edit DOES fire `change` — the fix did not mute the event', async () => {
    const el = codeEditor({ mode: 'javascript' }) as CodeEditor
    document.body.append(el)
    await mounted(el)

    const detail: string[] = []
    el.addEventListener('change', (e) =>
      detail.push((e as CustomEvent).detail.value)
    )
    // Type, the way a user does: a CM transaction with no programmatic annotation.
    el.editor!.dispatch({ changes: { from: 0, insert: 'typed()' } })
    await new Promise((r) => setTimeout(r, 20))

    expect(detail).toEqual(['typed()'])
  })

  test('a programmatic set is not undoable — loading a document is not an edit', async () => {
    const el = codeEditor({ mode: 'javascript' }) as CodeEditor
    document.body.append(el)
    await mounted(el)
    el.value = 'const loaded = 1'
    await new Promise((r) => setTimeout(r, 20))
    expect(el.canUndo()).toBe(false)
  })
})

describe('mode="tjs" — the headline 1.7 feature', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  // The failure mode here is a SILENT no-op: loadTjsExtension() swallows every error
  // and returns null by design, and its guard is `typeof mod.tjsEditorExtension ===
  // 'function'` — so an upstream export RENAME returns null without even throwing.
  // Every tjs editor on the doc site then degrades to plain TypeScript highlighting
  // with no autocomplete, and all three test lanes stay green. Nothing else covers this.

  test('tjs-lang still exports tjsEditorExtension (an upstream rename would be silent)', async () => {
    const mod = await import('tjs-lang/editors/codemirror')
    expect(typeof (mod as any).tjsEditorExtension).toBe('function')
  })

  test('loadTjsExtension() actually returns an extension, not null', async () => {
    const { loadTjsExtension } = await import('./code-editor-cm')
    expect(await loadTjsExtension({})).not.toBe(null)
  })

  test('a tjs editor really applies the tjs language extension', async () => {
    const el = codeEditor({ mode: 'tjs' }) as CodeEditor
    el.value = 'const x = 1'
    document.body.append(el)
    await mounted(el)
    for (let i = 0; i < 50 && !el.tjsExtensionApplied; i++) {
      await new Promise((r) => setTimeout(r, 10))
    }
    expect(el.tjsExtensionApplied).toBe(true)
  })

  test('ajs mode applies it too', async () => {
    const el = codeEditor({ mode: 'ajs' }) as CodeEditor
    document.body.append(el)
    await mounted(el)
    for (let i = 0; i < 50 && !el.tjsExtensionApplied; i++) {
      await new Promise((r) => setTimeout(r, 10))
    }
    expect(el.tjsExtensionApplied).toBe(true)
  })

  test('a NON-tjs editor does not load it', async () => {
    const el = codeEditor({ mode: 'javascript' }) as CodeEditor
    document.body.append(el)
    await mounted(el)
    await new Promise((r) => setTimeout(r, 100))
    expect(el.tjsExtensionApplied).toBe(false)
  })

  test('tjs falls back to readable TypeScript highlighting synchronously', async () => {
    // The async tjs upgrade may never arrive (tjs-lang is an optional peer). The editor
    // must still be usable in the meantime — not blank, not plain text.
    const { languageForMode } = await import('./code-editor-cm')
    expect(languageForMode('tjs')).toBeDefined()
    expect(languageForMode('ajs')).toBeDefined()
  })
})
