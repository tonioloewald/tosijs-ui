import { elements } from 'tosijs'
import { ExampleContext, TransformFn } from './types'
import { rewriteImports, AsyncFunction } from './code-transform'

const { div } = elements

/**
 * Register web components in an iframe's customElements registry
 */
export function registerComponentsInIframe(
  iframeWindow: Window,
  context: ExampleContext
): void {
  const iframeCustomElements = iframeWindow.customElements
  if (!iframeCustomElements) return

  const tosijsui = context['tosijs-ui']
  if (!tosijsui) return

  for (const [, creator] of Object.entries(tosijsui)) {
    if (typeof creator === 'function' && 'tagName' in creator) {
      const tagName = (creator as { tagName: string }).tagName
      if (tagName && !iframeCustomElements.get(tagName)) {
        const ComponentClass = customElements.get(tagName)
        if (ComponentClass) {
          try {
            iframeCustomElements.define(tagName, ComponentClass)
          } catch {
            // May fail if already defined - ignore
          }
        }
      }
    }
  }
}

export interface ExecutionOptions {
  html: string
  css: string
  js: string
  context: ExampleContext
  transform: TransformFn
  onError?: (error: Error) => void
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
    exampleElement,
    styleElement,
    widgetsElement,
    onError,
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

  const fullContext = { preview, ...context }

  try {
    const code = rewriteImports(js, Object.keys(context))
    const transformedCode = transform(code, { transforms: ['typescript'] }).code

    const contextKeys = Object.keys(fullContext).map((key) =>
      key.replace(/-/g, '')
    )
    const contextValues = Object.values(fullContext)

    // @ts-expect-error AsyncFunction constructor typing
    const func = new AsyncFunction(...contextKeys, transformedCode)
    await func(...contextValues)
  } catch (e) {
    console.error(e)
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
  const { html, css, js, context, transform, exampleElement, widgetsElement, onError } =
    options

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

  // Execute JS in iframe context
  const fullContext = { preview, ...context }

  try {
    const code = rewriteImports(js, Object.keys(context))
    const transformedCode = transform(code, { transforms: ['typescript'] }).code

    // Create AsyncFunction in iframe's context
    const IframeAsyncFunction = (iframeWindow as Window & { eval: typeof eval }).eval(
      '(async () => {}).constructor'
    )

    const contextKeys = Object.keys(fullContext).map((key) =>
      key.replace(/-/g, '')
    )
    const contextValues = Object.values(fullContext)

    const func = new IframeAsyncFunction(...contextKeys, transformedCode)
    await func(...contextValues)
  } catch (e) {
    console.error(e)
    if (onError) onError(e as Error)
    else window.alert(`Error: ${e}, the console may have more information…`)
  }

  return preview
}
