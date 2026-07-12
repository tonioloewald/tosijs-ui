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

    expect(el.canUndo()).toBe(false)
    el.value = 'second'
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
