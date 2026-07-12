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
import { AsyncFunction, contextVarName } from './code-transform'
import { withScopeCapture } from './execution'

/**
 * Run an example the way live-example does, and return the locals it captured.
 *
 * This drives the SHIPPED `withScopeCapture` (the same call `executeInline` and
 * `executeInIframe` make) rather than re-deriving the epilogue here. An earlier
 * version of this test rebuilt the pipeline by hand — including a hard-coded copy of
 * the private capture-variable name — so it imported nothing from `execution.ts` and
 * no edit to the production chain could make it fail. Deleting the `withScopeCapture`
 * call outright would have kept it green. If you find yourself re-implementing the
 * thing under test, the guard is guarding nothing.
 */
async function runAndCapture(
  js: string,
  context: Record<string, unknown>
): Promise<Record<string, unknown>> {
  let scope: Record<string, unknown> = {}
  const { code, extraContext } = withScopeCapture(js, (s) => {
    scope = s
  })
  const fullContext = { ...extraContext, ...context }
  const keys = Object.keys(fullContext).map(contextVarName)
  const values = Object.values(fullContext)
  const fn = new AsyncFunction(...keys, code)
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
