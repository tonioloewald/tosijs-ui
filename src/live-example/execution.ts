import { elements } from 'tosijs'
import {
  describeError,
  diagnoseConstruction,
  EXAMPLE_SOURCE_URL,
} from './error-location.js'
import { ExampleContext, TransformFn } from './types.js'
import {
  rewriteImports,
  AsyncFunction,
  contextParamNames,
} from './code-transform.js'

/*
Source of the example currently being run, so `describeError` can lift the offending line out
of it. Module-level and reset per run, mirroring the doc-test harness — an example runs to
completion (or throws) before the next one starts.
*/
let exampleSource: string | null = null

// Injected context name for the scope-capture callback (see `onScope`). Chosen to
// not collide with anything an example would plausibly declare.
const SCOPE_CAPTURE_VAR = '__tosiCaptureScope'

const { div } = elements

/**
 * Register web components in an iframe's customElements registry.
 *
 * Uses two strategies:
 * 1. Scans context exports for creator functions with a `tagName` property
 * 2. Scans the iframe HTML for any custom-element tags (contain a hyphen)
 *    and registers them from the main window's customElements registry
 */
export function registerComponentsInIframe(
  iframeWindow: Window,
  context: ExampleContext
): void {
  const iframeCustomElements = iframeWindow.customElements
  if (!iframeCustomElements) return

  const register = (tagName: string) => {
    if (!tagName || iframeCustomElements.get(tagName)) return
    const ComponentClass = customElements.get(tagName)
    if (ComponentClass) {
      try {
        iframeCustomElements.define(tagName, ComponentClass)
      } catch {
        // May fail if already defined — ignore
      }
    }
  }

  // Strategy 1: context exports with tagName (e.g. element creators)
  for (const lib of Object.values(context)) {
    if (lib && typeof lib === 'object') {
      for (const creator of Object.values(lib as Record<string, unknown>)) {
        if (typeof creator === 'function' && 'tagName' in creator) {
          register((creator as { tagName: string }).tagName)
        }
      }
    }
  }

  // Strategy 2: scan iframe DOM for unregistered custom-element tags
  const iframeDoc = iframeWindow.document
  if (iframeDoc) {
    const allElements = iframeDoc.querySelectorAll('*')
    for (const el of allElements) {
      const tag = el.tagName.toLowerCase()
      if (tag.includes('-')) {
        register(tag)
      }
    }
  }
}

export interface ExecutionOptions {
  html: string
  css: string
  js: string
  context: ExampleContext
  /**
   * The tjs/ts transpiler. Optional ONLY when `compiledJs` is supplied — then the
   * source is already transpiled and no transpiler is loaded or called.
   */
  transform?: TransformFn
  /**
   * Build-time transpiled JS for the source block (the bake — see
   * self-contained-examples-plan.md). When present it is run VERBATIM: the
   * `rewriteImports` + `transform` step is skipped entirely, so a page runs the
   * example without loading the tjs transpiler. Already equals
   * `transform(rewriteImports(js, contextKeys))`, so scope-capture still applies.
   */
  compiledJs?: string
  onError?: (error: Error) => void
  /**
   * Receives the example's top-level locals after a successful run, so tjs
   * autocomplete can introspect the REAL values (e.g. a `const app = tosi(…)`
   * proxy) the user just created. Captured in-run — no re-execution, so no
   * doubled side effects.
   */
  onScope?: (scope: Record<string, unknown>) => void
  /**
   * Receives an evaluator that runs source IN the example's own scope (the Console tab's
   * REPL): its top-level `const`/`let`/functions/imports are all reachable, and it returns the
   * completion value, as a browser console does. See `withReplHook`.
   */
  onRepl?: (
    evaluate: (source: string, helpers?: Record<string, unknown>) => unknown
  ) => void
  /**
   * The `console` the example's code sees (see example-console.ts). Injected as a parameter,
   * like `preview`, so it shadows the global for this run only. Omitted: the real console.
   */
  console?: Console
}

/*
Injected context name for the REPL hook (see withReplHook). The hook is a direct `eval` closure,
and a direct eval in a function de-optimises that whole scope (measured 1.5x slower on V8, 2.6x
on JSC for hot code) and keeps it alive until the next run. So the component asks for it only
once someone has used the REPL (1.16.4 review E1), never for a reader who doesn't.
*/
const REPL_HOOK_VAR = '__tosiReplHook'

/**
 * Give the Console tab's REPL the example's own scope.
 *
 * Prepends `__tosiReplHook((src) => eval(src));` to the example's body. A DIRECT `eval` inside
 * the example's function runs in that function's scope, so the closure can reach every
 * top-level binding — `const`, `let`, functions, rewritten imports — whenever the REPL calls
 * it, and returns the completion value (`const n = 2; n * 21` → 42), like a browser console.
 *
 * At the START, not the end: an example that returns early or throws would never reach an
 * epilogue. The closure is only CALLED later, after the bindings are initialised. On the same
 * line as the first line of code, so error line numbers still match the example's source.
 * (Scope capture, the alternative, needs the optional tjs-lang and only saw runs made with the
 * code panel already open, so `words` in the obvious first REPL input was undefined.)
 */
/** @internal */
export function withReplHook(
  prepared: { code: string; extraContext: Record<string, unknown> },
  onRepl?: (
    evaluate: (source: string, helpers?: Record<string, unknown>) => unknown
  ) => void
): { code: string; extraContext: Record<string, unknown> } {
  if (!onRepl) return prepared
  /*
  AFTER the directive prologue: a statement in front of `'use strict'` stops it being a
  directive, and the example silently ran sloppy (an undeclared assignment made a global
  instead of throwing). Still on the first line of the code, so line numbers don't move; the
  leading `;` ends a directive that has no semicolon of its own.
  */
  const prologue = prepared.code.match(DIRECTIVE_PROLOGUE)?.[0] ?? ''
  // the second parameter carries the REPL's helpers ($, $$) into the eval's scope
  const hook = `;${REPL_HOOK_VAR}((__tosiSrc, __tosiHelpers) => eval(__tosiSrc));`
  return {
    code: prologue + hook + prepared.code.slice(prologue.length),
    extraContext: { ...prepared.extraContext, [REPL_HOOK_VAR]: onRepl },
  }
}

/*
Leading string-literal statements: `'use strict'`, `"use asm"`, … each ended by `;` or a line
break. A string followed by anything else (`'abc'.length`) is an expression, not a directive,
so the lookahead stops there.
*/
const DIRECTIVE_PROLOGUE =
  /^(?:\s*(?:'[^'\n]*'|"[^"\n]*")[ \t]*(?:;|(?=\r?\n)))*/

/**
 * Append a scope-capture epilogue to already-transformed example code when a
 * consumer wants the run's locals. Returns the (possibly unchanged) code plus the
 * extra context entry to inject. The epilogue no-ops if the example binds nothing.
 */
export async function withScopeCapture(
  transformedCode: string,
  onScope?: (scope: Record<string, unknown>) => void
): Promise<{ code: string; extraContext: Record<string, unknown> }> {
  if (!onScope) return { code: transformedCode, extraContext: {} }
  // tjs-lang 0.10.x's real AST-based scope extractor (tjs-lang#10) — replaced our
  // hand-rolled scanner. Loaded via DYNAMIC import so the OPTIONAL `tjs-lang` peer
  // never enters the static live-example/doc-browser graph (a plain-`js` doc site
  // that omits the peer must still bundle): absent tjs-lang → skip capture, keep the
  // example running. Callers gate `onScope` to edit-time tjs/ts, so on the reader
  // path this import never fires. It emits `try { <captureVar>({ a, b }) } catch {}`,
  // the object-of-bindings contract onScope already expects.
  let scopeCaptureEpilogue: (source: string, captureVar: string) => string
  try {
    ;({ scopeCaptureEpilogue } = await import('tjs-lang/editors'))
  } catch {
    return { code: transformedCode, extraContext: {} }
  }
  const epilogue = scopeCaptureEpilogue(transformedCode, SCOPE_CAPTURE_VAR)
  if (!epilogue) return { code: transformedCode, extraContext: {} }
  return {
    code: transformedCode + epilogue,
    extraContext: { [SCOPE_CAPTURE_VAR]: onScope },
  }
}

interface BuiltExample {
  func: (...args: unknown[]) => Promise<unknown>
  values: unknown[]
}

/**
 * Build the example's function from its context, as parameters.
 *
 * The example console is one of those parameters, and a parameter cannot be redeclared:
 * an example with its own top-level `const console = …` (or `let a, console`, or
 * `const { console } = …`) is a SyntaxError with it, and ran fine before 1.16.2. So when
 * construction fails and `console` was injected, build again without it — the example keeps
 * its own console, and anything else that is really wrong fails the second build too and is
 * reported as before. The ENGINE decides what is a declaration; a regex got nested functions,
 * comments and destructuring wrong (1.16.2 re-review).
 */
function buildExample(
  // the AsyncFunction constructor, of this realm or an iframe's (typed `Function` either way)
  Ctor: any,
  context: Record<string, unknown>,
  body: string
): BuiltExample {
  const build = (ctx: Record<string, unknown>): BuiltExample => ({
    func: new Ctor(...contextParamNames(Object.keys(ctx)), body),
    values: Object.values(ctx),
  })
  try {
    return build(context)
  } catch (err) {
    if (!('console' in context) || (err as Error)?.name !== 'SyntaxError')
      throw err
    const { console: _injected, ...withoutConsole } = context
    return build(withoutConsole)
  }
}

/**
 * Execute code inline (directly in the page)
 */
export async function executeInline(
  options: ExecutionOptions & {
    exampleElement: HTMLElement
    styleElement: HTMLStyleElement
    widgetsElement: HTMLElement
  }
): Promise<HTMLElement> {
  const {
    html,
    css,
    js,
    context,
    transform,
    compiledJs,
    exampleElement,
    styleElement,
    widgetsElement,
    onError,
    onScope,
    onRepl,
    console: exampleConsole,
  } = options

  const preview = div({ class: 'preview' })
  preview.innerHTML = html
  styleElement.innerText = css

  const oldPreview = exampleElement.querySelector('.preview')
  if (oldPreview) {
    oldPreview.replaceWith(preview)
  } else {
    exampleElement.insertBefore(preview, widgetsElement)
  }

  try {
    const transformedCode =
      compiledJs ??
      (
        await transform!(rewriteImports(js, Object.keys(context)), {
          transforms: ['typescript'],
        })
      ).code

    const captured = await withScopeCapture(transformedCode, onScope)
    const { code: finalCode, extraContext } = withReplHook(captured, onRepl)
    const fullContext = {
      preview,
      ...(exampleConsole ? { console: exampleConsole } : {}),
      ...context,
      ...extraContext,
    }

    /*
    Tag the body so a thrown error's stack names the EXAMPLE rather than the bundle it is
    running inside. The doc-test path has always done this; the example path never did, which
    is why an example that threw reported a message with no line and a stack pointing at
    minified harness code.
    */
    const taggedCode = `${finalCode}\n//# sourceURL=${EXAMPLE_SOURCE_URL}`
    exampleSource = captured.code // the example as written: the REPL hook isn't its code

    let built: BuiltExample
    try {
      built = buildExample(AsyncFunction, fullContext, taggedCode)
    } catch (err) {
      /*
      Construction failed, so no user frame exists — say what was rejected instead.

      `cause` carries the original. `diagnoseConstruction` renders a readable message, but the
      engine's own error is the thing that names WHICH parameter it choked on, and dropping it
      is how a construction failure becomes "one synthetic test failure with a message nobody
      can grep for" — the shape reported in tosijs-ui#109.
      */
      throw new Error(
        diagnoseConstruction(
          err,
          contextParamNames(Object.keys(fullContext)),
          taggedCode,
          // @ts-expect-error AsyncFunction constructor typing
          (...args: string[]) => new AsyncFunction(...args)
        ),
        { cause: err }
      )
    }
    await built.func(...built.values)
  } catch (e) {
    console.error(e)
    // The EXAMPLE tag — this path runs example code, not a test block.
    const described = describeError(e, exampleSource, EXAMPLE_SOURCE_URL)
    preview.append(div({ class: 'preview-error' }, described))
    if (onError) onError(e as Error)
    else
      window.alert(
        `Error: ${described}, the console may have more information…`
      )
  }

  return preview
}

/**
 * Execute code in an isolated iframe
 */
export async function executeInIframe(
  options: ExecutionOptions & {
    exampleElement: HTMLElement
    widgetsElement: HTMLElement
  }
): Promise<HTMLElement | null> {
  const {
    html,
    css,
    js,
    context,
    transform,
    compiledJs,
    exampleElement,
    widgetsElement,
    onError,
    onScope,
    onRepl,
    console: exampleConsole,
  } = options

  // Create or reuse iframe
  let iframe = exampleElement.querySelector(
    'iframe.preview-iframe'
  ) as HTMLIFrameElement | null

  if (!iframe) {
    iframe = document.createElement('iframe')
    iframe.className = 'preview-iframe'
    iframe.style.cssText = 'width: 100%; height: 100%; border: none;'
    const oldPreview = exampleElement.querySelector('.preview')
    if (oldPreview) {
      oldPreview.replaceWith(iframe)
    } else {
      exampleElement.insertBefore(iframe, widgetsElement)
    }
  }

  const iframeDoc = iframe.contentDocument
  if (!iframeDoc) {
    console.error('Could not access iframe document')
    return null
  }

  const iframeWindow = iframe.contentWindow as Window & {
    tosijs?: unknown
    tosijsui?: unknown
  }

  // Copy libraries to iframe window
  if (context['tosijs']) {
    iframeWindow.tosijs = context['tosijs']
  }
  if (context['tosijs-ui']) {
    iframeWindow.tosijsui = context['tosijs-ui']
  }

  // Write HTML and CSS to iframe
  iframeDoc.open()
  iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; }
    .preview { height: 100%; position: relative; }
    ${css}
  </style>
</head>
<body>
  <div class="preview">${html}</div>
</body>
</html>`)
  iframeDoc.close()

  // Register web components in iframe
  registerComponentsInIframe(iframeWindow, context)

  const preview = iframeDoc.querySelector('.preview') as HTMLElement
  if (!preview) {
    console.error('Could not find preview element in iframe')
    return null
  }

  try {
    const transformedCode =
      compiledJs ??
      (
        await transform!(rewriteImports(js, Object.keys(context)), {
          transforms: ['typescript'],
        })
      ).code

    const captured = await withScopeCapture(transformedCode, onScope)
    const { code: finalCode, extraContext } = withReplHook(captured, onRepl)
    // Execute JS in iframe context
    const fullContext = {
      preview,
      ...(exampleConsole ? { console: exampleConsole } : {}),
      ...context,
      ...extraContext,
    }

    // Create AsyncFunction in iframe's context
    const IframeAsyncFunction = (
      iframeWindow as Window & { eval: typeof eval }
    ).eval('(async () => {}).constructor')

    const built = buildExample(IframeAsyncFunction, fullContext, finalCode)
    await built.func(...built.values)
  } catch (e) {
    console.error(e)
    const errorDiv = iframeDoc.createElement('div')
    errorDiv.className = 'preview-error'
    errorDiv.textContent = String((e as Error).message || e)
    preview.append(errorDiv)
    if (onError) onError(e as Error)
    else window.alert(`Error: ${e}, the console may have more information…`)
  }

  return preview
}
