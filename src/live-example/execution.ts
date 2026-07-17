import { elements } from 'tosijs'
import { scopeCaptureEpilogue } from 'tjs-lang/editors'
import { ExampleContext, TransformFn } from './types'
import { rewriteImports, AsyncFunction, contextVarName } from './code-transform'

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
}

/**
 * Append a scope-capture epilogue to already-transformed example code when a
 * consumer wants the run's locals. Returns the (possibly unchanged) code plus the
 * extra context entry to inject. The epilogue no-ops if the example binds nothing.
 */
export function withScopeCapture(
  transformedCode: string,
  onScope?: (scope: Record<string, unknown>) => void
): { code: string; extraContext: Record<string, unknown> } {
  if (!onScope) return { code: transformedCode, extraContext: {} }
  // tjs-lang 0.10.x's real AST-based scope extractor (tjs-lang#10) — replaced our
  // hand-rolled scanner. It emits `try { <captureVar>({ a, b, … }) } catch {}`, the
  // same object-of-bindings contract onScope already expects. The `tjs-lang/editors`
  // entry is ~5KB and self-contained (no acorn), so this is a negligible bundle add.
  const epilogue = scopeCaptureEpilogue(transformedCode, SCOPE_CAPTURE_VAR)
  if (!epilogue) return { code: transformedCode, extraContext: {} }
  return {
    code: transformedCode + epilogue,
    extraContext: { [SCOPE_CAPTURE_VAR]: onScope },
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

    const { code: finalCode, extraContext } = withScopeCapture(
      transformedCode,
      onScope
    )
    const fullContext = { preview, ...context, ...extraContext }

    const contextKeys = Object.keys(fullContext).map(contextVarName)
    const contextValues = Object.values(fullContext)

    // @ts-expect-error AsyncFunction constructor typing
    const func = new AsyncFunction(...contextKeys, finalCode)
    await func(...contextValues)
  } catch (e) {
    console.error(e)
    preview.append(
      div({ class: 'preview-error' }, String((e as Error).message || e))
    )
    if (onError) onError(e as Error)
    else window.alert(`Error: ${e}, the console may have more information…`)
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

    const { code: finalCode, extraContext } = withScopeCapture(
      transformedCode,
      onScope
    )
    // Execute JS in iframe context
    const fullContext = { preview, ...context, ...extraContext }

    // Create AsyncFunction in iframe's context
    const IframeAsyncFunction = (
      iframeWindow as Window & { eval: typeof eval }
    ).eval('(async () => {}).constructor')

    const contextKeys = Object.keys(fullContext).map(contextVarName)
    const contextValues = Object.values(fullContext)

    const func = new IframeAsyncFunction(...contextKeys, finalCode)
    await func(...contextValues)
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
