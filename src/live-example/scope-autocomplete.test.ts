/**
 * End-to-end guard for B2 (runtime-value autocomplete): an example's top-level
 * locals, captured in-run via the scope-capture epilogue, must reach tjs-lang's
 * REAL completion source as live bindings — so `app.` / `app.items.` suggest the
 * value's actual members. Exercises the whole chain headlessly (the completion
 * source is DOM-free): extract → capture epilogue → AsyncFunction → liveBindings →
 * tjsCompletionSource.
 */
import { test, expect, describe } from 'bun:test'
import { EditorState } from '@codemirror/state'
import { CompletionContext } from '@codemirror/autocomplete'
import { tjsCompletionSource } from 'tjs-lang/editors/codemirror'
import { tosi } from 'tosijs'
import {
  AsyncFunction,
  extractTopLevelBindingNames,
  buildScopeCapture,
  contextVarName,
} from './code-transform'

// Mirror how live-example runs an example and captures its top-level locals.
async function runAndCapture(
  js: string,
  context: Record<string, unknown>
): Promise<Record<string, unknown>> {
  let scope: Record<string, unknown> = {}
  const capture = (s: Record<string, unknown>) => {
    scope = s
  }
  const epilogue = buildScopeCapture(
    extractTopLevelBindingNames(js),
    '__tosiCaptureScope'
  )
  const fullContext = { __tosiCaptureScope: capture, ...context }
  const keys = Object.keys(fullContext).map(contextVarName)
  const values = Object.values(fullContext)
  const fn = new AsyncFunction(...keys, js + epilogue)
  await fn(...values)
  return scope
}

const labelsAfter = async (
  source: string,
  liveBindings: Record<string, unknown>
): Promise<string[]> => {
  const state = EditorState.create({ doc: source })
  const ctx = new CompletionContext(state, source.length, true)
  const result = await tjsCompletionSource({ getLiveBindings: () => liveBindings })(ctx)
  return (result?.options ?? []).map((o) => o.label)
}

describe('live-example scope capture → tjs autocomplete', () => {
  test('captures a destructured tosijs proxy and a plain local', async () => {
    // `const { app } = tosi(...)` is the common shape; `count` is a plain local.
    const js =
      'const { app } = tosi({ app: { items: [1, 2, 3], user: { name: "Ada" } } })\n' +
      'const count = app.items.value.length\n'
    const scope = await runAndCapture(js, { tosi })
    expect('app' in scope).toBe(true)
    expect(scope.count).toBe(3)
  })

  test('a captured local resolves to its real members in completion', async () => {
    const js = 'const { app } = tosi({ app: { items: [], newItem: "" } })\n'
    const scope = await runAndCapture(js, { tosi })
    const labels = await labelsAfter('app.', scope)
    expect(labels).toContain('items')
    expect(labels).toContain('newItem')
  })

  test('nested member path resolves through the captured value', async () => {
    const js = 'const { app } = tosi({ app: { items: [1, 2] } })\n'
    const scope = await runAndCapture(js, { tosi })
    const labels = await labelsAfter('app.items.', scope)
    // array members surface (proxy-forwarded), e.g. push/map
    expect(labels).toContain('push')
  })
})
